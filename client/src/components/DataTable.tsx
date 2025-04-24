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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterList as FilterIcon,
  Close as CloseIcon,
  Logout as LogoutIcon,
  Info as InfoIcon
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
  Наименование?: string;
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

const DataTable: React.FC = () => {
  const [rows, setRows] = useState<DataRow[]>([]);
  const [originalRows, setOriginalRows] = useState<DataRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterValues, setFilterValues] = useState<FilterValues>(initialFilterValues);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedRows, setSelectedRows] = useState<GridRowSelectionModel>([]);
  const [relatedData, setRelatedData] = useState<any[]>([]);
  const [showRelatedDialog, setShowRelatedDialog] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState('');
  const [hasRelatedData, setHasRelatedData] = useState<{[key: string]: boolean}>({});
  const navigate = useNavigate();

  const handleShowRelatedData = async (activity: string) => {
    try {
      const response = await api.get(`/related-data/${encodeURIComponent(activity)}`);
      const data = response.data;
      setRelatedData(data);
      setSelectedActivity(activity);
      setShowRelatedDialog(true);
    } catch (err) {
      console.error('Ошибка при получении связанных данных:', err);
    }
  };

  const handleCloseRelatedDialog = () => {
    setShowRelatedDialog(false);
    setRelatedData([]);
  };

  const columns: GridColDef[] = [
    { 
      field: 'actions', 
      headerName: 'Действия', 
      width: 80,
      renderHeader: () => (
        <div style={{ whiteSpace: 'normal', lineHeight: '1.2' }}>
          Действия
        </div>
      ),
      renderCell: (params) => (
        <IconButton
          onClick={() => handleShowRelatedData(params.row.вид_деятельности)}
          size="small"
          sx={{
            color: hasRelatedData[params.row.вид_деятельности] ? 'success.main' : 'action.disabled',
            '&:hover': {
              color: hasRelatedData[params.row.вид_деятельности] ? 'success.dark' : 'action.disabled',
            }
          }}
        >
          <InfoIcon />
        </IconButton>
      ),
    },
    { 
      field: 'код_окэд', 
      headerName: 'Код ОКЭД', 
      width: 100,
      renderHeader: () => (
        <div style={{ whiteSpace: 'normal', lineHeight: '1.2' }}>
          Код ОКЭД
        </div>
      )
    },
    { field: 'вид_деятельности', headerName: 'Вид деятельности', width: 300 },
    { 
      field: 'количество_нп', 
      headerName: 'Количество НП', 
      width: 140,
      renderHeader: () => (
        <div style={{ whiteSpace: 'normal', lineHeight: '1.2' }}>
          Количество НП
        </div>
      )
    },
    { 
      field: 'средняя_численность_работников', 
      headerName: 'Средняя численность работников', 
      width: 200,
      renderHeader: () => (
        <div style={{ whiteSpace: 'normal', lineHeight: '1.2' }}>
          Средняя численность работников
        </div>
      )
    },
    { 
      field: 'Сумма по полю ФОТ', 
      headerName: 'Сумма ФОТ', 
      width: 120,
      renderHeader: () => (
        <div style={{ whiteSpace: 'normal', lineHeight: '1.2' }}>
          Сумма ФОТ
        </div>
      )
    },
    { 
      field: 'Сумма_по_полю_ср_зп', 
      headerName: 'Средняя ЗП', 
      width: 120,
      renderHeader: () => (
        <div style={{ whiteSpace: 'normal', lineHeight: '1.2' }}>
          Средняя ЗП
        </div>
      )
    },
    { field: 'ИПН', headerName: 'ИПН', width: 100 },
    { field: 'СН', headerName: 'СН', width: 100 },
    { 
      field: 'сумма_налогов', 
      headerName: 'Сумма налогов', 
      width: 120,
      renderHeader: () => (
        <div style={{ whiteSpace: 'normal', lineHeight: '1.2' }}>
          Сумма налогов
        </div>
      )
    },
    { 
      field: 'удельный_вес', 
      headerName: 'Удельный вес', 
      width: 120,
      renderHeader: () => (
        <div style={{ whiteSpace: 'normal', lineHeight: '1.2' }}>
          Удельный вес
        </div>
      )
    }
  ];

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

      // Загружаем информацию о наличии связанных данных
      const relatedDataInfo = await Promise.all(
        dataWithIds.map(async (row: DataRow) => {
          try {
            const relatedResponse = await api.get(`/related-data/${encodeURIComponent(row.вид_деятельности)}`);
            return { activity: row.вид_деятельности, hasData: relatedResponse.data && relatedResponse.data.length > 0 };
          } catch (err) {
            console.error(`Ошибка при проверке связанных данных для ${row.вид_деятельности}:`, err);
            return { activity: row.вид_деятельности, hasData: false };
          }
        })
      );

      // Обновляем состояние наличия данных
      const newHasRelatedData = relatedDataInfo.reduce((acc, { activity, hasData }) => {
        acc[activity] = hasData;
        return acc;
      }, {} as { [key: string]: boolean });

      setHasRelatedData(newHasRelatedData);
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
      const searchTermLower = searchTerm.toLowerCase().trim();
      const filteredRows = originalRows.filter(row => {
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

  const handleClearSearch = () => {
    setSearchTerm('');
    setRows(originalRows);
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
              {searchTerm && (
                <IconButton onClick={handleClearSearch} color="error">
                  <CloseIcon />
                </IconButton>
              )}
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

      {/* Диалог со связанными данными */}
      <Dialog
        open={showRelatedDialog}
        onClose={handleCloseRelatedDialog}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          Связанные данные для: {selectedActivity}
          <IconButton
            onClick={handleCloseRelatedDialog}
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Код ОКЭД</TableCell>
                  <TableCell>ОКЭД</TableCell>
                  <TableCell>ИИН/БИН</TableCell>
                  <TableCell>Код НУ</TableCell>
                  <TableCell>Кол-во чел</TableCell>
                  <TableCell>Ср.числ</TableCell>
                  <TableCell>ФОТ</TableCell>
                  <TableCell>Ср.зп</TableCell>
                  <TableCell>Наименование</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {relatedData.map((row, index) => (
                  <TableRow key={index}>
                    <TableCell>{row['Код ОКЭД']}</TableCell>
                    <TableCell>{row['ОКЭД']}</TableCell>
                    <TableCell>{row['ИИН/БИН']}</TableCell>
                    <TableCell>{row['Код НУ']}</TableCell>
                    <TableCell>{row['Кол-во_чел']}</TableCell>
                    <TableCell>{row['Ср.числ']}</TableCell>
                    <TableCell>{row['ФОТ']}</TableCell>
                    <TableCell>{row['Ср.зп']}</TableCell>
                    <TableCell>{row['Наименование']}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseRelatedDialog}>Закрыть</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DataTable; 