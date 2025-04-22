const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const auth = require('../middleware/auth');

// Создаем подключение к базе данных
const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

// Получение сводных данных
router.get('/summary', auth, async (req, res) => {
    try {
        console.log('Получение сводных данных...');
        
        const result = await pool.query(`
            SELECT 
                COUNT(*) as total_records,
                SUM(количество_нп) as total_np,
                SUM(сумма_налогов) as total_tax,
                AVG(удельный_вес) as avg_weight
            FROM "Сводная"
        `);

        console.log('Данные получены:', result.rows[0]);
        
        res.json({
            message: 'Сводные данные получены успешно',
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Ошибка при получении сводных данных:', error);
        res.status(500).json({ 
            message: 'Ошибка при получении сводных данных',
            error: error.message 
        });
    }
});

// Получение данных по коду ОКЭД
router.get('/by-oked/:code', auth, async (req, res) => {
    try {
        console.log('Получение данных по коду ОКЭД:', req.params.code);
        
        const result = await pool.query(`
            SELECT *
            FROM "Сводная"
            WHERE код_окэд = $1
        `, [req.params.code]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Данные не найдены' });
        }

        res.json({
            message: 'Данные получены успешно',
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Ошибка при получении данных:', error);
        res.status(500).json({ 
            message: 'Ошибка при получении данных',
            error: error.message 
        });
    }
});

// Получение списка всех кодов ОКЭД
router.get('/oked-codes', auth, async (req, res) => {
    try {
        console.log('Получение списка кодов ОКЭД...');
        
        const result = await pool.query(`
            SELECT DISTINCT код_окэд, вид_деятельности
            FROM "Сводная"
            ORDER BY код_окэд
        `);

        res.json({
            message: 'Список кодов ОКЭД получен успешно',
            data: result.rows
        });
    } catch (error) {
        console.error('Ошибка при получении списка кодов ОКЭД:', error);
        res.status(500).json({ 
            message: 'Ошибка при получении списка кодов ОКЭД',
            error: error.message 
        });
    }
});

module.exports = router; 