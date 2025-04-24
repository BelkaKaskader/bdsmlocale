const { Pool } = require('pg');
const XLSX = require('xlsx');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');

// Используем те же параметры подключения, что и в API
const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'bdsm',
    password: 'admin',
    port: 5432,
});

async function createTable() {
    const client = await pool.connect();
    try {
        // Создаем таблицу без использования uuid_generate_v4()
        await client.query(`
            CREATE TABLE IF NOT EXISTS "otchety_full" (
                id UUID PRIMARY KEY,
                "код_окэд" VARCHAR(255),
                "вид_деятельности" TEXT,
                "количество_нп" INTEGER,
                "средняя_численность_работников" NUMERIC,
                "Сумма по полю ФОТ" NUMERIC,
                "Сумма_по_полю_ср_зп" NUMERIC,
                "ИПН" NUMERIC,
                "СН" NUMERIC,
                "сумма_налогов" NUMERIC,
                "удельный_вес" NUMERIC,
                "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('Таблица otchety_full создана успешно');
    } catch (err) {
        console.error('Ошибка при создании таблицы:', err);
        throw err;
    } finally {
        client.release();
    }
}

async function importFromExcel() {
    try {
        const directoryPath = path.join(__dirname, '..', 'otchety_full');
        console.log(`Поиск Excel файлов в директории: ${directoryPath}`);

        // Проверяем существование директории
        if (!fs.existsSync(directoryPath)) {
            console.error(`Директория не найдена: ${directoryPath}`);
            console.log('Пожалуйста, убедитесь, что директория otchety_full существует');
            return;
        }

        // Получаем список всех файлов в директории
        const files = fs.readdirSync(directoryPath);
        
        // Фильтруем только Excel файлы и исключаем временные файлы
        const excelFiles = files.filter(file => 
            (file.endsWith('.xlsx') || file.endsWith('.xls')) && !file.startsWith('~$')
        );

        if (excelFiles.length === 0) {
            console.error('Excel файлы не найдены в директории otchety_full');
            return;
        }

        console.log(`Найдено ${excelFiles.length} Excel файлов: ${excelFiles.join(', ')}`);

        // Создаем таблицу с новой структурой, если она еще не существует
        const client = await pool.connect();
        try {
            await client.query(`
                DROP TABLE IF EXISTS "otchety_full";
                CREATE TABLE "otchety_full" (
                    id UUID PRIMARY KEY,
                    "Код ОКЭД" VARCHAR(255),
                    "ОКЭД" VARCHAR(255),
                    "ИИН/БИН" VARCHAR(255),
                    "Код НУ" VARCHAR(255),
                    "empl_1_q1" INTEGER,
                    "empl_2_q1" INTEGER,
                    "empl_3_q1" INTEGER,
                    "empl_1_q2" INTEGER,
                    "empl_2_q2" INTEGER,
                    "empl_3_q2" INTEGER,
                    "empl_1_q3" INTEGER,
                    "empl_2_q3" INTEGER,
                    "empl_3_q3" INTEGER,
                    "empl_1_q4" INTEGER,
                    "empl_2_q4" INTEGER,
                    "empl_3_q4" INTEGER,
                    "сколько_месяцев" INTEGER,
                    "Кол-во_чел" INTEGER,
                    "Ср.числ" NUMERIC,
                    "field_200_00_001" NUMERIC,
                    "field_200_00_002" NUMERIC,
                    "ФОТ" NUMERIC,
                    "Ср.зп" NUMERIC,
                    "Наименование" TEXT,
                    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                );
            `);
            console.log('Таблица успешно создана');
        } finally {
            client.release();
        }

        // Импортируем данные из каждого файла
        for (const file of excelFiles) {
            const excelFilePath = path.join(directoryPath, file);
            console.log(`\nИмпорт данных из файла: ${file}`);
            
            const workbook = XLSX.readFile(excelFilePath, {
                cellDates: true,
                cellNF: false,
                cellText: false
            });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            
            // Преобразуем в массив объектов с явным указанием диапазона
            const data = XLSX.utils.sheet_to_json(worksheet, {
                raw: true,
                defval: null,
                header: [
                    'Код ОКЭД', 'ОКЭД', 'ИИН/БИН', 'Код НУ',
                    'empl_1', 'empl_2', 'empl_3',
                    'empl_1.1', 'empl_2.1', 'empl_3.1',
                    'empl_1.2', 'empl_2.2', 'empl_3.2',
                    'empl_1.3', 'empl_2.3', 'empl_3.3',
                    'сколько месяцев', 'Кол-во чел', 'Ср.числ',
                    'field_200_00_001', 'field_200_00_002',
                    'ФОТ', 'Ср.зп', 'Наименование'
                ]
            });

            console.log(`Найдено ${data.length} записей в файле ${file}`);
            
            // Выводим первую запись для проверки
            if (data.length > 0) {
                console.log('Пример первой записи:', JSON.stringify(data[0], null, 2));
            }

            const client = await pool.connect();
            try {
                await client.query('BEGIN');
                let insertedCount = 0;

                for (const row of data) {
                    // Пропускаем заголовок и пустые строки
                    if (!row['Код ОКЭД'] || row['Код ОКЭД'] === 'Код ОКЭД') {
                        continue;
                    }

                    const values = [
                        uuidv4(),
                        row['Код ОКЭД'] || '',
                        row['ОКЭД'] || '',
                        row['ИИН/БИН'] || '',
                        row['Код НУ'] || '',
                        parseInt(row['empl_1']) || 0,
                        parseInt(row['empl_2']) || 0,
                        parseInt(row['empl_3']) || 0,
                        parseInt(row['empl_1.1']) || 0,
                        parseInt(row['empl_2.1']) || 0,
                        parseInt(row['empl_3.1']) || 0,
                        parseInt(row['empl_1.2']) || 0,
                        parseInt(row['empl_2.2']) || 0,
                        parseInt(row['empl_3.2']) || 0,
                        parseInt(row['empl_1.3']) || 0,
                        parseInt(row['empl_2.3']) || 0,
                        parseInt(row['empl_3.3']) || 0,
                        parseInt(row['сколько месяцев']) || 0,
                        parseInt(row['Кол-во чел']) || 0,
                        parseFloat(Number(row['Ср.числ']).toFixed(2)) || 0,
                        parseFloat(Number(row['field_200_00_001']).toFixed(2)) || 0,
                        parseFloat(Number(row['field_200_00_002']).toFixed(2)) || 0,
                        parseFloat(Number(row['ФОТ']).toFixed(2)) || 0,
                        parseFloat(Number(row['Ср.зп']).toFixed(2)) || 0,
                        row['Наименование'] || ''
                    ];

                    try {
                        await client.query(`
                            INSERT INTO "otchety_full" (
                                id, "Код ОКЭД", "ОКЭД", "ИИН/БИН", "Код НУ",
                                "empl_1_q1", "empl_2_q1", "empl_3_q1",
                                "empl_1_q2", "empl_2_q2", "empl_3_q2",
                                "empl_1_q3", "empl_2_q3", "empl_3_q3",
                                "empl_1_q4", "empl_2_q4", "empl_3_q4",
                                "сколько_месяцев", "Кол-во_чел", "Ср.числ",
                                "field_200_00_001", "field_200_00_002",
                                "ФОТ", "Ср.зп", "Наименование"
                            ) VALUES (
                                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
                                $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
                                $21, $22, $23, $24, $25
                            )
                        `, values);
                        insertedCount++;
                    } catch (err) {
                        console.error('Ошибка при вставке строки:', err);
                        console.error('Проблемная строка:', row);
                    }
                }

                await client.query('COMMIT');
                console.log(`Успешно импортировано ${insertedCount} записей из файла ${file}`);
            } catch (err) {
                await client.query('ROLLBACK');
                console.error(`Ошибка при импорте данных из файла ${file}:`, err);
            } finally {
                client.release();
            }
        }
    } catch (err) {
        console.error('Ошибка при чтении Excel файлов:', err);
        throw err;
    }
}

async function main() {
    try {
        await createTable();
        await importFromExcel();
        console.log('Импорт завершен успешно');
    } catch (err) {
        console.error('Ошибка при выполнении импорта:', err);
        process.exit(1);
    } finally {
        pool.end();
    }
}

main(); 