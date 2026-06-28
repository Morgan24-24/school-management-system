const multer = require('multer');
const path = require('path');
const fs = require('fs');

function createStorage(subfolder) {
  const uploadPath = path.join(process.cwd(), 'uploads', subfolder);
  if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath, { recursive: true });

  return multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadPath),
    filename: (req, file, cb) => {
      const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      cb(null, `${unique}${path.extname(file.originalname)}`);
    },
  });
}

const photoFilter = (req, file, cb) => {
  const allowed = /jpeg|jpg|png|webp/;
  if (allowed.test(path.extname(file.originalname).toLowerCase()) && allowed.test(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed (jpeg, jpg, png, webp)'));
  }
};

const docFilter = (req, file, cb) => {
  const allowed = /pdf|doc|docx|xlsx|xls|jpeg|jpg|png/;
  if (allowed.test(path.extname(file.originalname).toLowerCase())) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type'));
  }
};

const uploadPhoto = multer({
  storage: createStorage('photos'),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: photoFilter,
});

const uploadDocument = multer({
  storage: createStorage('documents'),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: docFilter,
});

module.exports = { uploadPhoto, uploadDocument };
