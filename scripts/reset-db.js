require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Создаем клиент PostgreSQL
const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function resetDatabase() {
    try {
        console.log('Начинаем сброс базы данных...');
        
        // Подключаемся к базе данных
        const client = await pool.connect();
        try {
            // Удаляем все таблицы
            console.log('Удаляем существующие таблицы...');
            await client.query('DROP TABLE IF EXISTS "Users" CASCADE');
            await client.query('DROP TABLE IF EXISTS "Сводная" CASCADE');
            
            // Читаем SQL-файл
            const sqlFilePath = path.join(__dirname, 'seed.sql');
            const sql = fs.readFileSync(sqlFilePath, 'utf8');
            
            // Выполняем SQL-запросы
            console.log('Создаем таблицы заново...');
            await client.query(sql);
            
            console.log('База данных успешно сброшена');
        } catch (err) {
            console.error('Ошибка при выполнении запроса:', err);
            throw err;
        } finally {
            client.release();
        }
        
        process.exit(0);
    } catch (error) {
        console.error('Ошибка при сбросе базы данных:', error);
        process.exit(1);
    }
}

// Запускаем сброс базы данных
resetDatabase(); 