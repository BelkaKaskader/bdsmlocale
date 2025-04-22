require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { sequelize, User } = require('./models');

const authRoutes = require('./routes/auth');
const dataRoutes = require('./routes/data');
const apiRoutes = require('./routes/api');

const app = express();

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Добавляем объект базы данных в приложение
app.set('db', sequelize);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/data', dataRoutes);
app.use('/api', apiRoutes);

app.get('/', (req, res) => {
    res.json({ message: 'Welcome to BDSM API' });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Something went wrong!' });
});

const PORT = process.env.PORT || 5000;
let server;

// Функция для корректного завершения работы сервера
const gracefulShutdown = () => {
    console.log('Получен сигнал завершения. Закрываем сервер...');
    if (server) {
        server.close(() => {
            console.log('Сервер остановлен');
            sequelize.close().then(() => {
                console.log('Соединение с базой данных закрыто');
                process.exit(0);
            });
        });
    } else {
        process.exit(0);
    }
};

// Обработка сигналов завершения
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// В Windows также обрабатываем SIGBREAK
if (process.platform === 'win32') {
    process.on('SIGBREAK', gracefulShutdown);
}

// Инициализация базы данных и запуск сервера
sequelize.sync({ alter: true })
    .then(() => {
        console.log('База данных синхронизирована');
        
        // Создаем сервер с обработкой ошибок
        server = app.listen(PORT, () => {
            console.log(`Сервер запущен на порту ${PORT}`);
        }).on('error', (err) => {
            if (err.code === 'EADDRINUSE') {
                console.log(`Порт ${PORT} занят. Пытаемся освободить...`);
                require('child_process').exec(`npx kill-port ${PORT}`, (error) => {
                    if (!error) {
                        console.log(`Порт ${PORT} освобожден. Перезапускаем сервер...`);
                        server = app.listen(PORT, () => {
                            console.log(`Сервер успешно запущен на порту ${PORT}`);
                        });
                    } else {
                        console.error(`Не удалось освободить порт ${PORT}:`, error);
                        process.exit(1);
                    }
                });
            } else {
                console.error('Ошибка запуска сервера:', err);
                process.exit(1);
            }
        });
    })
    .catch(err => {
        console.error('Ошибка при синхронизации базы данных:', err);
        process.exit(1);
    }); 