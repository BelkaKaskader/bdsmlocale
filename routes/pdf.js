const express = require('express');
const router = express.Router();
const pdfController = require('../server/controllers/pdfController');

// Маршруты для генерации PDF
router.get('/generate', pdfController.generatePdf);
router.get('/generate/:id', pdfController.generatePdfById);
router.get('/generate/oked/:oked', pdfController.generatePdfByOked);
router.post('/generate/multiple', pdfController.generateMultipleDetailPdf);
router.get('/generate/detail/:id', pdfController.generateDetailPdf);

// Альтернативный маршрут для генерации PDF без кириллицы
router.get('/generate-simple', pdfController.generateSimplePdf);

// Маршрут для генерации PDF с таблицей на основе pdfkit-table
router.get('/generate-table', pdfController.generateTablePdf);

module.exports = router; 