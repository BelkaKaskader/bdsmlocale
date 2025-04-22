const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT
});

async function checkData() {
  const client = await pool.connect();
  try {
    console.log('Проверка данных в таблице Сводная...');
    const res = await client.query('SELECT "код_окэд", "вид_деятельности", "количество_нп", "средняя_численность_работников" FROM "Сводная" LIMIT 5');
    console.log('Первые 5 записей:');
    res.rows.forEach(row => console.log(row));
  } catch (err) {
    console.error('Ошибка при проверке данных:', err);
  } finally {
    client.release();
    pool.end();
  }
}

checkData(); 