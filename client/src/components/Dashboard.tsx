import React, { useEffect, useState } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow,
  Button
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

interface SummaryData {
  id: number;
  code: string;
  description: string;
  count: number;
}

const Dashboard: React.FC = () => {
  const [summaryData, setSummaryData] = useState<SummaryData[]>([]);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    const fetchData = async () => {
      try {
        const response = await api.get('/data/summary', {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        setSummaryData(response.data);
      } catch (err: any) {
        if (err.response?.status === 401) {
          localStorage.removeItem('token');
          navigate('/login');
        } else {
          setError('Ошибка при загрузке данных');
        }
      }
    };

    fetchData();
  }, [navigate]);

  const handleExportPdf = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    try {
      const response = await api.get('/data/export/pdf', {
        responseType: 'blob',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'report.pdf');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err: any) {
      if (err.response?.status === 401) {
        localStorage.removeItem('token');
        navigate('/login');
      } else {
        setError('Ошибка при экспорте PDF');
      }
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4">Панель управления</Typography>
        <Box>
          <Button variant="contained" onClick={handleExportPdf} sx={{ mr: 2 }}>
            Экспорт PDF
          </Button>
          <Button variant="outlined" color="error" onClick={handleLogout}>
            Выйти
          </Button>
        </Box>
      </Box>

      {error && (
        <Typography color="error" sx={{ mb: 2 }}>
          {error}
        </Typography>
      )}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Код</TableCell>
              <TableCell>Описание</TableCell>
              <TableCell align="right">Количество</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {summaryData.map((row) => (
              <TableRow key={row.id}>
                <TableCell>{row.code}</TableCell>
                <TableCell>{row.description}</TableCell>
                <TableCell align="right">{row.count}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default Dashboard; 