import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionType, NodeOperationError } from 'n8n-workflow';

import { exiftool } from 'exiftool-vendored';
import * as fs from 'fs';

export class ExifData implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'ExifData',
		name: 'exifData',
		group: ['transform'],
		icon: { light: 'file:exif-node.svg', dark: 'file:exif-node.dark.svg' },
		version: 1,
		description: 'Read and Write EXIF Data from and to Image Files',
		defaults: {
			name: 'EXIF Data',
		},
		inputs: [NodeConnectionType.Main],
		outputs: [NodeConnectionType.Main],
		properties: [
			// Node properties which the user gets displayed and
			// can change on the node.
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Read',
						value: 'read',
						description: 'Read EXIF Data from an Image File',
					},
					{
						name: 'Write',
						value: 'write',
						description: 'Write EXIF Data to an Image File',
					},
					{
						name: 'Repair',
						value: 'repair',
						description: 'Repair EXIF Data of an Image File. Might help with corrupted files.',
					},
					{
						name: 'Delete',
						value: 'delete',
						description: 'Delete ALL EXIF Data from an Image File. Optionally you can provide a list of tags to keep.',
					},
					{
						name: 'Send Custom Exiftool Command',
						value: 'customCmd',
						description: 'Send a custom Exiftool Command with custom parameters',
					},
				],
				default: 'read',
			},
			{
				displayName: 'Property Name',
				name: 'dataPropertyName',
				type: 'string',
				default: 'data',
				required: true,
				description: 'Name of the binary property in which the image data can be found',
			},
			{
				displayName: 'Output Property Name',
				name: 'outputPropertyName',
				type: 'string',
				default: 'exifData',
				description: 'Name of the property in which the EXIF Data or EXIF result will be stored',
			},
			{
				displayName: 'Custom Exiftool Command',
				name: 'customCmd',
				type: 'string',
				default: '',
				placeholder: "e.g. -all",
				description: 'Send a custom Exiftool Command with custom parameters. The File will be automatically added as last parameter.',
				displayOptions: {
					show: {
						operation: ['customCmd'],
					},
				},
			},
			{
				displayName: 'List of Tags to Keep',
				name: 'keepTags',
				type: 'string',
				default: '',
				placeholder: "Keywords, Subject, Author, ICC_Profile, etc.",
				description: 'Provide a list of tags to keep. Tags will be kept as is, other tags will be deleted.',
				displayOptions: {
					show: {
						operation: ['delete'],
					},
				},
			},
			{
				displayName: "Some fields like 'Keywords' or 'Subject' can be formatted as a list. Provide them as a comma separated list (With Option: Parse Input Fields). You can also provide them as Array utilizing an Expression.",
				name: 'noticeTagFormats',
				type: 'notice',
				default: '',
				displayOptions: {
					show: {
						operation: ['write'],
					},
				},
			},
			{
				displayName: "Usually the Metadata tags are formatted in <strong>PascalCase</strong>. To write to a specific metadata group's tag, just prefix the tag name with the group. (e.g. <code>IPTC:CopyrightNotice</code>)<br><br>A list of all possible tags can be found <a href='https://exiftool.org/TagNames/EXIF.html' target='_blank'>here</a>.",
				name: 'noticeKeywords',
				type: 'notice',
				default: '',
				displayOptions: {
					show: {
						operation: ['write'],
					},
				},
			},
			{
				displayName: "This will delete all EXIF Data from the file. If you want to retain some tags, you can provide a list of tags to keep. Some Tags may be wise to keep, like <code>ICC_Profile</code>.",
				name: 'noticeDelete',
				type: 'notice',
				default: '',
				displayOptions: {
					show: {
						operation: ['delete'],
					},
				},
			},
			{
				displayName: "<strong>Tip!</strong> You can also delete specific tags with the <strong>Write</strong> Operation when writing an empty (null) value to the desired tag.",
				name: 'noticeDeleteWithWrite',
				type: 'notice',
				default: '',
				displayOptions: {
					show: {
						operation: ['delete', 'write'],
					},
				},
			},
			{
				displayName: 'EXIF-Metadata',
				name: 'exifMetadata',
				placeholder: 'Add Metadata',
				type: 'fixedCollection',
				default: '',
				typeOptions: {
					multipleValues: true,
				},
				description: '',
				options: [
					{
						name: 'metadataValues',
						displayName: 'Metadata',
						values: [
							{
								displayName: 'Name',
								name: 'name',
								type: 'string',
								default: '',
								description: 'Name of the metadata key to add.',
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
								description: 'Value to set for the metadata key.',
							},
						],
					},
				],
				displayOptions: {
					show: {
						operation: ['write'],
					},
				},
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add option',
				default: {},
				options: [
					{
						displayName: 'Read Raw',
						name: 'readRaw',
						type: 'boolean',
						default: false,
						description: 'Return the EXIF Data raw, untransformed and unstandardized.',
					},
					{
						displayName: 'Parse Input Fields',
						name: 'parseInputFields',
						type: 'boolean',
						default: true,
						description: 'Input fields will be parsed to match desired EXIF tags. (e.g.: "Keywords" and "Subject" will parse comma separated values)',
					}
				],
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();

		// check if n8n custom storage path is set
		// TODO: WHY is this not already done by n8n?
		const storagePath = this.helpers.getStoragePath();
		if (!fs.existsSync(storagePath)) {
			// attempt to create the storage path
			try {
				fs.mkdirSync(storagePath, { recursive: true });
				console.log('EXIF NODE: Created storage path (' + storagePath + ')');
			} catch (error) {
				throw new NodeOperationError(this.getNode(), 'Failed to locate n8n storage path (' + storagePath + '). You might need to create this directory manually. Please check the node repository for more information and how to troubleshoot this issue.', {
					itemIndex: 0,
				});
			}
		}

		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			try {
				const operation = this.getNodeParameter('operation', itemIndex);
				const options = this.getNodeParameter('options', itemIndex);
				const binaryPropertyName = this.getNodeParameter('dataPropertyName', itemIndex) as string;
				const binaryData = this.helpers.assertBinaryData(itemIndex, binaryPropertyName);
				const extension = binaryData.fileExtension;

				// do we actually have a file?
				if (!binaryData.data) {
					throw new NodeOperationError(this.getNode(), 'No file data provided', {
						itemIndex,
					});
				}

				// we do only images here
				if (!extension || extension != 'jpg' && extension != 'png' && extension != 'heic' && extension != 'heif' && extension != 'tiff' && extension != 'gif' && extension != 'bmp' && extension != 'webp' && extension != 'jpeg') {
					throw new NodeOperationError(this.getNode(), 'File extension ' + extension + ' is not supported', {
						itemIndex,
					});
				}

				const outputPropertyName = this.getNodeParameter('outputPropertyName', itemIndex) as string;

				// TODO: exiftool is ran in child process, and it onl communicates with files on fs. Not Ideal.
				var cleanedBinaryPropertyName = binaryPropertyName.replace(/[^a-zA-Z0-9]/g, '');
				var temporaryFilePath = this.helpers.getStoragePath() + '/' + cleanedBinaryPropertyName + '.' + extension;

				// clean exiftool tmp file, if it exists
				if (fs.existsSync(temporaryFilePath + '_exiftool_tmp')) {
					fs.unlinkSync(temporaryFilePath + '_exiftool_tmp');
				}

				// Write Temporary File
				// Another Todo: Use n8n's function writeContentToFile. But it filtered out the storage path.
				fs.writeFileSync(temporaryFilePath, Buffer.from(binaryData.data, 'base64'), {
					flag: 'w'
				});
				if (!fs.readFileSync(temporaryFilePath)) {
					throw new NodeOperationError(this.getNode(), 'Failed to write binary data to temporary file', {
						itemIndex,
					});
				}

				// Get EXIF Data
				if (operation === 'read') {

					// start child process with exiftool, pass the temporary file 
					if (!options.readRaw) {
						const exifData = await exiftool.readRaw(temporaryFilePath);
						items[itemIndex].json[outputPropertyName] = exifData;
					} else {
						const exifData = await exiftool.read(temporaryFilePath, {});
						items[itemIndex].json[outputPropertyName] = exifData;
					}

				}

				// Write EXIF Data to File
				if (operation === 'write') {
					const exifMetadata = this.getNodeParameter('exifMetadata', itemIndex) as any;

					if (fs.existsSync(temporaryFilePath + '_exiftool_tmp')) {
						console.log('EXIF NODE: Temporary file already exists. Please wait for the previous operation to finish.');
					}

					if (!exifMetadata.metadataValues.length) {
						throw new NodeOperationError(this.getNode(), 'No metadata values provided. Please provide at least one metadata value.', {
							itemIndex,
						});
					}

					// map the input fields to the desired EXIF tags
					const tags = exifMetadata.metadataValues.map((tag: any) => {

						// Some convinient parsing for input fields, if enabled
						if (options.parseInputFields) {
							let splittedTag = tag.name.split(':');
							if (splittedTag.indexOf('Keywords') != -1) {
								tag.value = tag.value.split(',');
							} else if (splittedTag.indexOf('Subject') != -1) {
								tag.value = tag.value.split(',');
							}
						}

						return {
							[tag.name]: tag.value
						};
					});

					// write each field separately, to get the result of each write operation
					const exifResults = await Promise.all(
						tags.map(async (tag: any) => {
							const result = await exiftool.write(temporaryFilePath, tag);
							// small delay to ensure the file is written
							await new Promise(resolve => setTimeout(resolve, 500));
							return {
								...result,
								tag: Object.keys(tag)[0]
							};
						})
					);
					items[itemIndex].json[outputPropertyName] = exifResults;


				}

				// Delete EXIF Data from File (All or retain some tags)
				if (operation === 'delete') {
					const keepTags = this.getNodeParameter('keepTags', itemIndex) as string;
					const keepTagsArray = (keepTags.length) ? keepTags.split(',').map((tag: string) => tag.trim()) : [];
					const exifDataResult = await exiftool.deleteAllTags(temporaryFilePath, (keepTagsArray.length) ? {
						retain: keepTagsArray
					} : undefined);
					items[itemIndex].json[outputPropertyName] = exifDataResult;
				}

				// Repair EXIF Data from File by rewriting the tags 
				if (operation === 'repair') {
					await exiftool.rewriteAllTags(temporaryFilePath, temporaryFilePath + '_processed');
					items[itemIndex].json[outputPropertyName] = { success: true };
				}

				// Send Custom Exiftool Command
				if (operation === 'customCmd') {
					const customCmd = this.getNodeParameter('customCmd', itemIndex) as string;
					const isWriteCmd = customCmd.includes('=');
					const commandArray = customCmd.split(' ');
					let exifResult = {};
					if (!isWriteCmd) {
						exifResult = await exiftool.readRaw(temporaryFilePath, commandArray);
					} else {
						throw new NodeOperationError(this.getNode(), 'Write Custom Commands are not supported yet. Please use the Write Operation instead.', {
							itemIndex,
						});
					}
					if (exifResult) {
						items[itemIndex].json[outputPropertyName] = exifResult;
					} else {
						items[itemIndex].json[outputPropertyName] = {};
					}
				}

				// turn the processed file into a binary again, override the original binary data
				var processedFilePath = temporaryFilePath;
				if (fs.existsSync(temporaryFilePath + '_processed')) {
					processedFilePath = temporaryFilePath + '_processed';
				}
				const fileData = fs.readFileSync(processedFilePath);
				const binaryDataModified = await this.helpers.prepareBinaryData(fileData, temporaryFilePath);

				// @ts-ignore
				items[itemIndex].binary[binaryPropertyName] = binaryDataModified;

				// delete temporary file
				if (fs.existsSync(temporaryFilePath)) {
					fs.unlinkSync(temporaryFilePath);
				}

				// delete processed file, if it exists (only repair operation)
				if (fs.existsSync(processedFilePath)) {
					fs.unlinkSync(processedFilePath);
				}

				// also the _original file, which will be created during write operations
				if (fs.existsSync(temporaryFilePath + '_original')) {
					fs.unlinkSync(temporaryFilePath + '_original');
				}

			} catch (error) {

				// make sure to clean up the temporary files
				try {
					const binaryPropertyName = this.getNodeParameter('dataPropertyName', itemIndex) as string;
					var cleanedBinaryPropertyName = binaryPropertyName.replace(/[^a-zA-Z0-9]/g, '');
					const binaryData = this.helpers.assertBinaryData(itemIndex, binaryPropertyName);
					if (binaryData.data) {
						const extension = binaryData.fileExtension;
						var temporaryFilePath = this.helpers.getStoragePath() + '/' + cleanedBinaryPropertyName + '.' + extension;
						var processedFilePath = temporaryFilePath;
						if (fs.existsSync(temporaryFilePath + '_processed')) {
							processedFilePath = temporaryFilePath + '_processed';
						}
						// delete temporary file
						if (fs.existsSync(temporaryFilePath)) {
							fs.unlinkSync(temporaryFilePath);
						}

						// delete processed file, if it exists (only repair operation)
						if (fs.existsSync(processedFilePath)) {
							fs.unlinkSync(processedFilePath);
						}

						// also the _original file, which will be created during write operations
						if (fs.existsSync(temporaryFilePath + '_original')) {
							fs.unlinkSync(temporaryFilePath + '_original');
						}
					}
				} catch (error) {
					console.error('EXIF NODE: Failed to clean up temporary files', error);
				}

				// This node should never fail but we want to showcase how
				// to handle errors.
				if (this.continueOnFail()) {
					items.push({ json: this.getInputData(itemIndex)[0].json, error, pairedItem: itemIndex });
				} else {
					// Adding `itemIndex` allows other workflows to handle this error
					if (error.context) {
						// If the error thrown already contains the context property,
						// only append the itemIndex
						error.context.itemIndex = itemIndex;
						throw error;
					}
					throw new NodeOperationError(this.getNode(), error, {
						itemIndex,
					});
				}
			}
		}

		return [items];
	}
}
