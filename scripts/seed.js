require('dotenv').config();
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Создаем клиент PostgreSQL
const client = new Client({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

// Функция для выполнения SQL-запросов
async function seedDatabase() {
  try {
    // Подключаемся к базе данных
    console.log('Подключение к базе данных...');
    await client.connect();
    console.log('Подключено к базе данных');

    // Читаем SQL-файл
    const sqlFilePath = path.join(__dirname, 'seed.sql');
    const sql = fs.readFileSync(sqlFilePath, 'utf8');

    // Выполняем SQL-запросы
    console.log('Выполнение SQL-запросов...');
    await client.query(sql);
    console.log('Данные успешно добавлены в базу данных');

  } catch (error) {
    console.error('Ошибка:', error.message);
  } finally {
    // Закрываем соединение
    await client.end();
  }
}

// Запускаем функцию
seedDatabase(); 