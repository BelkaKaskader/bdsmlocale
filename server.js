require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { sequelize, User } = require('./models');

const authRoutes = require('./routes/auth');
const dataRoutes = require('./routes/data');
const apiRoutes = require('./routes/api');
const pdfRoutes = require('./routes/pdf');

const app = express();

// Middleware
app.use(cors({
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  }));
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api', apiRoutes);
app.use('/api/data', dataRoutes);
app.use('/api/pdf', pdfRoutes);

app.get('/', (req, res) => {
    res.json({ message: 'Welcome to BDSM API' });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Something went wrong!' });
});

const PORT = process.env.PORT || 5000;

// Инициализация базы данных и запуск сервера
sequelize.sync({ alter: true })
    .then(() => {
        console.log('База данных синхронизирована');
        app.listen(PORT, () => {
            console.log(`Сервер запущен на порту ${PORT}`);
        });
    })
    .catch(err => {
        console.error('Ошибка при синхронизации базы данных:', err);
    }); 