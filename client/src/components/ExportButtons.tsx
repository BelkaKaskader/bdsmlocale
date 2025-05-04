import React, { useRef } from 'react';
import { Button, Stack, Typography, Tooltip } from '@mui/material';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import api from '../api/axios';
import { useAuth } from '../contexts/AuthContext';

interface ExportButtonsProps {
  selectedIds?: string[];
  filter?: string;
  onDataImported?: () => void;
}

const ExportButtons: React.FC<ExportButtonsProps> = ({ selectedIds, filter, onDataImported }) => {
  const { isAdmin } = useAuth();
  const inputSvodnayaRef = useRef<HTMLInputElement>(null);
  const inputOtchetyFullRef = useRef<HTMLInputElement>(null);
  // Получаем токен из локального хранилища
  const token = localStorage.getItem('token');

  // Функция для скачивания всех данных в PDF
  const handleExportAllToPdf = async () => {
    try {
      console.log('Начинаем экспорт всех данных в PDF');
      // URL с фильтром, если он есть
      const url = filter 
        ? `/pdf/generate?filter=${encodeURIComponent(filter)}`
        : '/pdf/generate';
      
      console.log('URL запроса:', url);
      console.log('Токен авторизации:', token ? 'Токен получен' : 'Токен отсутствует');

      // Запрос для скачивания PDF
      console.log('Отправляем запрос...');
      const response = await api({
        url,
        method: 'GET',
        responseType: 'blob', // Важно для бинарных данных
        headers: {
          Authorization: `Bearer ${token}`,
          'Accept': 'application/pdf'
        }
      });
      
      console.log('Ответ получен:', response.status, response.statusText);
      console.log('Размер полученных данных:', response.data.size);
      console.log('Тип данных:', response.headers['content-type']);

      if (!response.data || response.data.size === 0) {
        throw new Error('Получен пустой ответ от сервера');
      }

      // Создаем ссылку для скачивания файла
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute('download', `report-${Date.now()}.pdf`);
      document.body.appendChild(link);
      link.click();
      
      // Очищаем URL и удаляем ссылку
      setTimeout(() => {
        window.URL.revokeObjectURL(downloadUrl);
        link.remove();
      }, 100);
      
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
      console.log('Тип данных:', response.headers['content-type']);

      if (!response.data || response.data.size === 0) {
        throw new Error('Получен пустой ответ от сервера');
      }

      // Создаем ссылку для скачивания файла
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute('download', `detail-report-${Date.now()}.pdf`);
      document.body.appendChild(link);
      link.click();
      
      // Очищаем URL и удаляем ссылку
      setTimeout(() => {
        window.URL.revokeObjectURL(downloadUrl);
        link.remove();
      }, 100);
      
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
      console.log('Тип данных:', response.headers['content-type']);

      if (!response.data || response.data.size === 0) {
        throw new Error('Получен пустой ответ от сервера');
      }

      // Создаем ссылку для скачивания файла
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute('download', `multi-report-${Date.now()}.pdf`);
      document.body.appendChild(link);
      link.click();
      
      // Очищаем URL и удаляем ссылку
      setTimeout(() => {
        window.URL.revokeObjectURL(downloadUrl);
        link.remove();
      }, 100);
      
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

  // Обработчик для загрузки файла в svodnaya
  const handleImportSvodnaya = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      await api.post('/import/svodnaya', formData, {
        headers: { 'Content-Type': 'multipart/form-data', Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      alert('Файл успешно импортирован в "Сводная"!');
      if (onDataImported) onDataImported();
    } catch (error: any) {
      alert('Ошибка при импорте файла в "Сводная"!');
    }
    if (inputSvodnayaRef.current) inputSvodnayaRef.current.value = '';
  };

  // Обработчик для загрузки файла в otchety_full
  const handleImportOtchetyFull = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      await api.post('/import/otchety_full', formData, {
        headers: { 'Content-Type': 'multipart/form-data', Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      alert('Файл успешно импортирован в "otchety_full"!');
      if (onDataImported) onDataImported();
    } catch (error: any) {
      alert('Ошибка при импорте файла в "otchety_full"!');
    }
    if (inputOtchetyFullRef.current) inputOtchetyFullRef.current.value = '';
  };

  return (
    <>
      {isAdmin && (
        <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
          <Typography variant="subtitle1" sx={{ mr: 1 }}>Импорт данных:</Typography>
          <Tooltip title="Импортировать данные в 'Сводная'">
            <span>
              <Button
                variant="contained"
                sx={{
                  background: 'linear-gradient(90deg, #8e24aa, #d81b60)',
                  color: '#fff',
                  '&:hover': {
                    background: 'linear-gradient(90deg, #6a1b9a, #ad1457)'
                  }
                }}
                startIcon={<UploadFileIcon />}
                onClick={() => inputSvodnayaRef.current?.click()}
              >
                СВОДНАЯ ФОТ 0306
              </Button>
              <input
                type="file"
                accept=".xlsx,.xls"
                ref={inputSvodnayaRef}
                style={{ display: 'none' }}
                onChange={handleImportSvodnaya}
              />
            </span>
          </Tooltip>
          <Tooltip title="Импортировать данные в 'otchety_full'">
            <span>
              <Button
                variant="contained"
                sx={{
                  background: 'linear-gradient(90deg, #8e24aa, #d81b60)',
                  color: '#fff',
                  '&:hover': {
                    background: 'linear-gradient(90deg, #6a1b9a, #ad1457)'
                  }
                }}
                startIcon={<UploadFileIcon />}
                onClick={() => inputOtchetyFullRef.current?.click()}
              >
                ФОТ ИТОГ
              </Button>
              <input
                type="file"
                accept=".xlsx,.xls"
                ref={inputOtchetyFullRef}
                style={{ display: 'none' }}
                onChange={handleImportOtchetyFull}
              />
            </span>
          </Tooltip>
        </Stack>
      )}
      <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="subtitle1">Экспорт данных:</Typography>
        <Tooltip title="Экспортировать все данные в PDF">
          <Button 
            variant="contained"
            sx={{
              background: 'linear-gradient(90deg, #1976d2, #2196f3)',
              color: '#fff',
              '&:hover': {
                background: 'linear-gradient(90deg, #1565c0, #1976d2)'
              }
            }}
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
              variant="contained"
              sx={{
                background: 'linear-gradient(90deg, #1976d2, #2196f3)',
                color: '#fff',
                '&:hover': {
                  background: 'linear-gradient(90deg, #1565c0, #1976d2)'
                }
              }}
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
    </>
  );
};

export default ExportButtons; 