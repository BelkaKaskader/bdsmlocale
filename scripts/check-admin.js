require('dotenv').config();
const { sequelize, User } = require('../server/models');

async function checkAdmin() {
    try {
        // Ищем администратора
        const admin = await User.findOne({
            where: {
                role: 'admin'
            }
        });

        if (admin) {
            console.log('Администратор найден:');
            console.log('ID:', admin.id);
            console.log('Username:', admin.username);
            console.log('Email:', admin.email);
            console.log('Role:', admin.role);
            console.log('IsBlocked:', admin.isBlocked);
        } else {
            console.log('Администратор не найден');
        }

        // Выводим всех пользователей
        console.log('\nСписок всех пользователей:');
        const users = await User.findAll();
        users.forEach(user => {
            console.log('-------------------');
            console.log('ID:', user.id);
            console.log('Username:', user.username);
            console.log('Email:', user.email);
            console.log('Role:', user.role);
            console.log('IsBlocked:', user.isBlocked);
        });

        process.exit(0);
    } catch (error) {
        console.error('Ошибка при проверке администратора:', error);
        process.exit(1);
    }
}

// Запускаем проверку
sequelize.sync().then(() => {
    checkAdmin();
}); 