const path = require('path');
const fs = require('fs');

// Функция для проверки наличия шрифта
function getFontPath(fontName) {
    const fontPath = path.join(__dirname, '../fonts', fontName);
    console.log('Проверка шрифта:', fontName);
    console.log('Полный путь к шрифту:', fontPath);
    
    if (fs.existsSync(fontPath)) {
        console.log('Шрифт найден:', fontPath);
        return fontPath;
    }
    
    console.warn(`Шрифт ${fontName} не найден по пути ${fontPath}`);
    return null;
}

module.exports = {
    getFontPath
}; 