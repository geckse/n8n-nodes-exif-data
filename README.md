![Banner image](https://user-images.githubusercontent.com/10284570/173569848-c624317f-42b1-45a6-ab09-f0ea3c247648.png)

# Work with EXIF / IPTC / XMP Data from Image Files within n8n

This community package contains a node to work with EXIF Data from Images.


That enables you to:
* Add and embed custom keywords inside the image file
* Strip specific metadata from the image file
* Add copyright information
* Extract "Made with AI" Information
* Set "Made with AI" Information
* Extract lens information
* Modify date and time tag
* Geo-tag images using GPS coordinates
* Work with embedded Geo-tag Information
* Identify which camera was used to take the photo
* Set the image orientation parameter
* Retrieve image resolution details
* Extract and manipulate IPTC and XMP metadata

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/reference/license/) workflow automation platform.

[Supported Operations](#supported-operations)  
[Installation](#installation)  
[Compatibility](#compatibility)  
[About](#about)  
[Version History](#version-history)  

## Supported Operations

| Operation  | Description | Options |
| ------------- |  ------------- |  ------------- | 
| Read  | Read all the embedded metadata of an Image | Read Raw (without any transformation / validation) |
| Write  | Extend or override metadata of a given Image | Parse Input Fields (Transform Input to match desired Datatypes of known EXIF Fields) |
| Repair  | Could help woth corrupted files. It will re-apply all existing valid EXIF Metadata to the file. | - |
| Delete  | Removes All EXIF Metadata from the Image. With the additional field you can keep fields. | Optional: A list of field names to keep |
| Send Custom Exiftool Command | Send a custom Exiftool Command. (At this moment only read operations possible) | - |

## Installation
Follow the [installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) in the n8n community nodes documentation.

For a quickstart I've prepared an [example workflow](https://cloud.let-the-work-flow.com/workflows/exif-node.json).

This node essentially wraps **Exiftool** as node vendored variant to work with the metadata.
Possible by this great [repository](https://github.com/photostructure/exiftool-vendored.js) by photostructure. Huge Shoutout to the contributors to that repo. 
That also makes it super easy to install and work within n8n – no extra headaches by installing exiftool inside the Docker / on the Server. 

## Approach

**exiftool-vendored** launches a Child-Process with a Vendored variant of Exiftool. This extra instance consumes apeox. 70mb extra RAM. <br>
⚠️ This node writes temporary files to the n8n default storage path for custom nodes (.n8n/custom/storage/n8n-nodes-exif-data.exifData/). It was necessary to build it this way to make the file accessible for the child process. This means that for this node to work, this path needs to be writable. The node will also instantly remove the files from this temporary storage once they have been processed. Path traversal is prohibited by the node.

## Troubleshooting

If you encounter any issues, please check the following:

1. **Storage Path not writable**:
- The node writes temporary files to the n8n default storage path for custom nodes (.n8n/custom/storage/)
That may be missing on your system. Possible Solution: Create the directory manually (for example `mkdir .n8n/custom/storage/`)
Note: This could vary for your system, there is an ENV Variable to change the storage path.

## Compatibility

The Latest Version of n8n. If you encounter any problem, feel free to [open an issue](https://github.com/geckse/n8n-nodes-exif-data) on Github. 

## About

<img src="https://cloud.let-the-work-flow.com/logo-64.png" align="left" height="64" width="64"> 
<br>
Hi I'm geckse and I let your work flow! 👋 
I hope you are enjoying these nodes. If you are in need of a smooth automation, steady integration or custom code check my offering: https://let-the-work-flow.com

## Version History

### 0.1.0
- initial release
