const PDFDocument = require('pdfkit');
const PDFTable = require('pdfkit-table');
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const iconv = require('iconv-lite');

// Настройка логирования
const log = (message, data = null) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`);
  if (data) {
    console.log('Данные:', JSON.stringify(data, null, 2));
  }
};

// Подключение к базе данных с явным указанием кодировки
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'bdbdsm',
  password: 'admin',
  port: 5432,
  client_encoding: 'UTF8'
});

log('Инициализация контроллера PDF');

// Путь к шрифтам с абсолютными путями
const FONTS = {
  regular: path.resolve(__dirname, '../fonts/DejaVuSans.ttf'),
  bold: path.resolve(__dirname, '../fonts/DejaVuSans-Bold.ttf'),
  arial: path.resolve(__dirname, '../fonts/arial.ttf'),
  ptsans: path.resolve(__dirname, '../fonts/PTSans-Regular.ttf'),
  ptsansBold: path.resolve(__dirname, '../fonts/PTSans-Bold.ttf')
};

// Глобальная функция форматирования чисел
const formatNumber = (num) => {
  if (num === null || num === undefined) return '';
  if (typeof num === 'string') num = parseFloat(num);
  if (isNaN(num)) return '';
  return num.toLocaleString('ru-RU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

// Проверяем наличие шрифтов физически
try {
  Object.entries(FONTS).forEach(([key, path]) => {
    const exists = fs.existsSync(path);
    log(`Проверка шрифта ${key}`, { exists, path });
    if (!exists) {
      log(`ВНИМАНИЕ: Шрифт ${key} не найден по пути ${path}`);
    }
  });
} catch (err) {
  log('Ошибка при проверке наличия шрифтов', { error: err.message });
}

/**
 * Более эффективная функция преобразования текста в правильную кодировку
 * @param {string} text - Текст для преобразования
 * @returns {string} - Преобразованный текст
 */
const convertEncoding = (text) => {
  if (!text || typeof text !== 'string') return '';
  
  log('Исходный текст для конвертации', { text });
  
  try {
    // Удаляем непечатаемые символы и нормализуем текст
    const normalizedText = text
      .replace(/[\x00-\x1F\x7F-\x9F]/g, '')
      .normalize('NFC')
      .trim();
    
    log('Текст после нормализации', { normalizedText });
    return normalizedText;
  } catch (error) {
    log('Ошибка при конвертации текста', { error: error.message, text });
    return text; // возвращаем исходный текст в случае ошибки
  }
};

/**
 * Создает PDF документ с правильными настройками и шрифтами
 * @returns {PDFDocument} - Настроенный PDF документ
 */
const createPdfDocument = (title) => {
  log('Создание PDF документа', { title });
  
  try {
    const doc = new PDFDocument({
      size: 'A4',
      margin: 50,
      lang: 'ru',
      info: {
        Title: convertEncoding(title) || 'Отчет',
        Author: 'BDSM API',
        Subject: 'Статистические данные',
        Producer: 'PDFKit',
        Creator: 'BDSM API PDF Generator'
      },
      autoFirstPage: true,
      bufferPages: true,
      compress: true
    });

    // Регистрируем все доступные шрифты
    doc.registerFont('DejaVuRegular', FONTS.regular);
    doc.registerFont('DejaVuBold', FONTS.bold);
    doc.registerFont('Arial', FONTS.arial);
    doc.registerFont('PTSans', FONTS.ptsans);
    doc.registerFont('PTSansBold', FONTS.ptsansBold);
    
    // Устанавливаем шрифт по умолчанию
    doc.font('PTSans');
    
    return doc;
  } catch (error) {
    log('Ошибка при создании PDF документа', { error: error.message });
    throw error;
  }
};

/**
 * Создает PDF документ с использованием стандартных шрифтов PDFKit
 * для случаев, когда возникают проблемы с кириллицей
 * @returns {PDFDocument} - Настроенный PDF документ
 */
const createSimplePdfDocument = (title) => {
  log('Создание упрощенного PDF документа с встроенными шрифтами', { title });
  
  const doc = new PDFDocument({
    size: 'A4',
    margin: 50,
    info: {
      Title: title || 'Отчет',
      Author: 'BDSM API',
      Subject: 'Статистические данные',
    },
    autoFirstPage: true,
    bufferPages: true
  });
  
  log('Используем встроенный шрифт Helvetica');
  // Используем встроенный шрифт без дополнительной регистрации
    doc.font('Helvetica');
  
  return doc;
};

/**
 * Создает PDF документ с поддержкой таблиц
 * @param {string} title - Заголовок документа
 * @returns {PDFDocument} - Настроенный PDF документ
 */
const createTablePdfDocument = (title) => {
  log('Создание PDF документа с поддержкой таблиц', { title });
  
  // Используем PDFTable вместо PDFDocument
  const doc = new PDFTable({
    size: 'A4',
    margin: 50,
    info: {
      Title: title || 'Отчет',
      Author: 'BDSM API',
      Subject: 'Статистические данные',
    },
    autoFirstPage: true,
    bufferPages: true
  });
  
  return doc;
};

/**
 * Генерирует PDF файл из данных таблицы Сводная с использованием pdfkit-table
 * @param {Object} req - HTTP запрос
 * @param {Object} res - HTTP ответ
 */
exports.generateTablePdf = async (req, res) => {
  try {
    log('Начало генерации PDF отчета с таблицей');
    log('Запрос от клиента:', {
      method: req.method,
      url: req.url,
      headers: req.headers,
      query: req.query
    });
    
    // Получаем данные из базы данных
    const query = req.query.filter 
      ? `SELECT * FROM "Сводная" WHERE код_окэд ILIKE $1 OR вид_деятельности ILIKE $1 ORDER BY код_окэд`
      : 'SELECT * FROM "Сводная" ORDER BY код_окэд';
    
    const queryParams = req.query.filter ? [`%${req.query.filter}%`] : [];
    log('SQL запрос', { query, params: queryParams });
    
    let result;
    try {
      result = await pool.query(query, queryParams);
      log(`Получено записей из БД: ${result.rows.length}`);
    
      if (result.rows.length > 0) {
        log('Пример первой записи', {
          код_окэд: result.rows[0].код_окэд,
          вид_деятельности: result.rows[0].вид_деятельности.substring(0, 30) + '...'
        });
      }
    } catch (dbError) {
      log('Ошибка при запросе к БД', { error: dbError.message, stack: dbError.stack });
      throw new Error(`Ошибка при запросе к базе данных: ${dbError.message}`);
    }
    
    // Создаем PDF документ
    let doc;
    try {
      doc = createTablePdfDocument('Отчет по данным "Сводная"');

    // Настраиваем заголовки для скачивания
      log('Настройка заголовков ответа');
    res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=table-report-${Date.now()}.pdf`);

    // Направляем PDF прямо в response
    doc.pipe(res);

    // Настраиваем шрифты и стили
    const titleSize = 16;
    const textSize = 10;
    
    // Добавляем заголовок
    doc.fontSize(titleSize).text('Отчет по данным "Сводная"', {
      align: 'center',
      underline: true
    });
    doc.moveDown();

    // Добавляем дату создания
    const now = new Date();
    doc.fontSize(textSize).text(`Дата создания: ${now.toLocaleDateString()} ${now.toLocaleTimeString()}`, {
      align: 'right'
    });
    doc.moveDown();

    // Добавляем примененные фильтры
    if (req.query.filter) {
      doc.fontSize(textSize).text(`Применен фильтр: "${req.query.filter}"`, {
        align: 'left',
        italics: true
      });
      doc.moveDown();
    }

    // Проверяем, есть ли данные
    if (result.rows.length === 0) {
      doc.fontSize(textSize).text('Нет данных для отображения.', {
        align: 'center'
      });
    } else {
      // Добавляем информацию о количестве записей
      doc.fontSize(textSize).text(`Всего записей: ${result.rows.length}`, {
        align: 'left'
      });
      doc.moveDown();

      // Форматирование чисел с разделителями
      const formatNumber = (num) => {
        return new Intl.NumberFormat('ru-RU').format(num);
      };

        // Подготавливаем данные для таблицы
        const tableData = result.rows.map(row => ({
          'Код ОКЭД': row.код_окэд,
          'Вид деятельности': row.вид_деятельности.length > 40 
            ? row.вид_деятельности.substring(0, 40) + '...' 
            : row.вид_деятельности,
          'Кол-во': formatNumber(row.количество_нп),
          'Числ.': formatNumber(row.средняя_численность_работников),
          'ФОТ': formatNumber(Math.round(row.Сумма_по_полю_ФОТт)),
          'Ср. ЗП': formatNumber(Math.round(row.Сумма_по_полю_ср_зп))
        }));
        
        // Настройки таблицы
        const tableOptions = {
          prepareHeader: () => doc.font('Helvetica-Bold').fontSize(10),
          prepareRow: (row, indexColumn, indexRow, rectRow) => {
            doc.font('Helvetica').fontSize(9);
            return doc;
          },
          columnsSize: [60, 180, 50, 50, 65, 65],
        };
        
        log('Создание таблицы с данными');
        // Создаем таблицу (ограничиваем до 100 записей для производительности)
        await doc.table(
          {
            headers: ['Код ОКЭД', 'Вид деятельности', 'Кол-во', 'Числ.', 'ФОТ', 'Ср. ЗП'],
            rows: tableData.slice(0, 100).map(rowObj => 
              [rowObj['Код ОКЭД'], rowObj['Вид деятельности'], rowObj['Кол-во'], 
               rowObj['Числ.'], rowObj['ФОТ'], rowObj['Ср. ЗП']]
            )
          }, 
          tableOptions
        );
        
        // Если записей больше 100, добавляем сообщение
        if (result.rows.length > 100) {
          doc.moveDown();
          doc.text('Примечание: В отчете показано только первые 100 записей для оптимизации размера документа.', {
            align: 'center',
            italic: true
          });
        }
    }

    // Добавляем номера страниц
      log('Добавление номеров страниц');
    const totalPages = doc.bufferedPageRange().count;
    for (let i = 0; i < totalPages; i++) {
      doc.switchToPage(i);
      doc.fontSize(8).text(
        `Страница ${i + 1} из ${totalPages}`,
        50,
        doc.page.height - 50,
        { align: 'center' }
      );
    }

    // Завершаем документ
      log('Завершение генерации PDF');
    doc.end();
    } catch (pdfError) {
      log('Ошибка при создании/рендеринге PDF', { 
        error: pdfError.message, 
        stack: pdfError.stack 
      });
      throw new Error(`Ошибка при создании PDF: ${pdfError.message}`);
    }
  } catch (error) {
    // Используем обработчик ошибок
    return handlePdfError(res, error, req.headers.accept);
  }
};

/**
 * Генерирует PDF файл из данных таблицы Сводная
 * @param {Object} req - HTTP запрос
 * @param {Object} res - HTTP ответ
 */
exports.generatePdf = async (req, res) => {
  try {
    log('Начало генерации PDF отчета');
    
    // Получаем данные из базы данных
    const query = req.query.filter 
      ? `SELECT * FROM "Сводная" WHERE код_окэд ILIKE $1 OR вид_деятельности ILIKE $1 ORDER BY код_окэд`
      : 'SELECT * FROM "Сводная" ORDER BY код_окэд';
    
    const queryParams = req.query.filter ? [`%${req.query.filter}%`] : [];
    log('SQL запрос', { query, params: queryParams });
    
    let result;
    try {
      result = await pool.query(query, queryParams);
      log(`Получено записей из БД: ${result.rows.length}`);
    } catch (dbError) {
      log('Ошибка при запросе к БД', { error: dbError.message });
      throw new Error(`Ошибка при запросе к базе данных: ${dbError.message}`);
    }
    
    // Создаем PDF документ
    const doc = createPdfDocument('Отчет по данным "Сводная"');

    // Настраиваем заголовки для скачивания
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=report-${Date.now()}.pdf`);

    // Буферизируем весь PDF перед отправкой
    const chunks = [];
    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => {
      const result = Buffer.concat(chunks);
      res.end(result);
    });

    // Добавляем заголовок жирным шрифтом
    doc.font('DejaVuBold').fontSize(16).text('Отчет по данным "Сводная"', {
      align: 'center',
      underline: true
    });
    doc.moveDown();

    // Возвращаемся к обычному шрифту
    doc.font('DejaVuRegular');

    // Добавляем дату создания
    const now = new Date();
    doc.fontSize(10).text(`Дата создания: ${now.toLocaleDateString()} ${now.toLocaleTimeString()}`, {
      align: 'right'
    });
    doc.moveDown();

    if (result.rows.length === 0) {
      doc.fontSize(10).text('Нет данных для отображения.', {
        align: 'center'
      });
    } else {
      // Добавляем информацию о количестве записей
      doc.fontSize(10).text(`Всего записей: ${result.rows.length}`, {
        align: 'left'
      });
      doc.moveDown();

      // Создаем таблицу
      const startY = doc.y;
      const rowHeight = 20;
      const colWidths = [60, 200, 50, 50, 65, 65];
      
      // Заголовки таблицы жирным шрифтом
      doc.font('DejaVuBold');
      let currentX = 50;
      ['Код ОКЭД', 'Вид деятельности', 'Кол-во', 'Числ.', 'ФОТ', 'Ср. ЗП'].forEach((header, i) => {
        doc.text(header, currentX, startY, { width: colWidths[i], align: 'left' });
        currentX += colWidths[i];
      });

      // Возвращаемся к обычному шрифту для данных
      doc.font('DejaVuRegular');

      // Данные таблицы (ограничиваем до 100 записей)
      let currentY = startY + rowHeight;
      result.rows.slice(0, 100).forEach(row => {
        if (currentY > doc.page.height - 50) {
          doc.addPage();
          currentY = 50;
        }

        currentX = 50;
        [
          row.код_окэд || '',
          (row.вид_деятельности || '').substring(0, 40),
          row.количество_нп || '0',
          row.средняя_численность_работников || '0',
          Math.round(row.Сумма_по_полю_ФОТт || 0).toLocaleString('ru-RU'),
          Math.round(row.Сумма_по_полю_ср_зп || 0).toLocaleString('ru-RU')
        ].forEach((cell, i) => {
          doc.text(cell, currentX, currentY, { width: colWidths[i], align: 'left' });
          currentX += colWidths[i];
        });
        currentY += rowHeight;
      });

      // Если записей больше 100, добавляем примечание
      if (result.rows.length > 100) {
        doc.moveDown();
        doc.fontSize(9).text('Примечание: Показаны только первые 100 записей', {
          align: 'center',
          italic: true
        });
      }
    }

    // Завершаем документ
    doc.end();
  } catch (error) {
    log('Ошибка при генерации PDF', { 
      error: error.message,
      stack: error.stack
    });
    res.status(500).json({ 
      message: 'Ошибка при генерации PDF',
      error: error.message
    });
  }
};

/**
 * Генерирует PDF с детальной информацией по одной записи
 * @param {Object} req - HTTP запрос с параметром id
 * @param {Object} res - HTTP ответ
 */
exports.generateDetailPdf = async (req, res) => {
  try {
    log('Начало генерации детального PDF отчета');
    const { id } = req.params;
    log('ID записи:', { id });
    
    // Получаем данные конкретной записи
    log('Выполняем запрос к базе данных');
    const result = await pool.query('SELECT * FROM "Сводная" WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      log('Запись не найдена');
      return res.status(404).json({ message: 'Запись не найдена' });
    }
    
    log('Запись найдена, начинаем генерацию PDF');
    const data = result.rows[0];
    log('Данные записи', {
      код_окэд: data.код_окэд,
      вид_деятельности: data.вид_деятельности
    });
    
    // Создаем PDF документ с поддержкой кириллицы
    const doc = createPdfDocument(`Детальный отчет: ${convertEncoding(data.вид_деятельности)}`);

    // Настраиваем заголовки для скачивания
    log('Настройка заголовков ответа');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=detail-report-${data.код_окэd.replace(/[\/\\]/g, '-')}-${Date.now()}.pdf`);

    // Направляем PDF прямо в response
    doc.pipe(res);
    
    // Оформление заголовка
    log('Добавление заголовка отчета');
    doc.font('DejaVuBold').fontSize(16).text(convertEncoding(`Детальная информация: ${data.вид_деятельности}`), {
      align: 'center',
      underline: true
    });
    doc.moveDown();
    
    // Дата создания
    const now = new Date();
    log('Добавление даты создания');
    doc.font('DejaVuRegular').fontSize(10).text(`Дата создания: ${now.toLocaleDateString()} ${now.toLocaleTimeString()}`, {
      align: 'right'
    });
    doc.moveDown(2);
    
    // Информация о записи в виде таблицы
    const labelWidth = 200;
    const valueWidth = 300;
    const startX = 70;
    let y = doc.y;
    
    // Функция для добавления строки таблицы
    const addTableRow = (label, value, format = null) => {
      doc.fontSize(11).text(convertEncoding(label), startX, y, { width: labelWidth, continued: false });
      const displayValue = format ? format(value) : convertEncoding(value);
      doc.text(displayValue, startX + labelWidth, y, { width: valueWidth });
      y += 20;
    };
    
    log('Добавление данных в таблицу');
    // Добавляем данные
    addTableRow('Код ОКЭД:', data.код_окэd);
    addTableRow('Вид деятельности:', data.вид_деятельности);
    addTableRow('Количество НП:', data.количество_нп, formatNumber);
    addTableRow('Средняя численность работников:', data.средняя_численность_работников, formatNumber);
    addTableRow('Сумма по полю ФОТ:', data.Сумма_по_полю_ФОТт, (val) => formatNumber(Math.round(val)) + ' тг.');
    addTableRow('Средняя зарплата:', data.Сумма_по_полю_ср_зп, (val) => formatNumber(Math.round(val)) + ' тг.');
    addTableRow('Сумма налогов:', data.сумма_налогов, (val) => formatNumber(Math.round(val)) + ' тг.');
    addTableRow('Удельный вес:', data.удельный_вес, (val) => val + '%');
    addTableRow('Дата создания записи:', new Date(data.createdAt).toLocaleString());
    addTableRow('Дата обновления записи:', new Date(data.updatedAt).toLocaleString());
    
    // Добавляем разделительную линию
    doc.moveTo(50, y).lineTo(550, y).stroke();
    y += 20;
    
    // Добавляем примечание
    log('Добавление примечания');
    doc.fontSize(10).text(convertEncoding('Примечание: Вся информация предоставлена из базы данных BDSM. Все данные актуальны на момент создания отчета.'), 50, y, {
      align: 'left',
      width: 500
    });
    
    // Добавляем номер страницы
    log('Добавление номера страницы');
    doc.fontSize(8).text(
      convertEncoding('Страница 1 из 1'),
      50,
      doc.page.height - 50,
      { align: 'center' }
    );
    
    // Завершаем документ
    log('Завершение генерации PDF');
    doc.end();
  } catch (error) {
    log('Ошибка при генерации детального PDF', { 
      error: error.message,
      stack: error.stack 
    });
    console.error('Ошибка при генерации детального PDF:', error);
    console.error('Стек вызовов:', error.stack);
    res.status(500).json({ 
      message: 'Ошибка при генерации PDF', 
      error: error.message,
      stack: error.stack
    });
  }
};

/**
 * Генерирует PDF с информацией по нескольким выбранным записям
 * @param {Object} req - HTTP запрос с массивом идентификаторов в req.body.ids
 * @param {Object} res - HTTP ответ
 */
exports.generateMultipleDetailPdf = async (req, res) => {
  try {
    log('Начало генерации PDF для нескольких записей');
    const { ids } = req.body;
    log('Полученные ID', { ids });
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      log('Ошибка: массив ID не предоставлен или пуст');
      return res.status(400).json({ message: 'Необходимо предоставить массив идентификаторов записей' });
    }
    
    // Получаем данные выбранных записей
    log('Выполняем запрос к базе данных');
    const result = await pool.query('SELECT * FROM "Сводная" WHERE id = ANY($1) ORDER BY код_окэд', [ids]);
    
    if (result.rows.length === 0) {
      log('Записи не найдены');
      return res.status(404).json({ message: 'Записи не найдены' });
    }
    
    log(`Найдено ${result.rows.length} записей, начинаем генерацию PDF`);
    
    // Создаем PDF документ с поддержкой кириллицы
    const doc = createPdfDocument(`Отчет по выбранным записям (${result.rows.length})`);

    // Настраиваем заголовки для скачивания
    log('Настройка заголовков ответа');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=multi-report-${Date.now()}.pdf`);

    // Направляем PDF прямо в response
    doc.pipe(res);
    
    // Оформление заголовка
    log('Добавление заголовка отчета');
    doc.font('DejaVuBold').fontSize(16).text(convertEncoding(`Отчет по выбранным записям (${result.rows.length})`), {
      align: 'center',
      underline: true
    });
    doc.moveDown();
    
    // Дата создания
    const now = new Date();
    log('Добавление даты создания');
    doc.font('DejaVuRegular').fontSize(10).text(`Дата создания: ${now.toLocaleDateString()} ${now.toLocaleTimeString()}`, {
      align: 'right'
    });
    doc.moveDown(2);
    
    // Форматирование чисел с разделителями
    const formatNumber = (num) => {
      return new Intl.NumberFormat('ru-RU').format(num);
    };
    
    // Определяем ширину столбцов таблицы
    const tableWidth = 500;
    const colWidths = {
      код_окэд: 70,
      вид_деятельности: 180,
      количество_нп: 60,
      средняя_численность_работников: 60,
      Сумма_по_полю_ФОТт: 65,
      Сумма_по_полю_ср_зп: 65
    };

    let y = doc.y;

    // Рисуем заголовки таблицы
    log('Добавление заголовков таблицы');
    doc.font('DejaVuBold').fontSize(12);
    ['Код ОКЭД', 'Вид деятельности', 'Кол-во', 'Числ.', 'ФОТ', 'Ср. ЗП'].forEach((header, index) => {
      log(`Добавление заголовка: ${header}`);
      const convertedHeader = convertEncoding(header);
      const x = 50 + Object.values(colWidths).slice(0, index).reduce((sum, width) => sum + width, 0);
      doc.text(convertedHeader, x, y, { width: Object.values(colWidths)[index] });
    });

    y += 20;
    doc.moveTo(50, y).lineTo(50 + tableWidth, y).stroke();
    y += 5;

    // Рисуем данные таблицы
    log('Начало добавления данных в таблицу');
    let rowIndex = 0;
    for (const row of result.rows) {
      log(`Обработка строки ${rowIndex + 1}`, { 
        код_окэд: row.код_окэд,
        вид_деятельности: row.вид_деятельности.substring(0, 30) + '...' 
      });
      
      // Ограничиваем количество строк на страницу
      if (y > doc.page.height - 100) {
        log('Добавление новой страницы');
        doc.addPage();
        y = 50;
      }

      doc.font('DejaVuRegular').fontSize(10);
      
      // Конвертируем и добавляем код ОКЭД
      const convertedOked = convertEncoding(row.код_окэд);
      doc.text(convertedOked, 50, y, { width: colWidths.код_окэд });
      
      // Конвертируем и добавляем вид деятельности
      let деятельность = convertEncoding(row.вид_деятельности);
      if (деятельность.length > 45) {
        деятельность = деятельность.substring(0, 45) + '...';
      }
      doc.text(деятельность, 50 + colWidths.код_окэд, y, { width: colWidths.вид_деятельности });
      
      // Добавляем числовые данные
      doc.text(formatNumber(row.количество_нп), 50 + colWidths.код_окэд + colWidths.вид_деятельности, y, { width: colWidths.количество_нп });
      doc.text(formatNumber(row.средняя_численность_работников), 50 + colWidths.код_окэд + colWidths.вид_деятельности + colWidths.количество_нп, y, { width: colWidths.средняя_численность_работников });
      doc.text(formatNumber(Math.round(row.Сумма_по_полю_ФОТт)), 50 + colWidths.код_окэд + colWidths.вид_деятельности + colWidths.количество_нп + colWidths.средняя_численность_работников, y, { width: colWidths.Сумма_по_полю_ФОТт });
      doc.text(formatNumber(Math.round(row.Сумма_по_полю_ср_зп)), 50 + colWidths.код_окэд + colWidths.вид_деятельности + colWidths.количество_нп + colWidths.средняя_численность_работников + colWidths.Сумма_по_полю_ФОТт, y, { width: colWidths.Сумма_по_полю_ср_зп });

      y += 15;

      // Добавляем разделитель между строками через одну
      rowIndex++;
      if (rowIndex % 2 === 0) {
        doc.moveTo(50, y - 5).lineTo(50 + tableWidth, y - 5).lineWidth(0.5).stroke();
      }
    }

    log('Завершение таблицы');
    // Добавляем нижнюю линию таблицы
    doc.moveTo(50, y).lineTo(50 + tableWidth, y).lineWidth(1).stroke();
    y += 15;
    
    // Добавляем статистическую сводку
    log('Добавление статистической сводки');
    doc.font('DejaVuBold').fontSize(12).text(convertEncoding('Сводная информация по выбранным записям:'), 50, y, { underline: true });
    y += 20;
    
    // Вычисляем суммарные показатели
    const totalNp = result.rows.reduce((sum, row) => sum + row.количество_нп, 0);
    const totalEmployees = result.rows.reduce((sum, row) => sum + row.средняя_численность_работников, 0);
    const totalFund = result.rows.reduce((sum, row) => sum + row.Сумма_по_полю_ФОТт, 0);
    const avgSalary = totalEmployees > 0 ? totalFund / totalEmployees : 0;
    const totalTax = result.rows.reduce((sum, row) => sum + row.сумма_налогов, 0);
    
    // Выводим статистику
    doc.font('DejaVuRegular').fontSize(10);
    doc.text(convertEncoding(`Общее количество НП: ${formatNumber(totalNp)}`), 50, y);
    y += 15;
    doc.text(convertEncoding(`Общая численность работников: ${formatNumber(totalEmployees)}`), 50, y);
    y += 15;
    doc.text(convertEncoding(`Общий фонд оплаты труда: ${formatNumber(Math.round(totalFund))} тг.`), 50, y);
    y += 15;
    doc.text(convertEncoding(`Средняя заработная плата: ${formatNumber(Math.round(avgSalary))} тг.`), 50, y);
    y += 15;
    doc.text(convertEncoding(`Общая сумма налогов: ${formatNumber(Math.round(totalTax))} тг.`), 50, y);
    
    // Добавляем номера страниц
    log('Добавление номеров страниц');
    const totalPages = doc.bufferedPageRange().count;
    for (let i = 0; i < totalPages; i++) {
      doc.switchToPage(i);
      doc.font('DejaVuRegular').fontSize(8).text(
        convertEncoding(`Страница ${i + 1} из ${totalPages}`),
        50,
        doc.page.height - 50,
        { align: 'center' }
      );
    }
    
    // Завершаем документ
    log('Завершение генерации PDF');
    doc.end();
  } catch (error) {
    log('Ошибка при генерации PDF для нескольких записей', { 
      error: error.message,
      stack: error.stack 
    });
    console.error('Ошибка при генерации PDF для нескольких записей:', error);
    console.error('Стек вызовов:', error.stack);
    res.status(500).json({ 
      message: 'Ошибка при генерации PDF', 
      error: error.message,
      stack: error.stack
    });
  }
};

exports.generatePdfById = async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`Запрос на генерацию PDF для записи с ID: ${id}`);
    
    // Получаем данные из базы данных
    const result = await req.app.get('db').query('SELECT * FROM "Сводная" WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Запись не найдена' });
    }
    
    console.log('Запись найдена, начинаем генерацию PDF');
    const data = result.rows[0];
    
    // Создаем PDF документ
    const doc = new PDFDocument({
      size: 'A4',
      margin: 50,
      info: {
        Title: `Отчет по записи ${data.код_окэd}`,
        Author: 'BDSM API',
        Subject: 'Статистические данные',
      }
    });

    // Используем встроенный шрифт PDFKit
    doc.font('Helvetica');

    // Настраиваем заголовки для скачивания
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=report-${data.код_окэd}-${Date.now()}.pdf`);

    // Направляем PDF прямо в response
    doc.pipe(res);

    // Настраиваем шрифты и стили
    const titleSize = 16;
    const headerSize = 12;
    const textSize = 10;
    const lineGap = 5;
    
    // Добавляем заголовок
    doc.fontSize(titleSize).text('Отчет по данным "Сводная"', {
      align: 'center',
      underline: true
    });
    doc.moveDown();

    // Добавляем дату создания
    const now = new Date();
    doc.fontSize(textSize).text(`Дата создания: ${now.toLocaleDateString()} ${now.toLocaleTimeString()}`, {
      align: 'right'
    });
    doc.moveDown();

    // Добавляем примененные фильтры
    if (req.query.filter) {
      doc.fontSize(textSize).text(`Применен фильтр: "${req.query.filter}"`, {
        align: 'left',
        italics: true
      });
      doc.moveDown();
    }

    // Проверяем, есть ли данные
    if (result.rows.length === 0) {
      doc.fontSize(textSize).text('Нет данных для отображения.', {
        align: 'center'
      });
    } else {
      // Добавляем информацию о количестве записей
      doc.fontSize(textSize).text(`Всего записей: ${result.rows.length}`, {
        align: 'left'
      });
      doc.moveDown();

      // Определяем ширину столбцов таблицы
      const tableWidth = 500;
      const colWidths = {
        код_окэд: 70,
        вид_деятельности: 180,
        количество_нп: 60,
        средняя_численность_работников: 60,
        Сумма_по_полю_ФОТт: 65,
        Сумма_по_полю_ср_зп: 65
      };

      let y = doc.y;

      // Рисуем заголовки таблицы
      doc.fontSize(headerSize).text('Код ОКЭД', 50, y, { width: colWidths.код_окэд });
      doc.text('Вид деятельности', 50 + colWidths.код_окэд, y, { width: colWidths.вид_деятельности });
      doc.text('Кол-во', 50 + colWidths.код_окэд + colWidths.вид_деятельности, y, { width: colWidths.количество_нп });
      doc.text('Числ.', 50 + colWidths.код_окэд + colWidths.вид_деятельности + colWidths.количество_нп, y, { width: colWidths.средняя_численность_работников });
      doc.text('ФОТ', 50 + colWidths.код_окэд + colWidths.вид_деятельности + colWidths.количество_нп + colWidths.средняя_численность_работников, y, { width: colWidths.Сумма_по_полю_ФОТт });
      doc.text('Ср. ЗП', 50 + colWidths.код_окэд + colWidths.вид_деятельности + colWidths.количество_нп + colWidths.средняя_численность_работников + colWidths.Сумма_по_полю_ФОТт, y, { width: colWidths.Сумма_по_полю_ср_зп });

      y += 20;
      doc.moveTo(50, y).lineTo(50 + tableWidth, y).stroke();
      y += 5;

      // Форматирование чисел с разделителями
      const formatNumber = (num) => {
        return new Intl.NumberFormat('ru-RU').format(num);
      };

      // Рисуем данные таблицы
      let rowIndex = 0;
      for (const row of result.rows) {
        // Ограничиваем количество строк на страницу
        if (y > doc.page.height - 100) {
          doc.addPage();
          y = 50;
        }

        doc.fontSize(textSize);
        doc.text(row.код_окэд, 50, y, { width: colWidths.код_окэд });
        
        // Обрезаем длинные названия
        let деятельность = row.вид_деятельности;
        if (деятельность.length > 45) {
          деятельность = деятельность.substring(0, 45) + '...';
        }
        doc.text(деятельность, 50 + colWidths.код_окэд, y, { width: colWidths.вид_деятельности });
        
        doc.text(formatNumber(row.количество_нп), 50 + colWidths.код_окэд + colWidths.вид_деятельности, y, { width: colWidths.количество_нп });
        doc.text(formatNumber(row.средняя_численность_работников), 50 + colWidths.код_окэд + colWidths.вид_деятельности + colWidths.количество_нп, y, { width: colWidths.средняя_численность_работников });
        doc.text(formatNumber(Math.round(row.Сумма_по_полю_ФОТт)), 50 + colWidths.код_окэд + colWidths.вид_деятельности + colWidths.количество_нп + colWidths.средняя_численность_работников, y, { width: colWidths.Сумма_по_полю_ФОТт });
        doc.text(formatNumber(Math.round(row.Сумма_по_полю_ср_зп)), 50 + colWidths.код_окэд + colWidths.вид_деятельности + colWidths.количество_нп + colWidths.средняя_численность_работников + colWidths.Сумма_по_полю_ФОТт, y, { width: colWidths.Сумма_по_полю_ср_зп });

        y += 15;

        // Добавляем разделитель между строками через одну
        rowIndex++;
        if (rowIndex % 2 === 0) {
          doc.moveTo(50, y - 5).lineTo(50 + tableWidth, y - 5).lineWidth(0.5).stroke();
        }
      }

      // Добавляем нижнюю линию таблицы
      doc.moveTo(50, y).lineTo(50 + tableWidth, y).lineWidth(1).stroke();
    }

    // Добавляем номера страниц
    const totalPages = doc.bufferedPageRange().count;
    for (let i = 0; i < totalPages; i++) {
      doc.switchToPage(i);
      doc.fontSize(8).text(
        `Страница ${i + 1} из ${totalPages}`,
        50,
        doc.page.height - 50,
        { align: 'center' }
      );
    }

    // Завершаем документ
    doc.end();
  } catch (error) {
    console.error('Ошибка при генерации PDF:', error);
    console.error('Стек вызовов:', error.stack);
    res.status(500).json({ 
      message: 'Ошибка при генерации PDF', 
      error: error.message,
      stack: error.stack
    });
  }
};

exports.generatePdfByOked = async (req, res) => {
  try {
    const { oked } = req.params;
    console.log(`Запрос на генерацию PDF для ОКЭД: ${oked}`);
    
    // Получаем данные из базы данных
    const result = await req.app.get('db').query('SELECT * FROM "Сводная" WHERE код_окэд = $1', [oked]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Записи не найдены' });
    }
    
    console.log(`Найдено ${result.rows.length} записей, начинаем генерацию PDF`);
    
    // Создаем PDF документ
    const doc = new PDFDocument({
      size: 'A4',
      margin: 50,
      info: {
        Title: `Отчет по ОКЭД ${oked}`,
        Author: 'BDSM API',
        Subject: 'Статистические данные',
      }
    });

    // Используем встроенный шрифт PDFKit
    doc.font('Helvetica');

    // Настраиваем заголовки для скачивания
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=report-${oked}-${Date.now()}.pdf`);

    // Направляем PDF прямо в response
    doc.pipe(res);

    // Настраиваем шрифты и стили
    const titleSize = 16;
    const headerSize = 12;
    const textSize = 10;
    const lineGap = 5;
    
    // Добавляем заголовок
    doc.fontSize(titleSize).text('Отчет по данным "Сводная"', {
      align: 'center',
      underline: true
    });
    doc.moveDown();

    // Добавляем дату создания
    const now = new Date();
    doc.fontSize(textSize).text(`Дата создания: ${now.toLocaleDateString()} ${now.toLocaleTimeString()}`, {
      align: 'right'
    });
    doc.moveDown();

    // Добавляем примененные фильтры
    if (req.query.filter) {
      doc.fontSize(textSize).text(`Применен фильтр: "${req.query.filter}"`, {
        align: 'left',
        italics: true
      });
      doc.moveDown();
    }

    // Проверяем, есть ли данные
    if (result.rows.length === 0) {
      doc.fontSize(textSize).text('Нет данных для отображения.', {
        align: 'center'
      });
    } else {
      // Добавляем информацию о количестве записей
      doc.fontSize(textSize).text(`Всего записей: ${result.rows.length}`, {
        align: 'left'
      });
      doc.moveDown();

      // Определяем ширину столбцов таблицы
      const tableWidth = 500;
      const colWidths = {
        код_окэд: 70,
        вид_деятельности: 180,
        количество_нп: 60,
        средняя_численность_работников: 60,
        Сумма_по_полю_ФОТт: 65,
        Сумма_по_полю_ср_зп: 65
      };

      let y = doc.y;

      // Рисуем заголовки таблицы
      doc.fontSize(headerSize).text('Код ОКЭД', 50, y, { width: colWidths.код_окэд });
      doc.text('Вид деятельности', 50 + colWidths.код_окэд, y, { width: colWidths.вид_деятельности });
      doc.text('Кол-во', 50 + colWidths.код_окэд + colWidths.вид_деятельности, y, { width: colWidths.количество_нп });
      doc.text('Числ.', 50 + colWidths.код_окэд + colWidths.вид_деятельности + colWidths.количество_нп, y, { width: colWidths.средняя_численность_работников });
      doc.text('ФОТ', 50 + colWidths.код_окэд + colWidths.вид_деятельности + colWidths.количество_нп + colWidths.средняя_численность_работников, y, { width: colWidths.Сумма_по_полю_ФОТт });
      doc.text('Ср. ЗП', 50 + colWidths.код_окэд + colWidths.вид_деятельности + colWidths.количество_нп + colWidths.средняя_численность_работников + colWidths.Сумма_по_полю_ФОТт, y, { width: colWidths.Сумма_по_полю_ср_зп });

      y += 20;
      doc.moveTo(50, y).lineTo(50 + tableWidth, y).stroke();
      y += 5;

      // Форматирование чисел с разделителями
      const formatNumber = (num) => {
        return new Intl.NumberFormat('ru-RU').format(num);
      };

      // Рисуем данные таблицы
      let rowIndex = 0;
      for (const row of result.rows) {
        // Ограничиваем количество строк на страницу
        if (y > doc.page.height - 100) {
          doc.addPage();
          y = 50;
        }

        doc.fontSize(textSize);
        doc.text(row.код_окэд, 50, y, { width: colWidths.код_окэд });
        
        // Обрезаем длинные названия
        let деятельность = row.вид_деятельности;
        if (деятельность.length > 45) {
          деятельность = деятельность.substring(0, 45) + '...';
        }
        doc.text(деятельность, 50 + colWidths.код_окэд, y, { width: colWidths.вид_деятельности });
        
        doc.text(formatNumber(row.количество_нп), 50 + colWidths.код_окэд + colWidths.вид_деятельности, y, { width: colWidths.количество_нп });
        doc.text(formatNumber(row.средняя_численность_работников), 50 + colWidths.код_окэд + colWidths.вид_деятельности + colWidths.количество_нп, y, { width: colWidths.средняя_численность_работников });
        doc.text(formatNumber(Math.round(row.Сумма_по_полю_ФОТт)), 50 + colWidths.код_окэд + colWidths.вид_деятельности + colWidths.количество_нп + colWidths.средняя_численность_работников, y, { width: colWidths.Сумма_по_полю_ФОТт });
        doc.text(formatNumber(Math.round(row.Сумма_по_полю_ср_зп)), 50 + colWidths.код_окэд + colWidths.вид_деятельности + colWidths.количество_нп + colWidths.средняя_численность_работников + colWidths.Сумма_по_полю_ФОТт, y, { width: colWidths.Сумма_по_полю_ср_зп });

        y += 15;

        // Добавляем разделитель между строками через одну
        rowIndex++;
        if (rowIndex % 2 === 0) {
          doc.moveTo(50, y - 5).lineTo(50 + tableWidth, y - 5).lineWidth(0.5).stroke();
        }
      }

      // Добавляем нижнюю линию таблицы
      doc.moveTo(50, y).lineTo(50 + tableWidth, y).lineWidth(1).stroke();
    }

    // Добавляем номера страниц
    const totalPages = doc.bufferedPageRange().count;
    for (let i = 0; i < totalPages; i++) {
      doc.switchToPage(i);
      doc.fontSize(8).text(
        `Страница ${i + 1} из ${totalPages}`,
        50,
        doc.page.height - 50,
        { align: 'center' }
      );
    }

    // Завершаем документ
    doc.end();
  } catch (error) {
    console.error('Ошибка при генерации PDF:', error);
    console.error('Стек вызовов:', error.stack);
    res.status(500).json({ 
      message: 'Ошибка при генерации PDF', 
      error: error.message,
      stack: error.stack
    });
  }
};

/**
 * Альтернативная версия генерации PDF с базовыми настройками
 * @param {Object} req - HTTP запрос
 * @param {Object} res - HTTP ответ
 */
exports.generateSimplePdf = async (req, res) => {
  try {
    log('Начало генерации упрощенного PDF отчета (без кириллицы)');
    log('Запрос от клиента:', {
      method: req.method,
      url: req.url,
      headers: req.headers,
      query: req.query
    });
    
    // Получаем данные из базы данных
    const query = 'SELECT * FROM "Сводная" ORDER BY код_окэд LIMIT 50';
    log('SQL запрос', { query });
    
    let result;
    try {
      result = await pool.query(query);
      log(`Получено записей из БД: ${result.rows.length}`);
    
      if (result.rows.length > 0) {
        log('Пример первой записи', {
          код_окэд: result.rows[0].код_окэд,
          вид_деятельности: result.rows[0].вид_деятельности
        });
      }
    } catch (dbError) {
      log('Ошибка при запросе к БД', { error: dbError.message, stack: dbError.stack });
      throw new Error(`Ошибка при запросе к базе данных: ${dbError.message}`);
    }
    
    // Создаем простой PDF документ без использования кириллических шрифтов
    let doc;
    try {
      log('Создание документа PDF с базовыми шрифтами');
      doc = createSimplePdfDocument('Упрощенный отчет');

      // Настраиваем заголовки для скачивания
      log('Настройка заголовков ответа');
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=simple-report-${Date.now()}.pdf`);

      // Направляем PDF прямо в response
      doc.pipe(res);

      // Настраиваем шрифты и стили
      const titleSize = 16;
      const headerSize = 12;
      const textSize = 10;
      
      log('Добавление заголовка');
      // Добавляем заголовок 
      doc.fontSize(titleSize).text('Basic Report (No Cyrillic)', {
        align: 'center',
        underline: true
      });
      doc.moveDown();

      log('Добавление даты создания');
      // Добавляем дату создания
      const now = new Date();
      doc.fontSize(textSize).text(`Date: ${now.toLocaleDateString()} ${now.toLocaleTimeString()}`, {
        align: 'right'
      });
      doc.moveDown();

      // Проверяем, есть ли данные
      if (result.rows.length === 0) {
        log('Нет данных для отображения');
        doc.fontSize(textSize).text('No data available.', {
          align: 'center'
        });
      } else {
        log('Добавление информации о количестве записей');
        // Добавляем информацию о количестве записей
        doc.fontSize(textSize).text(`Total records: ${result.rows.length}`, {
          align: 'left'
        });
        doc.moveDown();
        
        log('Упрощенная таблица для проверки');
        doc.fontSize(textSize).text('Simple table for testing (transliterated values):', {
          align: 'left'
        });
        doc.moveDown();
        
        // Транслитерация для кириллицы
        const transliterate = (text) => {
          if (!text) return '';
          
          // Простая транслитерация
          const map = {
            'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'e',
            'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm',
            'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
            'ф': 'f', 'х': 'h', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'sch', 'ъ': '',
            'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya',
            'А': 'A', 'Б': 'B', 'В': 'V', 'Г': 'G', 'Д': 'D', 'Е': 'E', 'Ё': 'E',
            'Ж': 'Zh', 'З': 'Z', 'И': 'I', 'Й': 'Y', 'К': 'K', 'Л': 'L', 'М': 'M',
            'Н': 'N', 'О': 'O', 'П': 'P', 'Р': 'R', 'С': 'S', 'Т': 'T', 'У': 'U',
            'Ф': 'F', 'Х': 'H', 'Ц': 'Ts', 'Ч': 'Ch', 'Ш': 'Sh', 'Щ': 'Sch', 'Ъ': '',
            'Ы': 'Y', 'Ь': '', 'Э': 'E', 'Ю': 'Yu', 'Я': 'Ya'
          };
          
          return text.split('').map(char => map[char] || char).join('');
        };
        
        // Показываем только первые 5 записей для отладки
        log('Добавление первых 5 записей для отладки');
        for (let i = 0; i < Math.min(5, result.rows.length); i++) {
          const row = result.rows[i];
          const okved = transliterate(row.код_окэд || '');
          const activity = transliterate(row.вид_деятельности || '');
          
          doc.text(`${i+1}. ${okved} - ${activity}`, {
            align: 'left'
          });
          doc.moveDown(0.5);
        }
      }
      
      log('Завершение документа');
      // Завершаем документ
      doc.end();
    } catch (pdfError) {
      log('Ошибка при создании/рендеринге PDF', { 
        error: pdfError.message, 
        stack: pdfError.stack 
      });
      throw new Error(`Ошибка при создании упрощенного PDF: ${pdfError.message}`);
    }
  } catch (error) {
    // Используем новый обработчик ошибок
    return handlePdfError(res, error, req.headers.accept);
  }
};

/**
 * Отправляет HTML-страницу с информацией об ошибке
 * @param {Object} res - HTTP ответ
 * @param {Error} error - Объект ошибки
 */
const sendErrorPage = (res, error) => {
  const htmlContent = `
  <!DOCTYPE html>
  <html>
  <head>
    <title>Ошибка при генерации PDF</title>
    <meta charset="utf-8">
    <style>
      body { font-family: Arial, sans-serif; margin: 20px; }
      h1 { color: #d32f2f; }
      .error-box { 
        background-color: #ffebee; 
        border-left: 5px solid #d32f2f; 
        padding: 15px;
        margin-bottom: 20px;
      }
      .stack-trace {
        background-color: #f5f5f5;
        padding: 15px;
        overflow-x: auto;
        font-family: monospace;
        white-space: pre-wrap;
      }
      .info { margin-bottom: 10px; }
    </style>
  </head>
  <body>
    <h1>Ошибка при генерации PDF</h1>
    <div class="error-box">
      <div class="info"><strong>Сообщение:</strong> ${error.message}</div>
      <div class="info"><strong>Время:</strong> ${new Date().toLocaleString()}</div>
    </div>
    <h2>Стек вызовов:</h2>
    <div class="stack-trace">${error.stack}</div>
  </body>
  </html>
  `;

  res.writeHead(500, {
    'Content-Type': 'text/html; charset=utf-8',
    'Content-Length': Buffer.byteLength(htmlContent)
  });
  res.end(htmlContent);
};

/**
 * Обработчик ошибок для контроллера PDF
 * @param {Object} res - HTTP ответ
 * @param {Error} error - Объект ошибки
 * @param {string} acceptHeader - Заголовок Accept из запроса
 */
const handlePdfError = (res, error, acceptHeader = '') => {
  log('Ошибка при генерации PDF', { 
    error: error.message,
    stack: error.stack 
  });
  console.error('Ошибка при генерации PDF:', error);
  console.error('Стек вызовов:', error.stack);
  
  // Проверяем, хочет ли клиент получить JSON или HTML
  if (acceptHeader && acceptHeader.includes('application/json')) {
    return res.status(500).json({ 
      message: 'Ошибка при генерации PDF', 
      error: error.message,
      stack: error.stack
    });
  } else {
    // По умолчанию отправляем HTML ошибку для удобства отладки в браузере
    return sendErrorPage(res, error);
  }
}; 