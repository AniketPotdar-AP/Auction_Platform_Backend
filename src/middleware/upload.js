const multer = require('multer');
const sharp = require('sharp');
const { nanoid } = require('nanoid');
const path = require('path');

// Storage configuration
const storage = multer.memoryStorage();

// File filter
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Not an image! Please upload only images.'), false);
  }
};

// Upload middleware
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

// Image processing middleware
const processImage = async (req, res, next) => {
  if (!req.file) return next();

  try {
    const filename = `auction-${nanoid()}-${Date.now()}.webp`;

    // Process image with Sharp
    const processedImage = await sharp(req.file.buffer)
      .resize(800, 600, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .webp({ quality: 80 })
      .toBuffer();

    // Add processed image to request
    req.processedImage = {
      buffer: processedImage,
      filename,
      mimetype: 'image/webp'
    };

    next();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  upload,
  processImage
};