require('dotenv').config();
const { sequelize, User } = require('../server/models');

async function initAdmin() {
    try {
        // Удаляем существующего администратора, если он есть
        await User.destroy({
            where: {
                role: 'admin'
            }
        });

        // Создаем нового администратора
        const admin = await User.create({
            username: 'admin',
            email: process.env.ADMIN_EMAIL || 'admin@example.com',
            password: 'Admin123!', // Пароль будет захеширован автоматически через хук beforeSave
            role: 'admin',
            isBlocked: false
        });

        console.log('Администратор успешно создан:');
        console.log(`Username: ${admin.username}`);
        console.log(`Email: ${admin.email}`);
        console.log('Пароль: Admin123!');
        console.log('Пожалуйста, измените пароль после первого входа');

        process.exit(0);
    } catch (error) {
        console.error('Ошибка при создании администратора:', error);
        process.exit(1);
    }
}

// Синхронизируем базу данных перед созданием администратора
sequelize.sync().then(() => {
    initAdmin();
}); 