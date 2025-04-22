require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

// Чтение конфигурации из .env файла
const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

// Количество раундов для хеширования
const SALT_ROUNDS = 10;

/**
 * Регистрация нового пользователя
 * @param {string} username - имя пользователя
 * @param {string} password - пароль
 * @param {string} email - электронная почта
 * @param {string} role - роль пользователя
 * @returns {Promise<Object>} - объект с данными пользователя
 */
async function registerUser(username, password, email, role = 'user') {
    const client = await pool.connect();
    
    try {
        // Проверка, существует ли пользователь с таким именем
        const checkUser = await client.query(
            'SELECT * FROM "Users" WHERE username = $1',
            [username]
        );
        
        if (checkUser.rows.length > 0) {
            throw new Error('Пользователь с таким именем уже существует');
        }
        
        // Проверка email, если указан
        if (email) {
            const checkEmail = await client.query(
                'SELECT * FROM "Users" WHERE email = $1',
                [email]
            );
            
            if (checkEmail.rows.length > 0) {
                throw new Error('Пользователь с таким email уже существует');
            }
        }
        
        // Хеширование пароля
        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
        
        // Добавление пользователя в базу данных
        const result = await client.query(
            `INSERT INTO "Users" (
                id, username, password, email, role, "isBlocked", "createdAt", "updatedAt"
            ) VALUES ($1, $2, $3, $4, $5, FALSE, NOW(), NOW()) RETURNING id, username, email, role, "isBlocked"`,
            [uuidv4(), username, hashedPassword, email, role]
        );
        
        return result.rows[0];
    } finally {
        client.release();
    }
}

/**
 * Аутентификация пользователя
 * @param {string} username - имя пользователя
 * @param {string} password - пароль
 * @returns {Promise<Object|null>} - объект с данными пользователя или null, если авторизация не удалась
 */
async function authenticateUser(username, password) {
    const client = await pool.connect();
    
    try {
        // Поиск пользователя в базе данных
        const result = await client.query(
            'SELECT * FROM "Users" WHERE username = $1',
            [username]
        );
        
        if (result.rows.length === 0) {
            console.log('Пользователь не найден');
            return null;
        }
        
        const user = result.rows[0];
        
        // Проверка активности пользователя
        if (user.isBlocked) {
            console.log('Пользователь заблокирован');
            return null;
        }
        
        // Проверка пароля
        const passwordMatch = await bcrypt.compare(password, user.password);
        
        if (!passwordMatch) {
            console.log('Неверный пароль');
            return null;
        }
        
        // Исключаем пароль из результата
        const { password: _, ...userWithoutPassword } = user;
        
        return userWithoutPassword;
    } finally {
        client.release();
    }
}

/**
 * Получение всех пользователей
 * @returns {Promise<Array>} - список пользователей
 */
async function getAllUsers() {
    const client = await pool.connect();
    
    try {
        const result = await client.query(
            'SELECT id, username, email, role, "isBlocked", "createdAt", "updatedAt" FROM "Users"'
        );
        
        return result.rows;
    } finally {
        client.release();
    }
}

/**
 * Изменение пароля пользователя
 * @param {string} username - имя пользователя
 * @param {string} oldPassword - старый пароль
 * @param {string} newPassword - новый пароль
 * @returns {Promise<boolean>} - успешность операции
 */
async function changePassword(username, oldPassword, newPassword) {
    const client = await pool.connect();
    
    try {
        // Проверка старого пароля
        const user = await authenticateUser(username, oldPassword);
        
        if (!user) {
            throw new Error('Неверное имя пользователя или пароль');
        }
        
        // Хеширование нового пароля
        const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);
        
        // Обновление пароля в базе данных
        await client.query(
            'UPDATE "Users" SET password = $1, "updatedAt" = NOW() WHERE username = $2',
            [hashedPassword, username]
        );
        
        return true;
    } catch (error) {
        console.error('Ошибка при изменении пароля:', error);
        return false;
    } finally {
        client.release();
    }
}

/**
 * Блокировка/разблокировка пользователя
 * @param {string} userId - идентификатор пользователя
 * @param {boolean} isBlocked - статус блокировки
 * @returns {Promise<boolean>} - успешность операции
 */
async function setUserActive(userId, isBlocked) {
    const client = await pool.connect();
    
    try {
        await client.query(
            'UPDATE "Users" SET "isBlocked" = $1, "updatedAt" = NOW() WHERE id = $2',
            [isBlocked, userId]
        );
        
        return true;
    } catch (error) {
        console.error('Ошибка при изменении статуса пользователя:', error);
        return false;
    } finally {
        client.release();
    }
}

// Экспорт функций для использования в других модулях
module.exports = {
    registerUser,
    authenticateUser,
    getAllUsers,
    changePassword,
    setUserActive
};

// Пример использования
async function exampleUsage() {
    try {
        // Пример регистрации пользователя
        console.log('Регистрация пользователя...');
        const newUser = await registerUser('admin', 'password123', 'admin@example.com', 'admin');
        console.log('Пользователь зарегистрирован:', newUser);
        
        // Пример авторизации
        console.log('\nАвторизация пользователя...');
        const user = await authenticateUser('admin', 'password123');
        
        if (user) {
            console.log('Пользователь авторизован:', user);
        } else {
            console.log('Ошибка авторизации');
        }
        
        // Проверка неверного пароля
        console.log('\nПопытка авторизации с неверным паролем...');
        const failedAuth = await authenticateUser('admin', 'wrongpassword');
        
        if (failedAuth) {
            console.log('Пользователь авторизован:', failedAuth);
        } else {
            console.log('Ошибка авторизации: неверный пароль');
        }
        
    } catch (error) {
        console.error('Ошибка:', error.message);
    } finally {
        // Закрываем соединение с базой данных
        await pool.end();
    }
}

// Проверяем, вызывается ли скрипт напрямую
if (require.main === module) {
    exampleUsage();
} 