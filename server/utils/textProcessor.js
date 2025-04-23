/**
 * Обрабатывает текст перед добавлением в PDF
 * @param {string} text - Текст для обработки
 * @returns {string} - Обработанный текст
 */
const processText = (text) => {
  if (!text) return '';
  return String(text)
    .normalize('NFKC')
    .replace(/[\u0000-\u0008\u000B-\u000C\u000E-\u001F]/g, '')
    .trim();
};

module.exports = { processText }; 