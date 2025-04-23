const path = require('path');

// Определение путей к шрифтам
const FONTS = {
  regular: path.join(__dirname, '../fonts/PTSans-Regular.ttf'),
  bold: path.join(__dirname, '../fonts/PTSans-Bold.ttf'),
  italic: path.join(__dirname, '../fonts/PTSans-Italic.ttf'),
  boldItalic: path.join(__dirname, '../fonts/PTSans-BoldItalic.ttf'),
  arial: path.join(__dirname, '../fonts/arial.ttf'),
  dejavu: path.join(__dirname, '../fonts/DejaVuSans.ttf'),
  dejavuBold: path.join(__dirname, '../fonts/DejaVuSans-Bold.ttf')
};

module.exports = { FONTS }; 