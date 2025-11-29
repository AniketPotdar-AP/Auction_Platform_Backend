const dotenv = require('dotenv')
dotenv.config()
const ImageKit = require('imagekit');

// Configure ImageKit - only if environment variables are set
let imagekit = null;
if (process.env.IMAGEKIT_PUBLIC_KEY &&
  process.env.IMAGEKIT_PRIVATE_KEY &&
  process.env.IMAGEKIT_URL_ENDPOINT) {
  imagekit = new ImageKit({
    publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
    privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
    urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT,
  });
}

// Upload file to ImageKit (accepts buffer or file path)
const uploadToImageKit = (fileInput, folder = 'auctions', options = {}) => {
  return new Promise((resolve, reject) => {
    if (!imagekit) {
      reject(new Error('ImageKit not configured. Please set IMAGEKIT_PUBLIC_KEY, IMAGEKIT_PRIVATE_KEY, and IMAGEKIT_URL_ENDPOINT environment variables.'));
      return;
    }

    let fileData;
    let fileName = `auction-${Date.now()}.webp`;

    if (Buffer.isBuffer(fileInput)) {
      // Convert buffer to base64
      fileData = fileInput.toString('base64');
    } else if (typeof fileInput === 'string') {
      // Assume it's a file path
      const fs = require('fs');
      fileData = fs.readFileSync(fileInput).toString('base64');
      fileName = `file-${Date.now()}.webp`;
    } else {
      reject(new Error('Invalid file input'));
      return;
    }

    // ImageKit upload options - only include defined fields
    const uploadOptions = {
      file: fileData,
      fileName,
      folder,
      useUniqueFileName: true,
    };

    // Only add optional fields if they're actually provided
    if (options.tags && options.tags.length > 0) {
      uploadOptions.tags = options.tags;
    }

    if (options.customCoordinates) {
      uploadOptions.customCoordinates = options.customCoordinates;
    }

    if (options.responseFields) {
      uploadOptions.responseFields = options.responseFields;
    }

    imagekit.upload(uploadOptions, (error, result) => {
      if (error) {
        reject(error);
      } else {
        // If you need transformations, apply them to the URL
        let transformedUrl = result.url;

        if (options.width || options.height) {
          // Generate transformed URL
          transformedUrl = imagekit.url({
            path: result.filePath,
            transformation: [{
              width: options.width || 800,
              height: options.height || 600,
              crop: options.crop || 'at_max',
              quality: options.quality || 80,
              format: options.format || 'webp'
            }]
          });
        }

        resolve({
          secure_url: transformedUrl,
          original_url: result.url,
          public_id: result.fileId,
          filePath: result.filePath
        });
      }
    });
  });
};

// Delete image from ImageKit
const deleteFromImageKit = (fileId) => {
  return new Promise((resolve, reject) => {
    if (!imagekit) {
      reject(new Error('ImageKit not configured. Please set IMAGEKIT_PUBLIC_KEY, IMAGEKIT_PRIVATE_KEY, and IMAGEKIT_URL_ENDPOINT environment variables.'));
      return;
    }

    imagekit.deleteFile(fileId, (error, result) => {
      if (error) {
        reject(error);
      } else {
        resolve(result);
      }
    });
  });
};

module.exports = {
  uploadToImageKit,
  deleteFromImageKit
};