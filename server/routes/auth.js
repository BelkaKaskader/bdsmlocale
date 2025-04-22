const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { Op } = require('sequelize');
const { User } = require('../models');
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');

// Регистрация нового пользователя (только для администраторов)
router.post('/register', auth, adminAuth, async (req, res) => {
    try {
        console.log('=== Начало регистрации ===');
        console.log('Тело запроса:', req.body);
        const { username, email, password, role = 'user' } = req.body;

        console.log('Проверка входных данных:');
        console.log('- username:', username);
        console.log('- email:', email);
        console.log('- role:', role);

        // Проверка существования пользователя
        console.log('Поиск существующего пользователя...');
        const existingUser = await User.findOne({
            where: {
                [Op.or]: [
                    { username: username },
                    { email: email }
                ]
            }
        });

        console.log('Результат поиска:', existingUser ? 'Пользователь найден' : 'Пользователь не найден');

        if (existingUser) {
            console.log('Отказ: пользователь уже существует');
            return res.status(400).json({ 
                message: 'Пользователь уже существует',
                details: existingUser.username === username ? 'Username занят' : 'Email занят'
            });
        }

        // Создание нового пользователя
        console.log('Создание нового пользователя...');
        const user = await User.create({
            username,
            email,
            password,
            role,
            createdBy: req.user.id
        });

        console.log('Пользователь успешно создан:', user.id);

        res.status(201).json({
            message: 'Пользователь успешно создан',
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Ошибка при регистрации:', error);
        res.status(500).json({ 
            message: 'Ошибка при регистрации пользователя',
            error: error.message,
            stack: error.stack
        });
    }
});

// Авторизация
router.post('/login', async (req, res) => {
    try {
        console.log('Попытка входа:', { username: req.body.username });
        const { username, password } = req.body;

        // Находим пользователя
        const user = await User.findOne({ where: { username } });
        if (!user) {
            console.log('Пользователь не найден:', username);
            return res.status(401).json({ message: 'Неверное имя пользователя или пароль' });
        }

        console.log('Пользователь найден:', { 
            id: user.id, 
            username: user.username,
            isBlocked: user.isBlocked
        });

        // Проверяем, не заблокирован ли пользователь
        if (user.isBlocked) {
            console.log('Пользователь заблокирован:', username);
            return res.status(403).json({ message: 'Пользователь заблокирован' });
        }

        // Проверяем пароль
        const isValidPassword = await user.validatePassword(password);
        console.log('Проверка пароля:', isValidPassword ? 'успешно' : 'неверный пароль');
        
        if (!isValidPassword) {
            return res.status(401).json({ message: 'Неверное имя пользователя или пароль' });
        }

        // Создаем JWT токен
        const token = jwt.sign(
            { id: user.id, role: user.role },
            process.env.SECRET_KEY,
            { expiresIn: '12h' }
        );

        console.log('Токен создан успешно');

        res.json({
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Ошибка при авторизации:', error);
        res.status(500).json({ message: 'Ошибка при авторизации' });
    }
});

// Получение профиля пользователя
router.get('/profile', auth, async (req, res) => {
    try {
        const user = await User.findOne({ where: { id: req.user.id } });
        res.json({
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role
        });
    } catch (error) {
        res.status(500).json({ message: 'Ошибка при получении профиля' });
    }
});

// Получение списка пользователей (только для администраторов)
router.get('/users', auth, adminAuth, async (req, res) => {
    try {
        const users = await User.findAll({
            where: {},
            attributes: ['id', 'username', 'email', 'role', 'isBlocked', 'createdAt', 'updatedAt']
        });
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: 'Ошибка при получении списка пользователей' });
    }
});

// Удаление пользователя (только для администраторов)
router.delete('/users/:userId', auth, adminAuth, async (req, res) => {
    try {
        console.log('=== Начало удаления пользователя ===');
        console.log('ID пользователя для удаления:', req.params.userId);

        console.log('Поиск пользователя...');
        const user = await User.findOne({ where: { id: req.params.userId } });

        if (!user) {
            console.log('Пользователь не найден');
            return res.status(404).json({ message: 'Пользователь не найден' });
        }

        console.log('Пользователь найден:', {
            id: user.id,
            username: user.username,
            role: user.role
        });

        // Запрещаем удалять последнего администратора
        if (user.role === 'admin') {
            console.log('Проверка количества администраторов...');
            const adminCount = await User.count({
                where: { role: 'admin' }
            });
            
            console.log('Количество администраторов:', adminCount);
            
            if (adminCount <= 1) {
                console.log('Отказ: попытка удаления последнего администратора');
                return res.status(400).json({ message: 'Невозможно удалить последнего администратора' });
            }
        }

        console.log('Удаление пользователя...');
        await user.destroy();
        console.log('Пользователь успешно удален');

        res.json({ message: 'Пользователь успешно удален' });
    } catch (error) {
        console.error('Ошибка при удалении пользователя:', error);
        res.status(500).json({ 
            message: 'Ошибка при удалении пользователя',
            error: error.message,
            stack: error.stack
        });
    }
});

// Изменение роли пользователя (только для администраторов)
router.patch('/users/:userId/role', auth, adminAuth, async (req, res) => {
    try {
        console.log('=== Начало изменения роли ===');
        console.log('ID пользователя:', req.params.userId);
        console.log('Новая роль:', req.body.role);

        const { role } = req.body;
        
        if (!role || !['admin', 'user'].includes(role)) {
            console.log('Ошибка: неверная роль:', role);
            return res.status(400).json({ message: 'Роль должна быть "admin" или "user"' });
        }

        console.log('Поиск пользователя...');
        const user = await User.findOne({ where: { id: req.params.userId } });
        
        if (!user) {
            console.log('Пользователь не найден');
            return res.status(404).json({ message: 'Пользователь не найден' });
        }

        console.log('Текущая роль пользователя:', user.role);

        // Запрещаем изменять роль последнего администратора
        if (user.role === 'admin' && role !== 'admin') {
            console.log('Проверка количества администраторов...');
            const adminCount = await User.count({
                where: { role: 'admin' }
            });
            
            console.log('Количество администраторов:', adminCount);
            
            if (adminCount <= 1) {
                console.log('Отказ: последний администратор');
                return res.status(400).json({ message: 'Невозможно изменить роль последнего администратора' });
            }
        }

        console.log('Обновление роли...');
        user.role = role;
        await user.save();

        console.log('Роль успешно обновлена');

        res.json({ 
            message: 'Роль пользователя успешно изменена',
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Ошибка при изменении роли:', error);
        res.status(500).json({ 
            message: 'Ошибка при изменении роли пользователя',
            error: error.message,
            stack: error.stack
        });
    }
});

// Блокировка/разблокировка пользователя (только для администраторов)
router.patch('/users/:userId/block', auth, adminAuth, async (req, res) => {
    try {
        console.log('=== Начало блокировки/разблокировки ===');
        console.log('ID пользователя:', req.params.userId);
        
        console.log('Поиск пользователя...');
        const user = await User.findOne({ where: { id: req.params.userId } });
        
        if (!user) {
            console.log('Пользователь не найден');
            return res.status(404).json({ message: 'Пользователь не найден' });
        }

        console.log('Текущий статус пользователя:', user.isBlocked ? 'заблокирован' : 'активен');

        // Запрещаем блокировать последнего администратора
        if (user.role === 'admin') {
            console.log('Проверка количества администраторов...');
            const adminCount = await User.count({
                where: { role: 'admin' }
            });
            
            console.log('Количество администраторов:', adminCount);
            
            if (adminCount <= 1) {
                console.log('Отказ: последний администратор');
                return res.status(400).json({ message: 'Невозможно заблокировать последнего администратора' });
            }
        }

        console.log('Изменение статуса блокировки...');
        user.isBlocked = !user.isBlocked;
        await user.save();

        console.log('Статус успешно обновлен:', user.isBlocked ? 'заблокирован' : 'разблокирован');

        res.json({ 
            message: `Пользователь успешно ${user.isBlocked ? 'заблокирован' : 'разблокирован'}`,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role,
                isBlocked: user.isBlocked
            }
        });
    } catch (error) {
        console.error('Ошибка при блокировке/разблокировке:', error);
        res.status(500).json({ 
            message: 'Ошибка при блокировке/разблокировке пользователя',
            error: error.message,
            stack: error.stack
        });
    }
});

// Запрос на сброс пароля
router.post('/reset-password-request', async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ where: { email } });
        
        if (!user) {
            return res.status(404).json({ message: 'Пользователь не найден' });
        }

        // Генерация токена для сброса пароля
        const resetToken = crypto.randomBytes(20).toString('hex');
        user.resetPasswordToken = resetToken;
        user.resetPasswordExpires = Date.now() + 3600000; // 1 час
        await user.save();

        // В реальном приложении здесь нужно отправить email с токеном
        res.json({ 
            message: 'Инструкции по сбросу пароля отправлены на email',
            resetToken // В реальном приложении этот токен должен быть отправлен по email
        });
    } catch (error) {
        res.status(500).json({ message: 'Ошибка при запросе сброса пароля' });
    }
});

// Сброс пароля
router.post('/reset-password', async (req, res) => {
    try {
        const { token, newPassword } = req.body;
        
        const user = await User.findOne({
            where: {
                resetPasswordToken: token,
                resetPasswordExpires: { [Op.gt]: Date.now() }
            }
        });

        if (!user) {
            return res.status(400).json({ message: 'Недействительный или просроченный токен сброса пароля' });
        }

        user.password = newPassword;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();

        res.json({ message: 'Пароль успешно изменен' });
    } catch (error) {
        res.status(500).json({ message: 'Ошибка при сбросе пароля' });
    }
});

// Удаление своего профиля (запрещено)
router.delete('/profile', auth, async (req, res) => {
    return res.status(403).json({ message: 'Удаление профиля запрещено. Обратитесь к администратору.' });
});

module.exports = router; 