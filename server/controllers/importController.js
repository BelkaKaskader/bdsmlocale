const path = require('path');
const { exec } = require('child_process');

// Импорт файла в svodnaya (папка otchety)
exports.importSvodnaya = (req, res) => {
  if (!req.file) {
    console.error('Файл не был загружен');
    return res.status(400).json({ message: 'Файл не был загружен' });
  }
  const filePath = path.resolve(__dirname, '../../otchety', req.file.filename);
  const scriptPath = path.resolve(__dirname, '../../scripts/importExcel.js');
  const command = `node "${scriptPath}" "${filePath}"`;
  console.log('Импортируем файл:', filePath);
  console.log('Выполняем команду:', command);
  exec(command, (error, stdout, stderr) => {
    console.log('stdout:', stdout);
    console.log('stderr:', stderr);
    if (error) {
      console.error('Ошибка при импорте файла:', error);
      return res.status(500).json({ message: 'Ошибка при импорте файла', error: stderr || error.message });
    }
    res.json({ message: 'Файл успешно импортирован в Сводная', log: stdout });
  });
};

// Импорт файла в otchety_full
exports.importOtchetyFull = (req, res) => {
  if (!req.file) {
    console.error('Файл не был загружен');
    return res.status(400).json({ message: 'Файл не был загружен' });
  }
  const filePath = path.resolve(__dirname, '../../otchety_full', req.file.filename);
  const scriptPath = path.resolve(__dirname, '../../scripts/importOtchetyFull.js');
  const command = `node "${scriptPath}" "${filePath}"`;
  console.log('Импортируем файл:', filePath);
  console.log('Выполняем команду:', command);
  exec(command, (error, stdout, stderr) => {
    console.log('stdout:', stdout);
    console.log('stderr:', stderr);
    if (error) {
      console.error('Ошибка при импорте файла:', error);
      return res.status(500).json({ message: 'Ошибка при импорте файла', error: stderr || error.message });
    }
    res.json({ message: 'Файл успешно импортирован в otchety_full', log: stdout });
  });
}; 