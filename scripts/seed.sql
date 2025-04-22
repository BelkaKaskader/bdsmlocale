-- Создание таблицы Сводная, если она не существует
CREATE TABLE IF NOT EXISTS "Сводная" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "код_окэд" VARCHAR(255) UNIQUE NOT NULL,
    "вид_деятельности" TEXT NOT NULL,
    "количество_нп" INTEGER NOT NULL DEFAULT 0,
    "средняя_численность_работников" TEXT,
    "Сумма по полю ФОТ" DECIMAL(15,2) DEFAULT 0,
    "Сумма_по_полю_ср_зп" DECIMAL(15,2) DEFAULT 0,
    "ИПН" VARCHAR(255),
    "СН" VARCHAR(255),
    "сумма_налогов" DECIMAL(15,2) DEFAULT 0,
    "удельный_вес" DECIMAL(5,2) DEFAULT 0,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Создание индекса для быстрого поиска по коду ОКЭД
CREATE INDEX IF NOT EXISTS idx_svodnaya_kod_oked ON "Сводная" ("код_окэд");

-- Создание таблицы Users для аутентификации
CREATE TABLE IF NOT EXISTS "Users" (
    id UUID PRIMARY KEY,
    "username" VARCHAR(255) UNIQUE NOT NULL,
    "password" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255) UNIQUE,
    "role" VARCHAR(50) DEFAULT 'user',
    "isBlocked" BOOLEAN DEFAULT FALSE,
    "resetPasswordToken" VARCHAR(255),
    "resetPasswordExpires" TIMESTAMP WITH TIME ZONE,
    "createdBy" UUID,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL
); 