const express = require('express');
const router = express.Router();
const { Сводная } = require('../models');
const { Op } = require('sequelize');
const { Pool } = require('pg');
const auth = require('../middleware/auth');
const pdfController = require('../controllers/pdfControllerHtml');

// Указываем параметры подключения явно
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'bdsm',
  password: 'admin',
  port: 5432,
});

// Поиск с фильтрами
router.get('/search', async (req, res) => {
    try {
        const {
            код_окэд,
            вид_деятельности,
            средняя_численность_min,
            средняя_численность_max,
            сумма_налогов_min,
            сумма_налогов_max,
            удельный_вес_min,
            удельный_вес_max,
            сумма_фот_min,
            сумма_фот_max,
            сумма_срзп_min,
            сумма_срзп_max
        } = req.query;

        // Формируем условия поиска
        const where = {};
        const appliedFilters = [];

        if (код_окэд) {
            where.код_окэд = { [Op.iLike]: `%${код_окэд}%` };
            appliedFilters.push(`код ОКЭД содержит "${код_окэд}"`);
        }

        if (вид_деятельности) {
            where.вид_деятельности = { [Op.iLike]: `%${вид_деятельности}%` };
            appliedFilters.push(`вид деятельности содержит "${вид_деятельности}"`);
        }

        if (средняя_численность_min || средняя_численность_max) {
            where.средняя_численность_работников = {};
            if (средняя_численность_min) {
                where.средняя_численность_работников[Op.gte] = средняя_численность_min.toString();
                appliedFilters.push(`средняя численность >= ${средняя_численность_min}`);
            }
            if (средняя_численность_max) {
                where.средняя_численность_работников[Op.lte] = средняя_численность_max.toString();
                appliedFilters.push(`средняя численность <= ${средняя_численность_max}`);
            }
        }

        if (сумма_налогов_min || сумма_налогов_max) {
            where.сумма_налогов = {};
            if (сумма_налогов_min) {
                where.сумма_налогов[Op.gte] = parseFloat(сумма_налогов_min);
                appliedFilters.push(`сумма налогов >= ${сумма_налогов_min}`);
            }
            if (сумма_налогов_max) {
                where.сумма_налогов[Op.lte] = parseFloat(сумма_налогов_max);
                appliedFilters.push(`сумма налогов <= ${сумма_налогов_max}`);
            }
        }

        if (удельный_вес_min || удельный_вес_max) {
            where.удельный_вес = {};
            if (удельный_вес_min) {
                where.удельный_вес[Op.gte] = parseFloat(удельный_вес_min);
                appliedFilters.push(`удельный вес >= ${удельный_вес_min}`);
            }
            if (удельный_вес_max) {
                where.удельный_вес[Op.lte] = parseFloat(удельный_вес_max);
                appliedFilters.push(`удельный вес <= ${удельный_вес_max}`);
            }
        }

        if (сумма_фот_min || сумма_фот_max) {
            where.Сумма_по_полю_ФОТт = {};
            if (сумма_фот_min) {
                where.Сумма_по_полю_ФОТт[Op.gte] = parseFloat(сумма_фот_min);
                appliedFilters.push(`сумма ФОТ >= ${сумма_фот_min}`);
            }
            if (сумма_фот_max) {
                where.Сумма_по_полю_ФОТт[Op.lte] = parseFloat(сумма_фот_max);
                appliedFilters.push(`сумма ФОТ <= ${сумма_фот_max}`);
            }
        }

        if (сумма_срзп_min || сумма_срзп_max) {
            where.Сумма_по_полю_ср_зп = {};
            if (сумма_срзп_min) {
                where.Сумма_по_полю_ср_зп[Op.gte] = parseFloat(сумма_срзп_min);
                appliedFilters.push(`средняя зарплата >= ${сумма_срзп_min}`);
            }
            if (сумма_срзп_max) {
                where.Сумма_по_полю_ср_зп[Op.lte] = parseFloat(сумма_срзп_max);
                appliedFilters.push(`средняя зарплата <= ${сумма_срзп_max}`);
            }
        }

        console.log('Условия поиска:', JSON.stringify(where, null, 2));

        const results = await Сводная.findAll({
            where,
            order: [['createdAt', 'DESC']]
        });

        console.log(`Найдено записей: ${results.length}`);

        if (results.length === 0) {
            // Если результаты не найдены, возвращаем информативное сообщение
            return res.json({
                status: 'no_results',
                message: 'По заданным критериям записи не найдены',
                appliedFilters: appliedFilters,
                suggestions: [
                    'Попробуйте уменьшить количество критериев поиска',
                    'Проверьте правильность введенных значений',
                    'Расширьте диапазоны поиска (min/max значения)',
                    'Используйте частичный поиск по коду ОКЭД или виду деятельности'
                ]
            });
        }

        // Если результаты найдены, возвращаем их вместе с информацией о фильтрах
        res.json({
            status: 'success',
            count: results.length,
            appliedFilters: appliedFilters,
            data: results
        });
    } catch (error) {
        console.error('Ошибка при поиске:', error);
        res.status(500).json({ 
            status: 'error',
            message: 'Ошибка при поиске данных',
            error: error.message 
        });
    }
});

// Получение данных из таблицы "Сводная"
router.get('/data', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM "Сводная" ORDER BY код_окэд');
    res.json(result.rows);
  } catch (err) {
    console.error('Ошибка при получении данных:', err);
    res.status(500).json({ message: 'Ошибка сервера при получении данных' });
  }
});

// PDF routes
router.get('/pdf/generate', pdfController.generatePdf);
router.get('/pdf/generate/:id', pdfController.generateDetailPdf);

module.exports = router; 