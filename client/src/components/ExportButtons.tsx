import React from 'react';
import { Button, Stack, Typography, Tooltip } from '@mui/material';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import api from '../api/axios';

interface ExportButtonsProps {
  selectedIds?: string[];
  filter?: string;
}

const ExportButtons: React.FC<ExportButtonsProps> = ({ selectedIds, filter }) => {
  // Получаем токен из локального хранилища
  const token = localStorage.getItem('token');

  // Функция для скачивания всех данных в PDF
  const handleExportAllToPdf = async () => {
    try {
      console.log('Начинаем экспорт всех данных в PDF');
      // URL с фильтром, если он есть
      const url = filter 
        ? `/data/export/pdf?filter=${encodeURIComponent(filter)}`
        : '/data/export/pdf';
      
      console.log('URL запроса:', url);
      console.log('Токен авторизации:', token ? 'Токен получен' : 'Токен отсутствует');

      // Запрос для скачивания PDF
      console.log('Отправляем запрос...');
      const response = await api({
        url,
        method: 'GET',
        responseType: 'blob', // Важно для бинарных данных
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      console.log('Ответ получен:', response.status, response.statusText);
      console.log('Размер полученных данных:', response.data.size);

      // Создаем ссылку для скачивания файла
      const downloadUrl = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute('download', `report-${Date.now()}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      console.log('Файл скачивается...');
    } catch (error: any) {
      console.error('Ошибка при экспорте в PDF:', error);
      if (error.response) {
        console.error('Ответ сервера:', error.response.status, error.response.statusText);
        console.error('Данные ошибки:', error.response.data);
      }
      alert('Произошла ошибка при экспорте в PDF. Пожалуйста, попробуйте еще раз.');
    }
  };

  // Функция для скачивания выбранной записи в PDF
  const handleExportSelectedToPdf = async () => {
    if (!selectedIds || selectedIds.length === 0) {
      alert('Пожалуйста, выберите запись для экспорта');
      return;
    }

    // Если выбрано больше одной записи, используем множественный экспорт
    if (selectedIds.length > 1) {
      handleExportMultipleToPdf();
      return;
    }

    try {
      const id = selectedIds[0];
      console.log('Начинаем экспорт записи с ID:', id);
      
      // Запрос для скачивания PDF выбранной записи
      const url = `/data/export/pdf/${id}`;
      console.log('URL запроса:', url);
      console.log('Токен авторизации:', token ? 'Токен получен' : 'Токен отсутствует');
      
      console.log('Отправляем запрос...');
      const response = await api({
        url,
        method: 'GET',
        responseType: 'blob',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      console.log('Ответ получен:', response.status, response.statusText);
      console.log('Размер полученных данных:', response.data.size);

      // Создаем ссылку для скачивания файла
      const downloadUrl = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute('download', `detail-report-${Date.now()}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      console.log('Файл скачивается...');
    } catch (error: any) {
      console.error('Ошибка при экспорте выбранной записи в PDF:', error);
      if (error.response) {
        console.error('Ответ сервера:', error.response.status, error.response.statusText);
        console.error('Данные ошибки:', error.response.data);
      }
      alert('Произошла ошибка при экспорте в PDF. Пожалуйста, попробуйте еще раз.');
    }
  };

  // Функция для скачивания нескольких выбранных записей в PDF
  const handleExportMultipleToPdf = async () => {
    if (!selectedIds || selectedIds.length === 0) {
      alert('Пожалуйста, выберите записи для экспорта');
      return;
    }

    try {
      console.log('Начинаем экспорт нескольких записей:', selectedIds);
      
      // Запрос для скачивания PDF нескольких записей
      const url = '/data/export/selected-pdf';
      console.log('URL запроса:', url);
      console.log('Токен авторизации:', token ? 'Токен получен' : 'Токен отсутствует');
      console.log('Данные запроса:', { ids: selectedIds });
      
      console.log('Отправляем запрос...');
      const response = await api({
        url,
        method: 'POST',
        responseType: 'blob',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        data: { ids: selectedIds }
      });
      
      console.log('Ответ получен:', response.status, response.statusText);
      console.log('Размер полученных данных:', response.data.size);

      // Создаем ссылку для скачивания файла
      const downloadUrl = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute('download', `multi-report-${Date.now()}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      console.log('Файл скачивается...');
    } catch (error: any) {
      console.error('Ошибка при экспорте выбранных записей в PDF:', error);
      if (error.response) {
        console.error('Ответ сервера:', error.response.status, error.response.statusText);
        console.error('Данные ошибки:', error.response.data);
      }
      alert('Произошла ошибка при экспорте в PDF. Пожалуйста, попробуйте еще раз.');
    }
  };

  return (
    <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
      <Typography variant="subtitle1">Экспорт данных:</Typography>
      
      <Tooltip title="Экспортировать все данные в PDF">
        <Button 
          variant="outlined" 
          startIcon={<PictureAsPdfIcon />}
          onClick={handleExportAllToPdf}
        >
          Все данные в PDF
        </Button>
      </Tooltip>
      
      <Tooltip title={selectedIds && selectedIds.length > 1 
        ? "Экспортировать выбранные записи в PDF" 
        : "Экспортировать выбранную запись в PDF"
      }>
        <span>
          <Button 
            variant="outlined" 
            startIcon={<FileDownloadIcon />}
            onClick={handleExportSelectedToPdf}
            disabled={!selectedIds || selectedIds.length === 0}
          >
            {selectedIds && selectedIds.length > 1 
              ? "Выбранные записи в PDF" 
              : "Выбранную запись в PDF"
            }
          </Button>
        </span>
      </Tooltip>
    </Stack>
  );
};

export default ExportButtons; 