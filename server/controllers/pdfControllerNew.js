const PDFDocument = require('pdfkit');
const path = require('path');
const { Сводная } = require('../models');
const { Op } = require('sequelize');
const fs = require('fs');
const { FONTS } = require('../config/fonts');
const { processText } = require('../utils/textProcessor');
const { generateBarChart, generatePieChart } = require('../utils/chartGenerator');

// Общие константы для форматирования PDF
const lineHeight = 12; // Высота строки
const minHeight = 18; // Минимальная высота
const footerHeight = 50; // Высота нижнего колонтитула
const tableWidth = 500; // Ширина таблицы
const labelWidth = 250; // Увеличиваем ширину метки с 200 до 250
const valueWidth = 250; // Уменьшаем ширину значения с 300 до 250
const startX = 70; // Начальная X-координата
const baseRowHeight = 20; // Базовая высота строки
const pageMargin = 50; // Отступ страницы

// Константы стилей и размеров
const STYLES = {
  fontSize: {
    title: 16,
    header: 12,
    text: 10,
    small: 8,
    smallest: 6
  },
  spacing: {
    lineGap: 3,
    characterSpacing: 0.2,
    columnGap: 5, // Уменьшаем отступ между колонками до 5px
    summaryLineGap: 15
  },
  table: {
    width: tableWidth,
    startX: 40, // Немного уменьшаем отступ слева
    columns: {
      код_окэд: 65, // Немного уменьшаем
      вид_деятельности: 135, // Немного уменьшаем
      количество_нп: 40, // Немного уменьшаем
      средняя_численность_работников: 45,
      'Сумма по полю ФОТ': 85, // Немного увеличиваем для больших чисел
      Сумма_по_полю_ср_зп: 85 // Немного увеличиваем для больших чисел
    }
  }
};

// Форматирование чисел с разделителями
const formatNumber = (num) => {
  return new Intl.NumberFormat('ru-RU').format(num);
};

// Проверка наличия шрифтов и их валидация
const validateFonts = () => {
  const missingFonts = [];
  Object.entries(FONTS).forEach(([name, fontPath]) => {
    try {
      if (!fs.existsSync(fontPath)) {
        missingFonts.push(fontPath);
        console.error(`Шрифт не найден: ${fontPath}`);
      } else {
        const stats = fs.statSync(fontPath);
        if (stats.size === 0) {
          missingFonts.push(fontPath);
          console.error(`Шрифт поврежден или пуст: ${fontPath}`);
        }
      }
    } catch (error) {
      missingFonts.push(fontPath);
      console.error(`Ошибка при проверке шрифта ${fontPath}:`, error.message);
    }
  });
  
  if (missingFonts.length > 0) {
    throw new Error(`Отсутствуют или повреждены следующие шрифты: ${missingFonts.join(', ')}`);
  }
};

// Создание и настройка PDF документа
const createPdfDocument = () => {
  const doc = new PDFDocument({
    size: 'A4',
    margin: 50,
    bufferPages: true,
    lang: 'ru',
    autoFirstPage: true,
    info: {
      Title: 'Отчет по данным "Сводная"',
      Author: 'BDSM API',
      Subject: 'Статистические данные',
      Keywords: 'отчет, статистика, данные',
      CreationDate: new Date(),
    }
  });

  // Регистрация шрифтов
  doc.registerFont('PTSans', FONTS.regular);
  doc.registerFont('PTSans-Bold', FONTS.bold);
  doc.registerFont('Arial', FONTS.arial);
  doc.registerFont('DejaVu', FONTS.dejavu);
  doc.registerFont('DejaVu-Bold', FONTS.dejavuBold);

  // Установка базового шрифта
  doc.font('PTSans');

  return doc;
};

// Функция для отрисовки заголовков таблицы
const drawTableHeaders = (doc, yPos) => {
  let currentY = yPos;
  const extraPadding = 5;
  const positions = calculatePositions();
  
  // Устанавливаем размер шрифта для заголовков
  doc.fontSize(STYLES.fontSize.text);
  
  // Рисуем заголовки
  doc.text('Код ОКЭД', positions.код_окэд, currentY, { 
    width: STYLES.table.columns.код_окэд,
    align: 'left'
  });
  
  doc.text('Вид деятельности', positions.вид_деятельности, currentY, { 
    width: STYLES.table.columns.вид_деятельности,
    align: 'left'
  });
  
  doc.text('Кол-во', positions.количество_нп, currentY, { 
    width: STYLES.table.columns.количество_нп,
    align: 'right'
  });
  
  doc.text('Числ.', positions.численность, currentY, { 
    width: STYLES.table.columns.средняя_численность_работников,
    align: 'right'
  });
  
  doc.text('ФОТ', positions.фот, currentY, { 
    width: STYLES.table.columns['Сумма по полю ФОТ'],
    align: 'right'
  });
  
  doc.text('Ср. ЗП', positions.ср_зп, currentY, { 
    width: STYLES.table.columns.Сумма_по_полю_ср_зп,
    align: 'right'
  });

  // Добавляем отступ после заголовков
  currentY += lineHeight + extraPadding;
  
  // Добавляем линию под заголовками
  doc.moveTo(STYLES.table.startX, currentY)
     .lineTo(STYLES.table.startX + STYLES.table.width, currentY)
     .stroke();
  
  return currentY + 5;
};

// Функция для вычисления позиций колонок
const calculatePositions = () => {
  let currentX = STYLES.table.startX;
  const positions = {};
  
  // Код ОКЭД
  positions.код_окэд = currentX;
  currentX += STYLES.table.columns.код_окэд + STYLES.spacing.columnGap;
  
  // Вид деятельности
  positions.вид_деятельности = currentX;
  currentX += STYLES.table.columns.вид_деятельности + STYLES.spacing.columnGap;
  
  // Количество
  positions.количество_нп = currentX;
  currentX += STYLES.table.columns.количество_нп + STYLES.spacing.columnGap;
  
  // Численность
  positions.численность = currentX;
  currentX += STYLES.table.columns.средняя_численность_работников + STYLES.spacing.columnGap;
  
  // ФОТ
  positions.фот = currentX;
  currentX += STYLES.table.columns['Сумма по полю ФОТ'] + STYLES.spacing.columnGap;
  
  // Средняя ЗП
  positions.ср_зп = currentX;
  
  return positions;
};

const prepareChartData = (records) => {
  const totalFund = records.reduce((sum, row) => sum + Number(row['Сумма по полю ФОТ'] || 0), 0);
  const sortedData = [...records].sort((a, b) => 
    Number(b.средняя_численность_работников || 0) - Number(a.средняя_численность_работников || 0)
  );

  return sortedData.slice(0, 10).map(row => ({
    name: row.вид_деятельности.length > 30 
      ? row.вид_деятельности.substring(0, 30) + '...'
      : row.вид_деятельности,
    value: Number(row.средняя_численность_работников || 0),
    fundValue: Number(row['Сумма по полю ФОТ'] || 0),
    salaryValue: Number(row.Сумма_по_полю_ср_зп || 0)
  }));
};

exports.generatePdf = async (req, res) => {
  try {
    console.log('Начало генерации PDF отчета...');
    
    // Проверяем наличие и валидность шрифтов перед генерацией PDF
    validateFonts();
    
    // Получаем данные из базы данных
    let records;
    if (req.query.filter) {
      records = await Сводная.findAll({
        attributes: [
          'id',
          'код_окэд',
          'вид_деятельности',
          'количество_нп',
          'средняя_численность_работников',
          'Сумма по полю ФОТ',
          'Сумма_по_полю_ср_зп',
          'сумма_налогов'
        ],
        where: {
          [Op.or]: [
            { код_окэд: { [Op.iLike]: `%${req.query.filter}%` } },
            { вид_деятельности: { [Op.iLike]: `%${req.query.filter}%` } }
          ]
        },
        order: [['код_окэд', 'ASC']],
        charset: 'utf8'
      });
    } else {
      records = await Сводная.findAll({
        attributes: [
          'id',
          'код_окэд',
          'вид_деятельности',
          'количество_нп',
          'средняя_численность_работников',
          'Сумма по полю ФОТ',
          'Сумма_по_полю_ср_зп',
          'сумма_налогов'
        ],
        order: [['код_окэд', 'ASC']],
        charset: 'utf8'
      });
    }
    
    console.log(`Получено ${records.length} записей из базы данных`);
    if (records.length > 0) {
      console.log('Пример записи из БД:', {
        код_окэд: records[0].код_окэд,
        вид_деятельности: records[0].вид_деятельности
      });
    }
    
    // Создаем PDF документ
    console.log('Создаем PDF документ...');
    const doc = createPdfDocument();

    // Настраиваем заголовки для скачивания
    res.setHeader('Content-Type', 'application/pdf; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(`report-${Date.now()}.pdf`)}`);

    // Обработчик ошибок для потока
    doc.on('error', (error) => {
      console.error('Ошибка при генерации PDF:', error);
      if (!res.headersSent) {
        res.status(500).json({ 
          message: 'Ошибка при генерации PDF', 
          error: error.message 
        });
      }
    });

    // Направляем PDF в response
    doc.pipe(res);

    // Добавляем заголовок
    doc.font('PTSans-Bold')
       .fontSize(STYLES.fontSize.title)
       .text(processText('Отчет по данным "Сводная"'), {
      align: 'center',
      underline: true,
         lineGap: STYLES.spacing.lineGap,
         characterSpacing: STYLES.spacing.characterSpacing
    });
    doc.moveDown();

    // Возвращаемся к обычному шрифту
    doc.font('PTSans');

    // Добавляем дату создания
    const now = new Date();
    doc.fontSize(STYLES.fontSize.text)
       .text(processText(`Дата создания: ${now.toLocaleDateString()} ${now.toLocaleTimeString()}`), {
      align: 'right',
         characterSpacing: STYLES.spacing.characterSpacing
    });
    doc.moveDown();

    // Добавляем примененные фильтры
    if (req.query.filter) {
      doc.fontSize(STYLES.fontSize.text)
         .text(processText(`Применен фильтр: "${req.query.filter}"`), {
        align: 'left',
        italics: true,
           characterSpacing: STYLES.spacing.characterSpacing
      });
      doc.moveDown();
    }

    // Проверяем наличие данных
    if (records.length === 0) {
      doc.fontSize(STYLES.fontSize.text)
         .text(processText('Нет данных для отображения.'), {
        align: 'center',
           characterSpacing: STYLES.spacing.characterSpacing
      });
    } else {
      // Добавляем информацию о количестве записей
      doc.fontSize(STYLES.fontSize.text)
         .text(processText(`Всего записей: ${records.length}`), {
        align: 'left',
           characterSpacing: STYLES.spacing.characterSpacing
      });
      doc.moveDown();

      let y = doc.y;

      // Функция для проверки необходимости новой страницы
      const needNewPage = (currentY, contentHeight) => {
        return (currentY + contentHeight) > (doc.page.height - footerHeight);
      };

      // Отрисовка заголовков таблицы через общую функцию
      y = drawTableHeaders(doc, y);

      // Рисуем данные таблицы
      let rowIndex = 0;
      const availablePageHeight = doc.page.height - pageMargin - footerHeight;
      
      for (const row of records) {
        // Вычисляем высоту текущей записи
        let деятельность = processText(row.вид_деятельности);
        const linesCount = Math.ceil(деятельность.length / 22); // Примерное количество строк
        const estimatedHeight = Math.max(20, linesCount * 12 + 10); // Минимум 20px, иначе высота по контенту
        
        // Обрабатываем длинные названия с добавлением переносов
        let lines = [];
        
        // Разбиваем текст на слова и обрабатываем длинные слова
        let words = деятельность.split(' ');
        let currentLine = '';
        const maxLineLength = 20; // Уменьшаем максимальную длину строки
        
        for (let word of words) {
          word = word.trim();
          if (!word) continue;
          
          // Обработка длинных слов
          if (word.length > maxLineLength) {
            // Добавляем текущую строку, если она не пуста
            if (currentLine) {
              lines.push(currentLine.trim());
              currentLine = '';
            }
            
            // Разбиваем длинное слово на части
            while (word.length > maxLineLength - 1) { // -1 для дефиса
              const breakPoint = maxLineLength - 1;
              lines.push(word.substring(0, breakPoint) + '-');
              word = word.substring(breakPoint);
            }
            currentLine = word;
          } else {
            // Проверяем, поместится ли слово в текущую строку
            if (!currentLine) {
              currentLine = word;
            } else if ((currentLine + ' ' + word).length <= maxLineLength) {
              currentLine += ' ' + word;
            } else {
              lines.push(currentLine.trim());
              currentLine = word;
            }
          }
        }
        
        if (currentLine) {
          lines.push(currentLine.trim());
        }

        const extraPadding = Math.max(0, lines.length - 1) * 2;
        const totalHeight = Math.max(lines.length * lineHeight + extraPadding, minHeight);
        let rowTotalHeight = totalHeight + 8; // Общая высота записи с отступами

        // Проверяем необходимость новой страницы
        if (y + rowTotalHeight > doc.page.height - footerHeight - 20) {
            // Проверяем, не последняя ли это запись
            if (rowIndex < records.length - 1) {
          doc.addPage();
                y = pageMargin;
                y = drawTableHeaders(doc, y);
            }
        }

        doc.fontSize(STYLES.fontSize.text);
        
        // Добавляем отступ перед каждой записью
        y += 3;

        const positions = calculatePositions();

        // Код ОКЭД
        doc.text(processText(row.код_окэд), positions.код_окэд, y, { 
          width: STYLES.table.columns.код_окэд,
          align: 'left',
          characterSpacing: STYLES.spacing.characterSpacing
        });

        // Вид деятельности
        doc.text(lines.join('\n'), positions.вид_деятельности, y, { 
          width: STYLES.table.columns.вид_деятельности,
          align: 'left',
          characterSpacing: STYLES.spacing.characterSpacing,
          lineGap: 0,
          paragraphGap: 0
        });
        
        // Количество
        doc.text(formatNumber(row.количество_нп || 0), positions.количество_нп, y, { 
          width: STYLES.table.columns.количество_нп,
          align: 'right',
          characterSpacing: STYLES.spacing.characterSpacing
        });

        // Численность
        const численность = parseFloat(row.средняя_численность_работников) || 0;
        doc.text(formatNumber(численность), positions.численность, y, { 
          width: STYLES.table.columns.средняя_численность_работников,
          align: 'right',
          characterSpacing: STYLES.spacing.characterSpacing
        });

        // ФОТ
        const фот = parseFloat(row['Сумма по полю ФОТ']);
        const фотText = !isNaN(фот) ? formatNumber(Math.round(фот)) : '-';
        doc.text(фотText, positions.фот, y, { 
          width: STYLES.table.columns['Сумма по полю ФОТ'],
          align: 'right',
          characterSpacing: STYLES.spacing.characterSpacing
        });

        // Средняя зарплата
        const срЗп = parseFloat(row.Сумма_по_полю_ср_зп);
        const срЗпText = !isNaN(срЗп) ? formatNumber(Math.round(срЗп)) : '-';
        doc.text(срЗпText, positions.ср_зп, y, { 
          width: STYLES.table.columns.Сумма_по_полю_ср_зп,
          align: 'right',
          characterSpacing: STYLES.spacing.characterSpacing
        });

        // Обновляем позицию для следующей строки с увеличенным отступом
        y += rowTotalHeight;

        // Добавляем разделитель после каждой строки
        doc.moveTo(STYLES.table.startX, y)
           .lineTo(STYLES.table.startX + STYLES.table.width, y)
           .lineWidth(0.25)
           .stroke();
        
        y += 5; // Увеличиваем отступ после линии
        rowIndex++;
      }

      // Добавляем нижнюю линию таблицы
      doc.moveTo(STYLES.table.startX, y).lineTo(STYLES.table.startX + STYLES.table.width, y).lineWidth(1).stroke();

      // Добавляем номера страниц только на страницы с контентом
    const pages = doc.bufferedPageRange();
    for (let i = 0; i < pages.count; i++) {
      doc.switchToPage(i);
        // Проверяем, есть ли контент на странице
        if (doc.page.content && doc.page.content.length > 0) {
      doc.fontSize(8).text(
        `Страница ${i + 1} из ${pages.count}`,
        0,
            doc.page.height - 30,
        { align: 'center' }
      );
        }
      }

      // Генерируем диаграммы для всех показателей
      const chartDataWorkers = prepareChartData(records);
      
      // Генерируем данные для средней зарплаты
      const chartDataSalary = records.map(row => ({
        name: row.вид_деятельности.length > 30 
          ? row.вид_деятельности.substring(0, 30) + '...'
          : row.вид_деятельности,
        value: Number(row.Сумма_по_полю_ср_зп || 0)
      })).sort((a, b) => b.value - a.value).slice(0, 10);

      // Генерируем данные для ФОТ
      const chartDataFOT = records.map(row => ({
        name: row.вид_деятельности.length > 30 
          ? row.вид_деятельности.substring(0, 30) + '...'
          : row.вид_деятельности,
        value: Number(row['Сумма по полю ФОТ'] || 0)
      })).sort((a, b) => b.value - a.value).slice(0, 10);

      // Генерируем все диаграммы
      const [barChartWorkers, pieChartWorkers, barChartSalary, pieChartSalary, barChartFOT, pieChartFOT] = await Promise.all([
        generateBarChart(chartDataWorkers, 'Распределение численности работников', 'Численность работников'),
        generatePieChart(chartDataWorkers, 'Распределение численности работников'),
        generateBarChart(chartDataSalary, 'Распределение средней заработной платы', 'Средняя заработная плата'),
        generatePieChart(chartDataSalary, 'Распределение средней заработной платы'),
        generateBarChart(chartDataFOT, 'Распределение фонда оплаты труда', 'ФОТ'),
        generatePieChart(chartDataFOT, 'Распределение фонда оплаты труда')
      ]);

      // Добавляем диаграммы численности работников
      doc.fontSize(14).font('PTSans-Bold').text('Диаграммы распределения численности работников', {
        align: 'center'
      });
      doc.moveDown();
      
      doc.image(barChartWorkers, {
        fit: [500, 250],
        align: 'center'
      });
      doc.moveDown();
      
      doc.image(pieChartWorkers, {
        fit: [500, 250],
        align: 'center'
      });
      doc.moveDown();

      // Добавляем диаграммы средней заработной платы
      doc.addPage();
      doc.fontSize(14).font('PTSans-Bold').text('Диаграммы распределения средней заработной платы', {
        align: 'center'
      });
      doc.moveDown();
      
      doc.image(barChartSalary, {
        fit: [500, 250],
        align: 'center'
      });
      doc.moveDown();
      
      doc.image(pieChartSalary, {
        fit: [500, 250],
        align: 'center'
      });
      doc.moveDown();

      // Добавляем диаграммы ФОТ
      doc.addPage();
      doc.fontSize(14).font('PTSans-Bold').text('Диаграммы распределения фонда оплаты труда', {
        align: 'center'
      });
      doc.moveDown();
      
      doc.image(barChartFOT, {
        fit: [500, 250],
        align: 'center'
      });
      doc.moveDown();
      
      doc.image(pieChartFOT, {
        fit: [500, 250],
        align: 'center'
      });
      doc.moveDown();

      // Добавляем новую страницу для таблицы
      doc.addPage();

      // Добавляем информацию о количестве записей
      doc.fontSize(STYLES.fontSize.text)
         .text(processText(`Всего записей: ${records.length}`), {
        align: 'left',
           characterSpacing: STYLES.spacing.characterSpacing
      });
      doc.moveDown();

      // Инициализируем переменные для таблицы
      let tableY = doc.y;
      let currentRowIndex = 0;
      const tableAvailableHeight = doc.page.height - pageMargin - footerHeight;

      // Отрисовка заголовков таблицы через общую функцию
      tableY = drawTableHeaders(doc, tableY);

      // Рисуем данные таблицы
      for (const row of records) {
        // Добавляем отладочное логирование
        console.log('Данные записи:', {
          код_окэд: row.код_окэд,
          фот: row.getDataValue ? row.getDataValue('Сумма по полю ФОТ') : row['Сумма по полю ФОТ'],
          тип_фот: typeof (row.getDataValue ? row.getDataValue('Сумма по полю ФОТ') : row['Сумма по полю ФОТ']),
          ср_зп: row.Сумма_по_полю_ср_зп
        });

        // Вычисляем высоту текущей записи
        let деятельность = processText(row.вид_деятельности);
        const linesCount = Math.ceil(деятельность.length / 22);
        const estimatedHeight = Math.max(20, linesCount * 12 + 10);
        
        // Обрабатываем длинные названия с добавлением переносов
        let lines = [];
        let words = деятельность.split(' ');
        let currentLine = '';
        const maxLineLength = 20;
        
        for (let word of words) {
          word = word.trim();
          if (!word) continue;
          
          if (word.length > maxLineLength) {
            if (currentLine) {
              lines.push(currentLine.trim());
              currentLine = '';
            }
            
            while (word.length > maxLineLength - 1) {
              const breakPoint = maxLineLength - 1;
              lines.push(word.substring(0, breakPoint) + '-');
              word = word.substring(breakPoint);
            }
            currentLine = word;
          } else {
            if (!currentLine) {
              currentLine = word;
            } else if ((currentLine + ' ' + word).length <= maxLineLength) {
              currentLine += ' ' + word;
            } else {
              lines.push(currentLine.trim());
              currentLine = word;
            }
          }
        }
        
        if (currentLine) {
          lines.push(currentLine.trim());
        }

        const extraPadding = Math.max(0, lines.length - 1) * 2;
        const totalHeight = Math.max(lines.length * lineHeight + extraPadding, minHeight);
        let rowTotalHeight = totalHeight + 8;

        // Проверяем необходимость новой страницы
        if (tableY + rowTotalHeight > doc.page.height - footerHeight - 20) {
          if (currentRowIndex < records.length - 1) {
          doc.addPage();
            tableY = pageMargin;
            tableY = drawTableHeaders(doc, tableY);
          }
        }

        const positions = calculatePositions();

        // Код ОКЭД
        doc.text(processText(row.код_окэд), positions.код_окэd, tableY, { 
          width: STYLES.table.columns.код_окэд,
          align: 'left',
          characterSpacing: STYLES.spacing.characterSpacing
        });

        // Вид деятельности
        doc.text(lines.join('\n'), positions.вид_деятельности, tableY, { 
          width: STYLES.table.columns.вид_деятельности,
          align: 'left',
          characterSpacing: STYLES.spacing.characterSpacing,
          lineGap: 0,
          paragraphGap: 0
        });

        // Количество
        doc.text(formatNumber(row.количество_нп || 0), positions.количество_нп, tableY, { 
          width: STYLES.table.columns.количество_нп,
          align: 'right',
          characterSpacing: STYLES.spacing.characterSpacing
        });

        // Численность
        const численность = parseFloat(row.средняя_численность_работников) || 0;
        doc.text(formatNumber(численность), positions.численность, tableY, { 
          width: STYLES.table.columns.средняя_численность_работников,
          align: 'right',
          characterSpacing: STYLES.spacing.characterSpacing
        });

        // ФОТ
        const фот = row['Сумма по полю ФОТ'];
        console.log('Значение ФОТ из БД для записи', row.код_окэд, ':', фот, typeof фот);
        
        if (фот !== null && фот !== undefined) {
          const фотValue = Number(фот);
          if (!isNaN(фотValue)) {
            doc.text(formatNumber(фотValue), positions.фот, tableY, { 
              width: STYLES.table.columns['Сумма по полю ФОТ'],
              align: 'right',
              characterSpacing: STYLES.spacing.characterSpacing
            });
          } else {
            doc.text('-', positions.фот, tableY, { 
              width: STYLES.table.columns['Сумма по полю ФОТ'],
              align: 'right',
              characterSpacing: STYLES.spacing.characterSpacing
            });
          }
        } else {
          doc.text('-', positions.фот, tableY, { 
            width: STYLES.table.columns['Сумма по полю ФОТ'],
            align: 'right',
            characterSpacing: STYLES.spacing.characterSpacing
          });
        }

        // Средняя зарплата
        const срЗп = row.Сумма_по_полю_ср_зп;
        if (срЗп !== null && срЗп !== undefined) {
          const срЗпValue = Number(срЗп);
          if (!isNaN(срЗпValue)) {
            doc.text(formatNumber(срЗпValue), positions.ср_зп, tableY, { 
              width: STYLES.table.columns.Сумма_по_полю_ср_зп,
              align: 'right',
              characterSpacing: STYLES.spacing.characterSpacing
            });
          } else {
            doc.text('-', positions.ср_зп, tableY, { 
              width: STYLES.table.columns.Сумма_по_полю_ср_зп,
              align: 'right',
              characterSpacing: STYLES.spacing.characterSpacing
            });
          }
        } else {
          doc.text('-', positions.ср_зп, tableY, { 
            width: STYLES.table.columns.Сумма_по_полю_ср_зп,
            align: 'right',
            characterSpacing: STYLES.spacing.characterSpacing
          });
        }

        // Обновляем позицию для следующей строки
        tableY += rowTotalHeight;

        // Добавляем разделитель после каждой строки
        doc.moveTo(STYLES.table.startX, tableY)
           .lineTo(STYLES.table.startX + STYLES.table.width, tableY)
           .lineWidth(0.25)
           .stroke();
        
        tableY += 5;
        currentRowIndex++;
      }

      // Добавляем нижнюю линию таблицы
      doc.moveTo(STYLES.table.startX, tableY)
         .lineTo(STYLES.table.startX + STYLES.table.width, tableY)
         .lineWidth(1)
         .stroke();
      tableY += 10; // Добавляем небольшой отступ перед сводкой
      
      // Сводная информация
      doc.moveDown();
      doc.fontSize(12)
         .font('PTSans-Bold')
         .text('Сводная информация по выбранным записям:', STYLES.table.startX, tableY, {
             underline: true
         });

      // Добавляем небольшой отступ после заголовка
      tableY = doc.y + 5; // Уменьшаем отступ с 10 до 5 пунктов

      // Вычисляем общие значения
      const totalNP = records.reduce((sum, r) => {
          const value = Number(r.количество_нп);
          return sum + (isNaN(value) ? 0 : value);
      }, 0);

      const totalWorkers = records.reduce((sum, r) => {
          const value = Number(r.средняя_численность_работников);
          return sum + (isNaN(value) ? 0 : value);
      }, 0);

      const totalFOT = records.reduce((sum, r) => {
          const value = Number(r['Сумма по полю ФОТ']);
          return sum + (isNaN(value) ? 0 : value);
      }, 0);

      // Берем среднюю зарплату напрямую из БД
      const avgSalary = records.reduce((sum, r) => {
          const value = Number(r.Сумма_по_полю_ср_зп);
          return sum + (isNaN(value) ? 0 : value);
      }, 0) / records.length;

      const totalTaxes = records.reduce((sum, r) => {
          const value = Number(r.сумма_налогов);
          return sum + (isNaN(value) ? 0 : value);
      }, 0);

      // Формируем и выводим сводную информацию одним блоком с отступом слева
      doc.font('PTSans')
         .text(
             `Общее количество НП: ${formatNumber(totalNP)}\n` +
             `Общая численность работников: ${formatNumber(totalWorkers)}\n` +
             `Общий фонд оплаты труда: ${formatNumber(Math.round(totalFOT))} тг.\n` +
             `Средняя заработная плата: ${formatNumber(Math.round(avgSalary))} тг.\n` +
             `Общая сумма налогов: ${formatNumber(Math.round(totalTaxes))} тг.`,
             STYLES.table.startX,
             tableY,
             {
                 align: 'left',
                 width: STYLES.table.width
             }
         );

      // Добавляем дату генерации
      doc.moveDown(2);
    }

    // Завершаем документ
    if (!res.headersSent) {
    doc.end();
    }
  } catch (error) {
    console.error('Ошибка при генерации PDF:', error);
    console.error('Стек вызовов:', error.stack);
    if (!res.headersSent) {
    res.status(500).json({ 
      message: 'Ошибка при генерации PDF', 
      error: error.message,
      stack: error.stack
    });
    }
  }
};

exports.generateDetailPdf = async (req, res) => {
  try {
    console.log('Начало генерации детального PDF отчета...');
    const { id } = req.params;
    console.log('ID записи:', id);
    
    // Проверяем наличие и валидность шрифтов перед генерацией PDF
    validateFonts();
    
    // Получаем данные конкретной записи
    console.log('Выполняем запрос к базе данных...');
    const record = await Сводная.findByPk(id);
    
    if (!record) {
      console.log('Запись не найдена');
      return res.status(404).json({ message: 'Запись не найдена' });
    }
    
    console.log('Запись найдена, начинаем генерацию PDF');
    console.log('Данные записи:', {
      код_окэд: record.код_окэд,
      вид_деятельности: record.вид_деятельности
    });
    
    // Создаем PDF документ с поддержкой кириллицы
    const doc = createPdfDocument();

    // Настраиваем заголовки для скачивания
    res.setHeader('Content-Type', 'application/pdf; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(`detail-report-${record.код_окэд.replace(/[\/\\]/g, '-')}-${Date.now()}.pdf`)}`);

    // Направляем PDF прямо в response
    doc.pipe(res);
    
    // Оформление заголовка
    doc.font('PTSans-Bold')
       .fontSize(STYLES.fontSize.title)
       .text(processText(`Детальная информация: ${record.вид_деятельности}`), {
      align: 'center',
      underline: true
    });
    doc.moveDown();
    
    // Дата создания
    const now = new Date();
    doc.font('PTSans')
       .fontSize(STYLES.fontSize.small)
       .text(processText(`Дата создания: ${now.toLocaleDateString()} ${now.toLocaleTimeString()}`), {
      align: 'right'
    });
    doc.moveDown(2);
    
    // Информация о записи в виде таблицы
    let y = doc.y;
    
    // Функция для добавления строки таблицы
    const addTableRow = (label, value, format = null) => {
      doc.font('PTSans')
         .fontSize(STYLES.fontSize.text)
         .text(processText(label), startX, y, { width: labelWidth, continued: false });
      const displayValue = format ? format(value) : processText(value);
      doc.text(displayValue, startX + labelWidth + 10, y, { width: valueWidth - 10 });
      y += 20;
    };
    
    // Добавляем данные
    addTableRow('Код ОКЭД:', record.код_окэд);
    addTableRow('Вид деятельности:', record.вид_деятельности);
    y += 10; // Добавляем дополнительный отступ после вида деятельности
    addTableRow('Количество НП:', record.количество_нп, formatNumber);
    addTableRow('Средняя численность работников:', record.средняя_численность_работников, formatNumber);
    addTableRow('Сумма по полю ФОТ:', record['Сумма по полю ФОТ'], (val) => formatNumber(Math.round(val)) + ' тг.');
    addTableRow('Средняя зарплата:', record.Сумма_по_полю_ср_зп, (val) => formatNumber(Math.round(val)) + ' тг.');
    addTableRow('Сумма налогов:', record.сумма_налогов, (val) => formatNumber(Math.round(val)) + ' тг.');
    addTableRow('Удельный вес:', record.удельный_вес, (val) => val + '%');
    addTableRow('Дата создания записи:', new Date(record.createdAt).toLocaleString());
    addTableRow('Дата обновления записи:', new Date(record.updatedAt).toLocaleString());
    
    // Добавляем разделительную линию
    doc.moveTo(50, y).lineTo(550, y).stroke();
    
    // Завершаем документ
    doc.end();
  } catch (error) {
    console.error('Ошибка при генерации детального PDF:', error);
    console.error('Стек вызовов:', error.stack);
    res.status(500).json({ 
      message: 'Ошибка при генерации PDF', 
      error: error.message,
      stack: error.stack
    });
  }
};

exports.generateMultipleDetailPdf = async (req, res) => {
  try {
    console.log('Начало генерации PDF для нескольких записей');
    const { ids } = req.body;
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: 'Необходимо предоставить массив идентификаторов записей' });
    }
    
    // Получаем данные выбранных записей
    const records = await Сводная.findAll({
      where: {
        id: {
          [Op.in]: ids
        }
      },
      order: [['код_окэд', 'ASC']],
      charset: 'utf8'
    });
    
    if (records.length === 0) {
      return res.status(404).json({ message: 'Записи не найдены' });
    }
    
    // Создаем PDF документ
    const doc = createPdfDocument();

    // Настраиваем заголовки для скачивания
    res.setHeader('Content-Type', 'application/pdf; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(`multi-report-${Date.now()}.pdf`)}`);

    // Направляем PDF в response
    doc.pipe(res);
    
    // Оформление заголовка
    doc.font('PTSans-Bold')
       .fontSize(STYLES.fontSize.title)
       .text(processText(`Отчет по выбранным записям (${records.length})`), {
      align: 'center',
      underline: true
    });
    doc.moveDown();
    
    // Дата создания
    const now = new Date();
    doc.font('PTSans')
       .fontSize(STYLES.fontSize.text)
       .text(processText(`Дата создания: ${now.toLocaleDateString()} ${now.toLocaleTimeString()}`), {
      align: 'right'
    });
    doc.moveDown();

    // Генерируем диаграммы для всех показателей
    const chartDataWorkers = prepareChartData(records);
    
    // Генерируем данные для средней зарплаты
    const chartDataSalary = records.map(row => ({
      name: row.вид_деятельности.length > 30 
        ? row.вид_деятельности.substring(0, 30) + '...'
        : row.вид_деятельности,
      value: Number(row.Сумма_по_полю_ср_зп || 0)
    })).sort((a, b) => b.value - a.value).slice(0, 10);

    // Генерируем данные для ФОТ
    const chartDataFOT = records.map(row => ({
      name: row.вид_деятельности.length > 30 
        ? row.вид_деятельности.substring(0, 30) + '...'
        : row.вид_деятельности,
      value: Number(row['Сумма по полю ФОТ'] || 0)
    })).sort((a, b) => b.value - a.value).slice(0, 10);

    // Генерируем все диаграммы
    const [barChartWorkers, pieChartWorkers, barChartSalary, pieChartSalary, barChartFOT, pieChartFOT] = await Promise.all([
      generateBarChart(chartDataWorkers, 'Распределение численности работников', 'Численность работников'),
      generatePieChart(chartDataWorkers, 'Распределение численности работников'),
      generateBarChart(chartDataSalary, 'Распределение средней заработной платы', 'Средняя заработная плата'),
      generatePieChart(chartDataSalary, 'Распределение средней заработной платы'),
      generateBarChart(chartDataFOT, 'Распределение фонда оплаты труда', 'ФОТ'),
      generatePieChart(chartDataFOT, 'Распределение фонда оплаты труда')
    ]);

    // Добавляем диаграммы численности работников
    doc.fontSize(14).font('PTSans-Bold').text('Диаграммы распределения численности работников', {
      align: 'center'
    });
    doc.moveDown();
    
    doc.image(barChartWorkers, {
      fit: [500, 250],
      align: 'center'
    });
    doc.moveDown();
    
    doc.image(pieChartWorkers, {
      fit: [500, 250],
      align: 'center'
    });
    doc.moveDown();

    // Добавляем диаграммы средней заработной платы
    doc.addPage();
    doc.fontSize(14).font('PTSans-Bold').text('Диаграммы распределения средней заработной платы', {
      align: 'center'
    });
    doc.moveDown();
    
    doc.image(barChartSalary, {
      fit: [500, 250],
      align: 'center'
    });
    doc.moveDown();
    
    doc.image(pieChartSalary, {
      fit: [500, 250],
      align: 'center'
    });
    doc.moveDown();

    // Добавляем диаграммы ФОТ
    doc.addPage();
    doc.fontSize(14).font('PTSans-Bold').text('Диаграммы распределения фонда оплаты труда', {
      align: 'center'
    });
    doc.moveDown();
    
    doc.image(barChartFOT, {
      fit: [500, 250],
      align: 'center'
    });
    doc.moveDown();
    
    doc.image(pieChartFOT, {
      fit: [500, 250],
      align: 'center'
    });
    doc.moveDown();

    // Добавляем новую страницу для таблицы
    doc.addPage();

    // Добавляем информацию о количестве записей
    doc.fontSize(STYLES.fontSize.text)
       .text(processText(`Всего записей: ${records.length}`), {
      align: 'left',
         characterSpacing: STYLES.spacing.characterSpacing
    });
    doc.moveDown();

    // Инициализируем переменные для таблицы
    let tableY = doc.y;
    let currentRowIndex = 0;
    const tableAvailableHeight = doc.page.height - pageMargin - footerHeight;

    // Отрисовка заголовков таблицы через общую функцию
    tableY = drawTableHeaders(doc, tableY);

    // Рисуем данные таблицы
    for (const row of records) {
      // Добавляем отладочное логирование
      console.log('Данные записи:', {
        код_окэд: row.код_окэд,
        фот: row.getDataValue ? row.getDataValue('Сумма по полю ФОТ') : row['Сумма по полю ФОТ'],
        тип_фот: typeof (row.getDataValue ? row.getDataValue('Сумма по полю ФОТ') : row['Сумма по полю ФОТ']),
        ср_зп: row.Сумма_по_полю_ср_зп
      });

      // Вычисляем высоту текущей записи
      let деятельность = processText(row.вид_деятельности);
      const linesCount = Math.ceil(деятельность.length / 22);
      const estimatedHeight = Math.max(20, linesCount * 12 + 10);
      
      // Обрабатываем длинные названия с добавлением переносов
      let lines = [];
      let words = деятельность.split(' ');
      let currentLine = '';
      const maxLineLength = 20;
      
      for (let word of words) {
        word = word.trim();
        if (!word) continue;
        
        if (word.length > maxLineLength) {
          if (currentLine) {
            lines.push(currentLine.trim());
            currentLine = '';
          }
          
          while (word.length > maxLineLength - 1) {
            const breakPoint = maxLineLength - 1;
            lines.push(word.substring(0, breakPoint) + '-');
            word = word.substring(breakPoint);
          }
          currentLine = word;
        } else {
          if (!currentLine) {
            currentLine = word;
          } else if ((currentLine + ' ' + word).length <= maxLineLength) {
            currentLine += ' ' + word;
          } else {
            lines.push(currentLine.trim());
            currentLine = word;
          }
        }
      }
      
      if (currentLine) {
        lines.push(currentLine.trim());
      }

      const extraPadding = Math.max(0, lines.length - 1) * 2;
      const totalHeight = Math.max(lines.length * lineHeight + extraPadding, minHeight);
      let rowTotalHeight = totalHeight + 8;

      // Проверяем необходимость новой страницы
      if (tableY + rowTotalHeight > doc.page.height - footerHeight - 20) {
        if (currentRowIndex < records.length - 1) {
        doc.addPage();
          tableY = pageMargin;
          tableY = drawTableHeaders(doc, tableY);
        }
      }

      const positions = calculatePositions();

      // Код ОКЭД
      doc.text(processText(row.код_окэд), positions.код_окэd, tableY, { 
        width: STYLES.table.columns.код_окэд,
        align: 'left',
        characterSpacing: STYLES.spacing.characterSpacing
      });

      // Вид деятельности
      doc.text(lines.join('\n'), positions.вид_деятельности, tableY, { 
        width: STYLES.table.columns.вид_деятельности,
        align: 'left',
        characterSpacing: STYLES.spacing.characterSpacing,
        lineGap: 0,
        paragraphGap: 0
      });

      // Количество
      doc.text(formatNumber(row.количество_нп || 0), positions.количество_нп, tableY, { 
        width: STYLES.table.columns.количество_нп,
        align: 'right',
        characterSpacing: STYLES.spacing.characterSpacing
      });

      // Численность
      const численность = parseFloat(row.средняя_численность_работников) || 0;
      doc.text(formatNumber(численность), positions.численность, tableY, { 
        width: STYLES.table.columns.средняя_численность_работников,
        align: 'right',
        characterSpacing: STYLES.spacing.characterSpacing
      });

      // ФОТ
      const фот = row['Сумма по полю ФОТ'];
      console.log('Значение ФОТ из БД для записи', row.код_окэд, ':', фот, typeof фот);
      
      if (фот !== null && фот !== undefined) {
        const фотValue = Number(фот);
        if (!isNaN(фотValue)) {
          doc.text(formatNumber(фотValue), positions.фот, tableY, { 
            width: STYLES.table.columns['Сумма по полю ФОТ'],
            align: 'right',
            characterSpacing: STYLES.spacing.characterSpacing
          });
        } else {
          doc.text('-', positions.фот, tableY, { 
            width: STYLES.table.columns['Сумма по полю ФОТ'],
            align: 'right',
            characterSpacing: STYLES.spacing.characterSpacing
          });
        }
      } else {
        doc.text('-', positions.фот, tableY, { 
          width: STYLES.table.columns['Сумма по полю ФОТ'],
          align: 'right',
          characterSpacing: STYLES.spacing.characterSpacing
        });
      }

      // Средняя зарплата
      const срЗп = row.Сумма_по_полю_ср_зп;
      if (срЗп !== null && срЗп !== undefined) {
        const срЗпValue = Number(срЗп);
        if (!isNaN(срЗпValue)) {
          doc.text(formatNumber(срЗпValue), positions.ср_зп, tableY, { 
            width: STYLES.table.columns.Сумма_по_полю_ср_зп,
            align: 'right',
            characterSpacing: STYLES.spacing.characterSpacing
          });
        } else {
          doc.text('-', positions.ср_зп, tableY, { 
            width: STYLES.table.columns.Сумма_по_полю_ср_зп,
            align: 'right',
            characterSpacing: STYLES.spacing.characterSpacing
          });
        }
      } else {
        doc.text('-', positions.ср_зп, tableY, { 
          width: STYLES.table.columns.Сумма_по_полю_ср_зп,
          align: 'right',
          characterSpacing: STYLES.spacing.characterSpacing
        });
      }

      // Обновляем позицию для следующей строки
      tableY += rowTotalHeight;

      // Добавляем разделитель после каждой строки
      doc.moveTo(STYLES.table.startX, tableY)
         .lineTo(STYLES.table.startX + STYLES.table.width, tableY)
         .lineWidth(0.25)
         .stroke();
      
      tableY += 5;
      currentRowIndex++;
    }

    // Добавляем нижнюю линию таблицы
    doc.moveTo(STYLES.table.startX, tableY)
       .lineTo(STYLES.table.startX + STYLES.table.width, tableY)
       .lineWidth(1)
       .stroke();
    tableY += 10; // Добавляем небольшой отступ перед сводкой
    
    // Сводная информация
    doc.moveDown();
    doc.fontSize(12)
       .font('PTSans-Bold')
       .text('Сводная информация по выбранным записям:', STYLES.table.startX, tableY, {
           underline: true
       });

    // Добавляем небольшой отступ после заголовка
    tableY = doc.y + 5; // Уменьшаем отступ с 10 до 5 пунктов

    // Вычисляем общие значения
    const totalNP = records.reduce((sum, r) => {
        const value = Number(r.количество_нп);
        return sum + (isNaN(value) ? 0 : value);
    }, 0);

    const totalWorkers = records.reduce((sum, r) => {
        const value = Number(r.средняя_численность_работников);
        return sum + (isNaN(value) ? 0 : value);
    }, 0);

    const totalFOT = records.reduce((sum, r) => {
        const value = Number(r['Сумма по полю ФОТ']);
        return sum + (isNaN(value) ? 0 : value);
    }, 0);

    // Берем среднюю зарплату напрямую из БД
    const avgSalary = records.reduce((sum, r) => {
        const value = Number(r.Сумма_по_полю_ср_зп);
        return sum + (isNaN(value) ? 0 : value);
    }, 0) / records.length;

    const totalTaxes = records.reduce((sum, r) => {
        const value = Number(r.сумма_налогов);
        return sum + (isNaN(value) ? 0 : value);
    }, 0);

    // Формируем и выводим сводную информацию одним блоком с отступом слева
    doc.font('PTSans')
       .text(
           `Общее количество НП: ${formatNumber(totalNP)}\n` +
           `Общая численность работников: ${formatNumber(totalWorkers)}\n` +
           `Общий фонд оплаты труда: ${formatNumber(Math.round(totalFOT))} тг.\n` +
           `Средняя заработная плата: ${formatNumber(Math.round(avgSalary))} тг.\n` +
           `Общая сумма налогов: ${formatNumber(Math.round(totalTaxes))} тг.`,
           STYLES.table.startX,
           tableY,
           {
               align: 'left',
               width: STYLES.table.width
           }
       );

    // Добавляем дату генерации
    doc.moveDown(2);

    // Завершаем документ
    doc.end();
  } catch (error) {
    console.error('Ошибка при генерации PDF:', error);
    console.error('Стек вызовов:', error.stack);
    if (!res.headersSent) {
    res.status(500).json({ 
      message: 'Ошибка при генерации PDF', 
      error: error.message,
      stack: error.stack
    });
    }
  }
}; 