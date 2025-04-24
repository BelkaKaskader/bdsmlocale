import React, { useEffect, useState } from 'react';
import { DataGrid, GridColDef, GridRowSelectionModel } from '@mui/x-data-grid';
import { 
  Box, 
  CircularProgress, 
  Typography, 
  Paper,
  TextField,
  Button,
  Grid,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterList as FilterIcon,
  Close as CloseIcon,
  Logout as LogoutIcon
} from '@mui/icons-material';
import api from '../api/axios';
import DataCharts from './DataCharts';
import ExportButtons from './ExportButtons';
import { useNavigate } from 'react-router-dom';

interface DataRow {
  id: string;
  код_окэд: string;
  вид_деятельности: string;
  количество_нп: number;
  средняя_численность_работников: number;
  'Сумма по полю ФОТ': number;
  Сумма_по_полю_ср_зп: number;
  ИПН: string;
  СН: string;
  сумма_налогов: number;
  удельный_вес: number;
  Сумма_по_полю_ФОТ: number;
}

interface FilterValues {
  код_окэд: string;
  вид_деятельности: string;
  средняя_численность_min: string;
  средняя_численность_max: string;
  сумма_налогов_min: string;
  сумма_налогов_max: string;
  средняя_зп_min: string;
  средняя_зп_max: string;
}

const initialFilterValues: FilterValues = {
  код_окэд: '',
  вид_деятельности: '',
  средняя_численность_min: '',
  средняя_численность_max: '',
  сумма_налогов_min: '',
  сумма_налогов_max: '',
  средняя_зп_min: '',
  средняя_зп_max: ''
};

const columns: GridColDef[] = [
  { field: 'код_окэд', headerName: 'Код ОКЭД', width: 130 },
  { field: 'вид_деятельности', headerName: 'Вид деятельности', width: 300 },
  { field: 'количество_нп', headerName: 'Количество НП', width: 150, type: 'number' },
  { field: 'средняя_численность_работников', headerName: 'Средняя численность работников', width: 250, type: 'number' },
  { field: 'Сумма по полю ФОТ', headerName: 'Сумма ФОТ', width: 150, type: 'number' },
  { field: 'Сумма_по_полю_ср_зп', headerName: 'Средняя ЗП', width: 150, type: 'number' },
  { field: 'ИПН', headerName: 'ИПН', width: 130, type: 'string' },
  { field: 'СН', headerName: 'СН', width: 130, type: 'string' },
  { field: 'сумма_налогов', headerName: 'Сумма налогов', width: 150, type: 'number' },
  { field: 'удельный_вес', headerName: 'Удельный вес', width: 150, type: 'number' }
];

const DataTable: React.FC = () => {
  const [rows, setRows] = useState<DataRow[]>([]);
  const [originalRows, setOriginalRows] = useState<DataRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterValues, setFilterValues] = useState<FilterValues>(initialFilterValues);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedRows, setSelectedRows] = useState<GridRowSelectionModel>([]);
  const navigate = useNavigate();

  const fetchData = async (filters?: any) => {
    try {
      let url = '/data';
      if (filters) {
        const params = new URLSearchParams();
        Object.entries(filters).forEach(([key, value]) => {
          if (value) params.append(key, value as string);
        });
        url = `/search?${params.toString()}`;
      }
      
      const response = await api.get(url);
      const data = Array.isArray(response.data) ? response.data : response.data.data || [];
      const dataWithIds = data.map((row: DataRow) => ({
        ...row,
        Сумма_по_полю_ФОТ: row['Сумма по полю ФОТ']
      }));
      setRows(dataWithIds);
      setOriginalRows(dataWithIds);
      setError(null);
    } catch (err: any) {
      setError('Ошибка при загрузке данных');
      console.error('Error fetching data:', err.response?.data || err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSearch = () => {
    if (searchTerm) {
      const filteredRows = originalRows.filter(row => {
        const searchTermLower = searchTerm.toLowerCase();
        return (
          row.код_окэд.toLowerCase().includes(searchTermLower) ||
          row.вид_деятельности.toLowerCase().includes(searchTermLower)
        );
      });
      setRows(filteredRows);
    } else {
      setRows(originalRows);
    }
  };

  const handleFilter = () => {
    if (Object.values(filterValues).some(value => value !== '')) {
      const filteredRows = originalRows.filter(row => {
        // Проверка кода ОКЭД
        if (filterValues.код_окэд && !row.код_окэд.toLowerCase().includes(filterValues.код_окэд.toLowerCase())) {
          return false;
        }
        
        // Проверка вида деятельности
        if (filterValues.вид_деятельности && !row.вид_деятельности.toLowerCase().includes(filterValues.вид_деятельности.toLowerCase())) {
          return false;
        }
        
        // Проверка минимальной численности
        if (filterValues.средняя_численность_min && Number(row.средняя_численность_работников) < Number(filterValues.средняя_численность_min)) {
          return false;
        }
        
        // Проверка максимальной численности
        if (filterValues.средняя_численность_max && Number(row.средняя_численность_работников) > Number(filterValues.средняя_численность_max)) {
          return false;
        }
        
        // Проверка минимальной суммы налогов
        if (filterValues.сумма_налогов_min && Number(row.сумма_налогов) < Number(filterValues.сумма_налогов_min)) {
          return false;
        }
        
        // Проверка максимальной суммы налогов
        if (filterValues.сумма_налогов_max && Number(row.сумма_налогов) > Number(filterValues.сумма_налогов_max)) {
          return false;
        }

        // Проверка минимальной средней зарплаты
        if (filterValues.средняя_зп_min && Number(row.Сумма_по_полю_ср_зп) < Number(filterValues.средняя_зп_min)) {
          return false;
        }

        // Проверка максимальной средней зарплаты
        if (filterValues.средняя_зп_max && Number(row.Сумма_по_полю_ср_зп) > Number(filterValues.средняя_зп_max)) {
          return false;
        }
        
        return true;
      });
      setRows(filteredRows);
    } else {
      setRows(originalRows);
    }
    setShowFilters(false);
  };

  // Обработчик выбора строк
  const handleSelectionChange = (selectionModel: GridRowSelectionModel) => {
    setSelectedRows(selectionModel);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100%', width: '100%', p: 2 }}>
      {/* Панель инструментов */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <Box display="flex" gap={1}>
              <TextField
                fullWidth
                label="Поиск"
                variant="outlined"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
              <IconButton onClick={handleSearch}>
                <SearchIcon />
              </IconButton>
            </Box>
          </Grid>
          <Grid item xs={12} md={6}>
            <Box display="flex" justifyContent="flex-end" gap={1}>
              <Button
                variant="outlined"
                startIcon={<FilterIcon />}
                onClick={() => setShowFilters(true)}
              >
                Фильтры
              </Button>
              <Button
                variant="outlined"
                color="error"
                startIcon={<LogoutIcon />}
                onClick={handleLogout}
              >
                Выход
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* Кнопки экспорта */}
      <ExportButtons 
        selectedIds={selectedRows.map((id) => id.toString())} 
        filter={searchTerm} 
      />

      {/* Диаграммы */}
      <Box sx={{ mb: 2 }}>
        <DataCharts data={rows} />
      </Box>

      {/* Таблица данных */}
      <Paper sx={{ height: 800, width: '100%', mb: 2 }}>
        <DataGrid
          rows={rows}
          columns={columns}
          initialState={{
            pagination: {
              paginationModel: { pageSize: 10, page: 0 },
            },
          }}
          pageSizeOptions={[10, 25, 50, 100]}
          checkboxSelection
          disableRowSelectionOnClick
          onRowSelectionModelChange={handleSelectionChange}
        />
      </Paper>

      {/* Диалог фильтров */}
      <Dialog open={showFilters} onClose={() => setShowFilters(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Фильтры
          <IconButton
            onClick={() => setShowFilters(false)}
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Код ОКЭД"
                value={filterValues.код_окэд}
                onChange={(e) => setFilterValues({ ...filterValues, код_окэд: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Вид деятельности"
                value={filterValues.вид_деятельности}
                onChange={(e) => setFilterValues({ ...filterValues, вид_деятельности: e.target.value })}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Мин. численность"
                type="number"
                value={filterValues.средняя_численность_min}
                onChange={(e) => setFilterValues({ ...filterValues, средняя_численность_min: e.target.value })}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Макс. численность"
                type="number"
                value={filterValues.средняя_численность_max}
                onChange={(e) => setFilterValues({ ...filterValues, средняя_численность_max: e.target.value })}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Мин. сумма налогов"
                type="number"
                value={filterValues.сумма_налогов_min}
                onChange={(e) => setFilterValues({ ...filterValues, сумма_налогов_min: e.target.value })}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Макс. сумма налогов"
                type="number"
                value={filterValues.сумма_налогов_max}
                onChange={(e) => setFilterValues({ ...filterValues, сумма_налогов_max: e.target.value })}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Мин. средняя ЗП"
                type="number"
                value={filterValues.средняя_зп_min}
                onChange={(e) => setFilterValues({ ...filterValues, средняя_зп_min: e.target.value })}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Макс. средняя ЗП"
                type="number"
                value={filterValues.средняя_зп_max}
                onChange={(e) => setFilterValues({ ...filterValues, средняя_зп_max: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setFilterValues(initialFilterValues);
            fetchData();
            setShowFilters(false);
          }}>
            Сбросить
          </Button>
          <Button onClick={handleFilter} variant="contained">
            Применить
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DataTable; 