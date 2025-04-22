const PDFDocument = require('pdfkit');
const { Сводная } = require('../models');
const { Op } = require('sequelize');
const path = require('path');
const fs = require('fs');
const iconv = require('iconv-lite');
const moment = require('moment');

// Функция для проверки наличия шрифта
function getFontPath(fontName) {
    const fontPath = path.join(__dirname, '../../fonts', fontName);
    if (fs.existsSync(fontPath)) {
        return fontPath;
    }
    console.warn(`Шрифт ${fontName} не найден, используем встроенный шрифт`);
    return null;
}

// Функция для конвертации текста в UTF-8
function ensureUtf8(text) {
    if (!text) return '';
    try {
        // Проверяем, является ли текст уже UTF-8
        const buffer = Buffer.from(text);
        const decoded = buffer.toString('utf8');
        if (decoded === text) {
            return text;
        }
        // Если текст не в UTF-8, пробуем конвертировать из других кодировок
        const encodings = ['win1251', 'cp866', 'koi8-r'];
        for (const encoding of encodings) {
            try {
                const converted = iconv.decode(iconv.encode(text, encoding), 'utf8');
                if (converted && converted !== '?'.repeat(converted.length)) {
                    return converted;
                }
            } catch (e) {
                console.log(`Ошибка конвертации из ${encoding}:`, e.message);
            }
        }
        return text;
    } catch (error) {
        console.error('Ошибка обработки текста:', error);
        return text;
    }
}

// Функция для форматирования чисел
function formatNumber(num) {
    if (!num) return '0';
    return new Intl.NumberFormat('ru-RU').format(num);
}

// Функция для создания таблицы с автоматическим переносом страниц
function createTable(doc, headers, rows, startX, startY, options = {}) {
    const cellPadding = 5;
    const columnWidths = options.columnWidths || headers.map(() => (doc.page.width - 100) / headers.length);
    let currentY = startY;
    
    // Рисуем заголовки
    doc.font('DejaVuSans-Bold');
    headers.forEach((header, i) => {
        doc.text(header, startX + columnWidths.slice(0, i).reduce((a, b) => a + b, 0), currentY, {
            width: columnWidths[i],
            align: 'center'
        });
    });
    
    currentY += 20;
    doc.font('DejaVuSans');

    // Рисуем строки
    rows.forEach((row) => {
        // Проверяем, нужна ли новая страница
        if (currentY > doc.page.height - 100) {
            doc.addPage();
            currentY = 50;
            
            // Повторяем заголовки на новой странице
            doc.font('DejaVuSans-Bold');
            headers.forEach((header, i) => {
                doc.text(header, startX + columnWidths.slice(0, i).reduce((a, b) => a + b, 0), currentY, {
                    width: columnWidths[i],
                    align: 'center'
                });
            });
            currentY += 20;
            doc.font('DejaVuSans');
        }

        row.forEach((cell, i) => {
            doc.text(cell, 
                startX + columnWidths.slice(0, i).reduce((a, b) => a + b, 0), 
                currentY,
                {
                    width: columnWidths[i],
                    align: 'center'
                }
            );
        });
        currentY += 20;
    });
}

const generatePdf = async (req, res) => {
    try {
        const filter = {};
        if (req.query.filter) {
            filter.where = {
                код_окэд: {
                    [Op.like]: `%${req.query.filter}%`
                }
            };
            console.log('Применен фильтр по коду ОКЭД:', req.query.filter);
        }

        console.log('Начинаем получение данных из базы...');
        const records = await Сводная.findAll(filter);
        console.log(`Найдено записей: ${records.length}`);
        
        // Логируем первые 5 записей для проверки
        console.log('Примеры полученных данных (первые 5 записей):');
        records.slice(0, 5).forEach((record, index) => {
            console.log(`\nЗапись ${index + 1}:`);
            console.log(`- Код ОКЭД: ${record.код_окэд}`);
            console.log(`- Вид деятельности: ${record.вид_деятельности}`);
            console.log(`- Количество НП: ${record.количество_нп}`);
            console.log(`- Средняя численность: ${record.средняя_численность_работников}`);
            console.log(`- ФОТ: ${record.Сумма_по_полю_ФОТт}`);
            console.log(`- Средняя ЗП: ${record.Сумма_по_полю_ср_зп}`);
        });

        console.log('\nНачинаем генерацию PDF...');
        const doc = new PDFDocument({
            size: 'A4',
            layout: 'landscape',
            margin: 50,
            lang: 'ru',
            info: {
                Title: ensureUtf8('Сводный отчет'),
                Author: ensureUtf8('Система отчетности'),
                Subject: ensureUtf8('Статистические данные'),
                Keywords: ensureUtf8('отчет, статистика, ОКЭД'),
                CreationDate: new Date()
            }
        });

        // Проверяем и регистрируем шрифты
        const regularFont = getFontPath('DejaVuSans.ttf');
        if (regularFont) {
            doc.registerFont('DejaVuSans', regularFont);
            doc.font('DejaVuSans');
        }

        // Настраиваем заголовок
        doc.fontSize(20)
           .text(ensureUtf8('Сводный отчет'), {
                align: 'center'
           });

        // Добавляем дату отчета
        doc.fontSize(12)
           .text(ensureUtf8(`Дата формирования: ${moment().format('DD.MM.YYYY HH:mm')}`), {
                align: 'right'
           });

        doc.moveDown(2);

        // Создаем таблицу
        const headers = [
            ensureUtf8('Код\nОКЭД'),
            ensureUtf8('Вид\nдеятельности'),
            ensureUtf8('Количество\nНП'),
            ensureUtf8('Средняя\nчисленность'),
            ensureUtf8('ФОТ\n(тыс. тг)'),
            ensureUtf8('Средняя ЗП\n(тыс. тг)')
        ];

        const rows = records.map(record => [
            ensureUtf8(record.код_окэд),
            ensureUtf8(record.вид_деятельности),
            formatNumber(record.количество_нп),
            formatNumber(record.средняя_численность_работников),
            formatNumber(record.Сумма_по_полю_ФОТт),
            formatNumber(record.Сумма_по_полю_ср_зп)
        ]);

        // Устанавливаем размер шрифта для таблицы
        doc.fontSize(10);

        createTable(doc, headers, rows, 50, 100, {
            columnWidths: [80, 200, 80, 100, 100, 100]
        });

        // Добавляем номера страниц
        let pageCount = doc.bufferedPageRange().count;
        for (let i = 0; i < pageCount; i++) {
            doc.switchToPage(i);
            doc.text(
                ensureUtf8(`Страница ${i + 1} из ${pageCount}`),
                50,
                doc.page.height - 50,
                { align: 'center' }
            );
        }

        // Устанавливаем заголовки для скачивания с указанием кодировки
        res.setHeader('Content-Type', 'application/pdf; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename=report.pdf');

        // Отправляем PDF
        doc.pipe(res);
        doc.end();

    } catch (error) {
        console.error('Ошибка при генерации PDF:', error);
        res.status(500).send('Ошибка при генерации PDF');
    }
};

const generateDetailPdf = async (req, res) => {
    try {
        const record = await Сводная.findByPk(req.params.id);
        if (!record) {
            return res.status(404).send('Запись не найдена');
        }

        const doc = new PDFDocument({
            size: 'A4',
            margin: 50
        });

        // Устанавливаем шрифт с поддержкой кириллицы
        doc.registerFont('DejaVuSans', path.join(__dirname, '../../fonts/DejaVuSans.ttf'));
        doc.registerFont('DejaVuSans-Bold', path.join(__dirname, '../../fonts/DejaVuSans-Bold.ttf'));
        doc.font('DejaVuSans');

        // Заголовок
        doc.fontSize(16);
        doc.text('Детальный отчет', {
            align: 'center'
        });
        doc.moveDown();

        // Информация о записи
        doc.fontSize(12);
        doc.text(`Код ОКЭД: ${record.код_окэд}`);
        doc.text(`Вид деятельности: ${record.вид_деятельности}`);
        doc.text(`Количество НП: ${formatNumber(record.количество_нп)}`);
        doc.text(`Средняя численность работников: ${formatNumber(record.средняя_численность_работников)}`);
        doc.text(`Сумма ФОТ: ${formatNumber(record.Сумма_по_полю_ФОТт)}`);
        doc.text(`Средняя заработная плата: ${formatNumber(record.Сумма_по_полю_ср_зп)}`);

        // Добавляем дату генерации
        doc.moveDown();
        doc.fontSize(10);
        doc.text(`Дата формирования: ${moment().format('DD.MM.YYYY HH:mm')}`);

        // Устанавливаем заголовки для скачивания
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=detail-report.pdf');

        // Отправляем PDF
        doc.pipe(res);
        doc.end();

    } catch (error) {
        console.error('Ошибка при генерации детального PDF:', error);
        res.status(500).send('Ошибка при генерации детального PDF');
    }
};

module.exports = {
    generatePdf,
    generateDetailPdf
}; 