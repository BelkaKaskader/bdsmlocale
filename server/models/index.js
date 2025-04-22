const { Sequelize, DataTypes } = require('sequelize');
require('dotenv').config({ path: '../../.env' });

// Подключение с использованием объекта конфигурации
const sequelize = new Sequelize({
    database: 'bdsm',
    username: 'postgres',
    password: 'admin',
    host: 'localhost',
    port: 5432,
    dialect: 'postgres',
    logging: false
});

// Импортируем модель User
const UserModel = require('./User');
const User = UserModel(sequelize);

const Сводная = sequelize.define('Сводная', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    код_окэд: {
        type: DataTypes.STRING,
        allowNull: false
    },
    вид_деятельности: {
        type: DataTypes.STRING,
        allowNull: false
    },
    количество_нп: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    средняя_численность_работников: {
        type: DataTypes.STRING,
        allowNull: false
    },
    'Сумма по полю ФОТ': {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: true,
        defaultValue: 0
    },
    Сумма_по_полю_ср_зп: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: true,
        defaultValue: 0
    },
    сумма_налогов: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: true,
        defaultValue: 0
    },
    удельный_вес: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: true,
        defaultValue: 0
    },
    ИПН: {
        type: DataTypes.STRING,
        allowNull: true
    },
    СН: {
        type: DataTypes.STRING,
        allowNull: true
    }
}, {
    tableName: 'Сводная',
    timestamps: true
});

// Экспортируем модели
module.exports = {
    sequelize,
    User,
    Сводная
}; 