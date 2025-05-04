require('dotenv').config();
const { Pool } = require('pg');
const XLSX = require('xlsx');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');

// Чтение конфигурации из .env файла
const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

// Функция для преобразования даты из Excel в формат PostgreSQL
function excelDateToJSDate(excelDate) {
  // Если дата уже в формате строки, возвращаем её
  if (typeof excelDate === 'string') {
    return excelDate;
  }
  
  // Если дата - это число (Excel формат)
  if (typeof excelDate === 'number') {
    // Excel использует 1 января 1900 как начальную дату
    // Но есть ошибка в Excel, где 1900 год считается високосным
    // Поэтому нужно вычесть 2 дня
    const millisecondsPerDay = 24 * 60 * 60 * 1000;
    const date = new Date((excelDate - 25569) * millisecondsPerDay);
    
    // Форматируем дату в формат YYYY-MM-DD
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  }
  
  // Если дата - это объект Date
  if (excelDate instanceof Date) {
    const year = excelDate.getFullYear();
    const month = String(excelDate.getMonth() + 1).padStart(2, '0');
    const day = String(excelDate.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  }
  
  // Если что-то другое, возвращаем текущую дату
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}

// Функция для импорта данных из Excel
async function importFromExcel(excelFilePath) {
    try {
        console.log(`\n=== Начало импорта данных из файла: ${excelFilePath} ===`);
        
        // Читаем Excel файл
        const workbook = XLSX.readFile(excelFilePath);
        const sheetName = workbook.SheetNames[0];
        console.log(`Имя листа: ${sheetName}`);
        
        const worksheet = workbook.Sheets[sheetName];
        
        // Явно задаём названия столбцов
        const headers = [
            'Код ОКЭД',
            'Вид деятельности',
            'Количество НП',
            'средняя численность работников',
            'Сумма по полю ФОТ',
            'Сумма по полю ср.зп',
            'ИПН',
            'СН',
            'Сумма налогов',
            'Удельный вес %'
        ];
        // Автоматическое определение первой строки с данными
        let dataStartRow = 3; // по умолчанию пропускаем 3 строки
        const rangeRef = worksheet['!ref'];
        if (rangeRef) {
            const range = XLSX.utils.decode_range(rangeRef);
            for (let r = 3; r <= range.e.r; r++) {
                const cell = worksheet[XLSX.utils.encode_cell({ r, c: 0 })];
                if (cell && cell.v && !isNaN(Number(cell.v))) {
                    dataStartRow = r;
                    break;
                }
            }
        }
        // Читаем только данные, начиная с первой строки с данными
        const rawData = XLSX.utils.sheet_to_json(worksheet, {
            header: headers,
            range: dataStartRow
        });
        // Фильтрация и обработка пустых значений
        const cleanData = rawData.filter(row => {
            // Пропускать строки, где 'Код ОКЭД' пустой, null, undefined, только пробелы или равен 'Код ОКЭД'
            if (!row['Код ОКЭД'] || String(row['Код ОКЭД']).trim() === '' || String(row['Код ОКЭД']).trim() === 'Код ОКЭД') return false;
            // Пропускать строки, где все значения пустые
            const values = Object.values(row).map(v => (typeof v === 'string' ? v.trim() : v));
            if (values.every(v => v === '' || v === null || v === undefined)) return false;
            return true;
        }).map(row => {
            // trim для всех строковых значений
            Object.keys(row).forEach(key => {
                if (typeof row[key] === 'string') row[key] = row[key].trim();
            });
            // Для числовых полей, если значение не число — использовать 0
            ['Количество НП', 'средняя численность работников', 'Сумма по полю ФОТ', 'Сумма по полю ср.зп', 'ИПН', 'СН', 'Сумма налогов', 'Удельный вес %'].forEach(key => {
                if (row[key] === undefined || row[key] === null || row[key] === '' || isNaN(Number(row[key]))) {
                    row[key] = 0;
                } else {
                    row[key] = Number(row[key]);
                }
            });
            return row;
        });
        console.log(`\nНайдено ${cleanData.length} очищенных записей для импорта`);
        
        // Выводим первую запись для проверки
        if (cleanData.length > 0) {
            console.log('\nПример первой записи:');
            console.log(JSON.stringify(cleanData[0], null, 2));
        }
        
        // Подключаемся к базе данных
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            console.log('\nНачало транзакции');
            
            let importedCount = 0;
            let skippedCount = 0;
            
            for (const row of cleanData) {
                // Проверяем наличие обязательных полей
                if (!row['Вид деятельности']) {
                    console.log(`Пропускаем строку с пустым видом деятельности: ${row['Код ОКЭД']}`);
                    skippedCount++;
                    continue;
                }
                
                console.log(`\nОбработка записи: ${row['Код ОКЭД']} - ${row['Вид деятельности']}`);
                
                // Проверяем, существует ли уже запись с таким кодом ОКЭД
                const existingRecord = await client.query(
                    'SELECT id FROM "Сводная" WHERE "код_окэд" = $1',
                    [row['Код ОКЭД']]
                );
                
                if (existingRecord.rows.length === 0) {
                    console.log('Добавление новой записи...');
                    
                    // Обработка числовых полей
                    const количествоНП = row['Количество НП'];
                    const суммаНалогов = row['Сумма налогов'];
                    const средняяЧисленность = row['средняя численность работников'].toFixed(2);
                    const удельныйВес = row['Удельный вес %'];
                    const суммаФОТ = row['Сумма по полю ФОТ'];
                    const суммаСрЗп = row['Сумма по полю ср.зп'];
                    const ипн = row['ИПН'];
                    const сн = row['СН'];
                    
                    // Подготавливаем значения для вставки
                    const values = [
                        uuidv4(),
                        row['Код ОКЭД'],
                        row['Вид деятельности'],
                        количествоНП,
                        средняяЧисленность,
                        суммаФОТ,
                        суммаСрЗп,
                        ипн,
                        сн,
                        суммаНалогов,
                        удельныйВес
                    ];
                    
                    // Выводим значения для отладки
                    console.log('Подготовленные значения:');
                    console.log(`- Код ОКЭД: ${values[1]}`);
                    console.log(`- Вид деятельности: ${values[2]}`);
                    console.log(`- Количество НП: ${values[3]}`);
                    console.log(`- Средняя численность: ${values[4]}`);
                    console.log(`- Сумма ФОТ: ${values[5]}`);
                    console.log(`- Сумма ср.зп: ${values[6]}`);
                    console.log(`- ИПН: ${values[7]}`);
                    console.log(`- СН: ${values[8]}`);
                    console.log(`- Сумма налогов: ${values[9]}`);
                    console.log(`- Удельный вес: ${values[10]}`);
                    
                    // Вставляем данные в базу
                    const query = `
                        INSERT INTO "Сводная" (
                            id,
                            "код_окэд",
                            "вид_деятельности",
                            "количество_нп",
                            "средняя_численность_работников",
                            "Сумма по полю ФОТ",
                            "Сумма_по_полю_ср_зп",
                            "ИПН",
                            "СН",
                            "сумма_налогов",
                            "удельный_вес",
                            "createdAt",
                            "updatedAt"
                        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
                        RETURNING *
                    `;
                    
                    const result = await client.query(query, values);
                    
                    console.log('Запись успешно добавлена');
                    importedCount++;
                } else {
                    console.log('Запись уже существует, пропускаем');
                    skippedCount++;
                }
            }
            
            await client.query('COMMIT');
            console.log('\n=== Импорт данных завершен ===');
            console.log(`Всего записей в Excel: ${cleanData.length}`);
            console.log(`Успешно импортировано: ${importedCount}`);
            console.log(`Пропущено: ${skippedCount}`);
            
        } catch (err) {
            await client.query('ROLLBACK');
            console.error('Ошибка при выполнении запроса:', err);
            throw err;
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Ошибка при импорте данных:', error);
        throw error;
    }
}

// Функция для импорта всех Excel файлов из папки
async function importAllExcelFiles() {
    const otchetyDir = path.join(__dirname, '..', 'otchety');
    
    if (!fs.existsSync(otchetyDir)) {
        console.log('Создаем директорию для отчетов...');
        fs.mkdirSync(otchetyDir, { recursive: true });
        console.log('Пожалуйста, поместите Excel файлы в директорию:', otchetyDir);
        return;
    }

    const files = fs.readdirSync(otchetyDir)
        .filter(file => file.endsWith('.xlsx') || file.endsWith('.xls'));

    if (files.length === 0) {
        console.log('Excel файлы не найдены в директории:', otchetyDir);
        return;
    }

    console.log(`Найдено ${files.length} Excel файлов`);
    
    for (const file of files) {
        const filePath = path.join(otchetyDir, file);
        console.log(`\nОбработка файла: ${file}`);
        try {
            await importFromExcel(filePath);
        } catch (error) {
            console.error(`Ошибка при обработке файла ${file}:`, error);
        }
    }
}

// Получаем путь к файлу из аргументов командной строки
const args = process.argv.slice(2);
let excelFilePath;

if (args.length > 0) {
    excelFilePath = args[0];
    importFromExcel(excelFilePath);
} else {
    importAllExcelFiles();
} 