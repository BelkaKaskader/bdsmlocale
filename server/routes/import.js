const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');
const importController = require('../controllers/importController');

// Настройка multer для otchety
const storageSvodnaya = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../otchety'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});
const uploadSvodnaya = multer({ storage: storageSvodnaya });

// Настройка multer для otchety_full
const storageOtchetyFull = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../otchety_full'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});
const uploadOtchetyFull = multer({ storage: storageOtchetyFull });

// Импорт в svodnaya
router.post('/svodnaya', auth, adminAuth, uploadSvodnaya.single('file'), importController.importSvodnaya);
// Импорт в otchety_full
router.post('/otchety_full', auth, adminAuth, uploadOtchetyFull.single('file'), importController.importOtchetyFull);

module.exports = router; 