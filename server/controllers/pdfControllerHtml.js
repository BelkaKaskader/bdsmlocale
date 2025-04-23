const PDFDocument = require('pdfkit');
const { Сводная } = require('../models');
const { Op } = require('sequelize');
const path = require('path');
const fs = require('fs');
const iconv = require('iconv-lite');
const moment = require('moment');
const { ChartJSNodeCanvas } = require('chartjs-node-canvas');

// Функция для проверки наличия шрифта
function getFontPath(fontName) {
    const fontPath = path.join(__dirname, '../fonts', fontName);
    console.log('Проверка шрифта:', fontName);
    console.log('Полный путь к шрифту:', fontPath);
    if (fs.existsSync(fontPath)) {
        console.log('Шрифт найден:', fontPath);
        return fontPath;
    }
    console.warn(`Шрифт ${fontName} не найден по пути ${fontPath}`);
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

// Функция для создания круговой диаграммы
async function createPieChart(data, width = 600, height = 400, title = 'Распределение численности работников (топ-10)') {
    const chartCallback = (ChartJS) => {
        ChartJS.defaults.font.family = 'DejaVuSans';
        ChartJS.defaults.color = '#666';
    };

    const chartJSNodeCanvas = new ChartJSNodeCanvas({ width, height, chartCallback });
    
    const configuration = {
        type: 'pie',
        data: {
            labels: data.labels,
            datasets: [{
                data: data.values,
                backgroundColor: [
                    '#1E88E5', // синий
                    '#00BFA5', // бирюзовый
                    '#FFC107', // желтый
                    '#FF7043', // оранжевый
                    '#9575CD', // фиолетовый
                    '#4CAF50', // зеленый
                    '#F06292', // розовый
                    '#00ACC1', // голубой
                    '#FF5252', // красный
                    '#78909C'  // серый
                ]
            }]
        },
        options: {
            plugins: {
                title: {
                    display: true,
                    text: title,
                    font: {
                        size: 16
                    }
                },
                legend: {
                    position: 'right',
                    labels: {
                        boxWidth: 15,
                        padding: 15,
                        font: {
                            size: 11
                        }
                    }
                }
            }
        }
    };

    return await chartJSNodeCanvas.renderToBuffer(configuration);
}

// Функция для создания столбчатой диаграммы
async function createBarChart(data, width = 800, height = 400, title = 'Аналитика по видам деятельности (топ-10)') {
    const chartCallback = (ChartJS) => {
        ChartJS.defaults.font.family = 'DejaVuSans';
        ChartJS.defaults.color = '#666';
    };

    const chartJSNodeCanvas = new ChartJSNodeCanvas({ width, height, chartCallback });
    
    const configuration = {
        type: 'bar',
        data: {
            labels: data.labels,
            datasets: [{
                data: data.values,
                backgroundColor: '#9FA8DA',
                barPercentage: 0.6
            }]
        },
        options: {
            indexAxis: 'y',
            plugins: {
                title: {
                    display: true,
                    text: title,
                    font: {
                        size: 16
                    }
                },
                legend: {
                    display: false
                }
            },
            scales: {
                x: {
                    grid: {
                        color: '#E0E0E0',
                        drawBorder: false
                    },
                    ticks: {
                        font: {
                            size: 11
                        }
                    }
                },
                y: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        font: {
                            size: 11
                        }
                    }
                }
            }
        }
    };

    return await chartJSNodeCanvas.renderToBuffer(configuration);
}

const generatePdf = async (req, res) => {
    try {
        console.log('Начало генерации PDF отчета...');
        
        const records = await Сводная.findAll();
        if (!records || records.length === 0) {
            return res.status(404).send('Нет данных для генерации PDF');
        }

        // Подготовка данных для диаграмм по численности работников (топ-10)
        const topByEmployees = [...records] // Создаем копию массива для сортировки
            .sort((a, b) => b.средняя_численность_работников - a.средняя_численность_работников)
            .slice(0, 10);

        const employeesChartData = {
            labels: topByEmployees.map(r => r.вид_деятельности.length > 40 
                ? r.вид_деятельности.slice(0, 40) + '...' 
                : r.вид_деятельности),
            values: topByEmployees.map(r => r.средняя_численность_работников)
        };

        // Подготовка данных для диаграмм по ФОТ (топ-10)
        const topByFOT = [...records] // Создаем копию массива для сортировки
            .sort((a, b) => b['Сумма по полю ФОТ'] - a['Сумма по полю ФОТ'])
            .slice(0, 10);

        const fotChartData = {
            labels: topByFOT.map(r => r.вид_деятельности.length > 40 
                ? r.вид_деятельности.slice(0, 40) + '...' 
                : r.вид_деятельности),
            values: topByFOT.map(r => r['Сумма по полю ФОТ'])
        };

        // Подготовка данных для диаграмм по средней ЗП (топ-10)
        const topByAvgSalary = [...records] // Создаем копию массива для сортировки
            .sort((a, b) => b.Сумма_по_полю_ср_зп - a.Сумма_по_полю_ср_зп)
            .slice(0, 10);

        const avgSalaryChartData = {
            labels: topByAvgSalary.map(r => r.вид_деятельности.length > 40 
                ? r.вид_деятельности.slice(0, 40) + '...' 
                : r.вид_деятельности),
            values: topByAvgSalary.map(r => r.Сумма_по_полю_ср_зп)
        };

        // Создаем диаграммы
        const employeesBarChartBuffer = await createBarChart(employeesChartData, 800, 400, 'Аналитика по численности работников (топ-10)');
        const employeesPieChartBuffer = await createPieChart(employeesChartData, 600, 400, 'Распределение численности работников (топ-10)');
        
        const fotBarChartBuffer = await createBarChart(fotChartData, 800, 400, 'Аналитика по фонду оплаты труда (топ-10)');
        const fotPieChartBuffer = await createPieChart(fotChartData, 600, 400, 'Распределение по фонду оплаты труда (топ-10)');
        
        const avgSalaryBarChartBuffer = await createBarChart(avgSalaryChartData, 800, 400, 'Аналитика по средней заработной плате (топ-10)');
        const avgSalaryPieChartBuffer = await createPieChart(avgSalaryChartData, 600, 400, 'Распределение по средней заработной плате (топ-10)');

        // Создаем PDF документ
        const doc = new PDFDocument({
            size: 'A4',
            layout: 'portrait',
            margins: {
                top: 50,
                bottom: 50,
                left: 50,
                right: 50
            },
            bufferPages: true
        });

        // Собираем PDF в буфер
        const chunks = [];
        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end', () => {
            const pdfBuffer = Buffer.concat(chunks);
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Length', pdfBuffer.length);
            res.setHeader('Content-Disposition', 'attachment; filename=report.pdf');
            res.send(pdfBuffer);
        });

        // Регистрируем шрифты
        const regularFont = getFontPath('DejaVuSans.ttf');
        const boldFont = getFontPath('DejaVuSans-Bold.ttf');
        
        if (regularFont) doc.registerFont('DejaVuSans', regularFont);
        if (boldFont) doc.registerFont('DejaVuSans-Bold', boldFont);

        // Заголовок отчета
        doc.font('DejaVuSans-Bold')
           .fontSize(16)
           .text('Отчет по данным "Сводная"', { align: 'center', underline: true });

        doc.moveDown(1); // Увеличиваем отступ между заголовком и датой

        // Дата создания
        doc.font('DejaVuSans')
           .fontSize(10)
           .text(`Дата создания: ${moment().format('DD.MM.YYYY HH:mm:ss')}`, { align: 'right' });

        doc.moveDown(2); // Увеличиваем отступ перед количеством записей
        doc.text(`Всего записей: ${records.length}`);
        
        doc.moveDown(3); // Увеличиваем отступ перед диаграммами

        // Добавляем диаграммы по численности работников
        doc.image(employeesBarChartBuffer, {
            fit: [500, 300],
            align: 'center'
        });

        doc.moveDown();

        doc.image(employeesPieChartBuffer, {
            fit: [500, 300],
            align: 'center'
        });

        // Добавляем диаграммы по ФОТ
        doc.addPage();

        doc.image(fotBarChartBuffer, {
            fit: [500, 300],
            align: 'center'
        });

        doc.moveDown();

        doc.image(fotPieChartBuffer, {
            fit: [500, 300],
            align: 'center'
        });

        // Добавляем диаграммы по средней ЗП
        doc.addPage();

        doc.image(avgSalaryBarChartBuffer, {
            fit: [500, 300],
                align: 'center'
           });

        doc.moveDown();

        doc.image(avgSalaryPieChartBuffer, {
            fit: [500, 300],
            align: 'center'
        });

        // Добавляем таблицу с данными (используем оригинальный массив records без сортировки)
        doc.addPage();

        // Создаем таблицу с данными
        const tableWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
        const headers = [
            { label: 'Код ОКЭД', width: 60 },
            { label: 'Вид деятельности', width: 130 },
            { label: 'Кол-во', width: 55, align: 'right' },
            { label: 'Числ.', width: 65, align: 'right' },
            { label: 'ФОТ', width: 90, align: 'right' },
            { label: 'Ср. ЗП', width: 85, align: 'right' }
        ];

        // Рисуем заголовки таблицы
        let startX = doc.page.margins.left;
        let currentY = doc.page.margins.top;

        // Заголовки таблицы
        doc.font('DejaVuSans')
           .fontSize(8);
        
        headers.forEach(header => {
            doc.text(
                header.label,
                startX,
                currentY,
                {
                    width: header.width,
                    align: header.align || 'left'
                }
            );
            startX += header.width;
        });

        currentY += 15;

        // Рисуем линию под заголовками
        startX = doc.page.margins.left;
        doc.moveTo(startX, currentY)
           .lineTo(doc.page.width - doc.page.margins.right, currentY)
           .lineWidth(0.5)
           .stroke();

        currentY += 10;

        // Выводим данные
        doc.font('DejaVuSans').fontSize(8);
        records.forEach((record, index) => {
            let maxHeight = 0;
            startX = doc.page.margins.left;
            const row = [
                record.код_окэд,
                record.вид_деятельности,
                formatNumber(record.количество_нп),
                formatNumber(record.средняя_численность_работников),
                formatNumber(record['Сумма по полю ФОТ']),
                formatNumber(record.Сумма_по_полю_ср_зп)
            ];

            // Вычисляем максимальную высоту для текущей строки
            headers.forEach((header, i) => {
                const text = row[i].toString();
                const textOptions = {
                    width: header.width - (header.align === 'right' ? 5 : 10),
                    align: header.align || 'left',
                    lineBreak: true,
                    height: 100 // Увеличиваем максимальную высоту для переноса
                };
                const cellHeight = doc.heightOfString(text, textOptions);
                maxHeight = Math.max(maxHeight, cellHeight);
            });

            // Проверяем, поместится ли следующая строка на текущей странице
            if (currentY + maxHeight > doc.page.height - doc.page.margins.bottom) {
                doc.addPage();
                currentY = doc.page.margins.top;
                startX = doc.page.margins.left;

                // Повторяем заголовки на новой странице
                headers.forEach(header => {
                    doc.text(
                        header.label,
                        startX,
                        currentY,
                        {
                            width: header.width,
                            align: header.align || 'left'
                        }
                    );
                    startX += header.width;
                });

                currentY += 15;
                doc.moveTo(doc.page.margins.left, currentY)
                   .lineTo(doc.page.width - doc.page.margins.right, currentY)
                   .lineWidth(0.5)
                   .stroke();
                currentY += 10;
            }

            // Выводим строку данных
            startX = doc.page.margins.left;
            headers.forEach((header, i) => {
                doc.text(
                    row[i].toString(),
                    startX,
                    currentY,
                    {
                        width: header.width - (header.align === 'right' ? 5 : 10),
                        align: header.align || 'left',
                        lineBreak: true,
                        height: 100 // Увеличиваем максимальную высоту для переноса
                    }
                );
                startX += header.width;
            });

            // Рисуем линию после каждой записи
            doc.moveTo(doc.page.margins.left, currentY + maxHeight + 5)
               .lineTo(doc.page.width - doc.page.margins.right, currentY + maxHeight + 5)
               .lineWidth(0.5)
               .stroke();

            currentY += maxHeight + 10;
        });

        doc.end();

    } catch (error) {
        console.error('Ошибка при генерации PDF:', error);
        res.status(500).send('Ошибка при генерации PDF');
    }
};

const generateDetailPdf = async (req, res) => {
    try {
        const records = await Сводная.findAll({
            where: {
                id: {
                    [Op.in]: req.params.id.split(',')
                }
            }
        });
        
        if (!records || records.length === 0) {
            return res.status(404).send('Записи не найдены');
        }

        const doc = new PDFDocument({
            size: 'A4',
            margin: 50,
            autoFirstPage: true
        });

        // Устанавливаем шрифт с поддержкой кириллицы
        doc.registerFont('DejaVuSans', path.join(__dirname, '../fonts/DejaVuSans.ttf'));
        doc.registerFont('DejaVuSans-Bold', path.join(__dirname, '../fonts/DejaVuSans-Bold.ttf'));
        doc.font('DejaVuSans');

        // Заголовок
        doc.fontSize(16);
        doc.text('Детальный отчет', {
            align: 'center'
        });
        doc.moveDown();

        // Информация о записях
        doc.fontSize(12);
        records.forEach((record, index) => {
            if (index > 0) doc.moveDown();
        doc.text(`Код ОКЭД: ${record.код_окэд}`);
        doc.text(`Вид деятельности: ${record.вид_деятельности}`);
        doc.text(`Количество НП: ${formatNumber(record.количество_нп)}`);
        doc.text(`Средняя численность работников: ${formatNumber(record.средняя_численность_работников)}`);
            doc.text(`Сумма ФОТ: ${formatNumber(record['Сумма по полю ФОТ'])} тг.`);
            doc.text(`Средняя заработная плата: ${formatNumber(record.Сумма_по_полю_ср_зп)} тг.`);
        });

        // Добавляем двойную линию перед сводной информацией
        doc.moveDown();
        doc.moveTo(doc.page.margins.left, doc.y)
           .lineTo(doc.page.width - doc.page.margins.right, doc.y)
           .lineWidth(2)
           .stroke();

        // Сводная информация
        doc.moveDown();
        doc.fontSize(12)
           .font('DejaVuSans-Bold')
           .text('Сводная информация по выбранным записям:', {
               underline: true
           });

        // Вычисляем общие значения
        const totalNP = records.reduce((sum, r) => sum + (r.количество_нп || 0), 0);
        const totalWorkers = records.reduce((sum, r) => sum + (r.средняя_численность_работников || 0), 0);
        const totalFOT = records.reduce((sum, r) => sum + (r['Сумма по полю ФОТ'] || 0), 0);
        const avgSalary = totalWorkers > 0 ? totalFOT / totalWorkers : 0;
        const totalTaxes = records.reduce((sum, r) => sum + (r.сумма_налогов || 0), 0);

        // Формируем весь текст сводной информации в одной строке
        const summaryText = 
            `Общее количество НП: ${formatNumber(totalNP)}\n` +
            `Общая численность работников: ${formatNumber(totalWorkers)}\n` +
            `Общий фонд оплаты труда: ${formatNumber(totalFOT)} тг.\n` +
            `Средняя заработная плата: ${formatNumber(avgSalary)} тг.\n` +
            `Общая сумма налогов: ${formatNumber(totalTaxes)} тг.`;

        // Выводим весь текст одним блоком
        doc.font('DejaVuSans')
           .text(summaryText);

        // Добавляем дату генерации
        doc.moveDown(2);
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