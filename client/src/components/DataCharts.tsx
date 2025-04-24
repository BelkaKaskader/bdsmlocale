import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  ToggleButton,
  ToggleButtonGroup,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import api from '../api/axios';

interface DataRow {
  код_окэд: string;
  вид_деятельности: string;
  средняя_численность_работников: number;
  'Сумма по полю ФОТ': number;
  Сумма_по_полю_ср_зп: number;
}

interface DataChartsProps {
  data: DataRow[];
}

interface ChartDataEntry {
  name: string;
  fullName: string;
  code: string;
  workforce: number;
  salary: number;
  fund: number;
  percentage: number;
}

interface LegendPayload {
  value: any;
  payload: ChartDataEntry;
}

interface TooltipPayload extends LegendPayload {
  strokeDasharray?: string | number;
}

interface CustomTooltipProps {
  payload?: Array<{
    value: number;
    name: string;
    payload: {
      fullName: string;
    };
    percent: number;
  }>;
}

interface LegendPayloadItem {
  value: any;
  payload: {
    name: string;
    fund: number;
  };
}

const COLORS = [
  '#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8',
  '#82CA9D', '#FDB462', '#B3DE69', '#FCCDE5', '#D9D9D9',
];

const formatValue = (value: number): string => {
  if (value >= 1000000000) {
    return `${(value / 1000000000).toFixed(1)} млрд`;
  } else if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)} млн`;
  } else if (value >= 1000) {
    return `${(value / 1000).toFixed(1)} тыс`;
  }
  return value.toString();
};

const formatPercent = (value: number): string => {
  return `${value.toFixed(1)}%`;
};

const DataCharts: React.FC<DataChartsProps> = ({ data }) => {
  const [selectedChart, setSelectedChart] = useState('workforce');
  const [chartType, setChartType] = useState<'bar' | 'pie'>('bar');
  const [showRelatedDialog, setShowRelatedDialog] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState('');
  const [relatedData, setRelatedData] = useState<any[]>([]);
  const [topCount, setTopCount] = useState<number>(10);

  const prepareChartData = () => {
    const totalFund = data.reduce((sum, row) => sum + Number(row['Сумма по полю ФОТ'] || 0), 0);
    const sortedData = [...data].sort((a, b) => {
      if (selectedChart === 'workforce') {
        return Number(b.средняя_численность_работников || 0) - Number(a.средняя_численность_работников || 0);
      } else if (selectedChart === 'salary') {
        return Number(b.Сумма_по_полю_ср_зп || 0) - Number(a.Сумма_по_полю_ср_зп || 0);
      } else {
        return Number(b['Сумма по полю ФОТ'] || 0) - Number(a['Сумма по полю ФОТ'] || 0);
      }
    });

    return sortedData.slice(0, topCount).map(row => ({
      name: row.вид_деятельности.length > 30 
        ? row.вид_деятельности.substring(0, 30) + '...'
        : row.вид_деятельности,
      fullName: row.вид_деятельности,
      code: row.код_окэд,
      value: selectedChart === 'workforce' 
        ? Number(row.средняя_численность_работников || 0)
        : selectedChart === 'salary'
        ? Number(row.Сумма_по_полю_ср_зп || 0)
        : Number(row['Сумма по полю ФОТ'] || 0),
      workforce: Number(row.средняя_численность_работников || 0),
      salary: Number(row.Сумма_по_полю_ср_зп || 0),
      fund: Number(row['Сумма по полю ФОТ'] || 0),
      fundPercentage: totalFund > 0 ? (Number(row['Сумма по полю ФОТ'] || 0) / totalFund) * 100 : 0,
      totalFund
    }));
  };

  const getChartHeight = () => {
    if (chartType === 'pie') return 600;
    return 600;
  };

  const handleChartClick = async (data: any) => {
    if (data && data.activePayload && data.activePayload[0]) {
      const activity = data.activePayload[0].payload.fullName;
      try {
        const response = await api.get(`/related-data/${encodeURIComponent(activity)}`);
        setRelatedData(response.data);
        setSelectedActivity(activity);
        setShowRelatedDialog(true);
      } catch (err) {
        console.error('Ошибка при получении связанных данных:', err);
      }
    }
  };

  const handlePieClick = async (data: any, index: number) => {
    if (data && data.name) {
      try {
        const response = await api.get(`/related-data/${encodeURIComponent(data.fullName)}`);
        setRelatedData(response.data);
        setSelectedActivity(data.fullName);
        setShowRelatedDialog(true);
      } catch (err) {
        console.error('Ошибка при получении связанных данных:', err);
      }
    }
  };

  const handleCloseDialog = () => {
    setShowRelatedDialog(false);
    setRelatedData([]);
  };

  const renderWorkforceChart = () => {
    const chartData = prepareChartData();
    
    return chartType === 'bar' ? (
      <ResponsiveContainer width="100%" height={600}>
        <BarChart 
          data={chartData} 
          margin={{ top: 20, right: 30, left: 250, bottom: 150 }}
          onClick={handleChartClick}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="name"
            angle={-45}
            textAnchor="end"
            interval={0}
            height={100}
          />
          <YAxis 
            label={{ 
              value: 'Численность работников', 
              angle: -90, 
              position: 'outside', 
              offset: 10,
              style: { textAnchor: 'middle' } 
            }}
            tickFormatter={formatValue}
            width={220}
            domain={[0, 2000]}
          />
          <Tooltip 
            formatter={(value) => formatValue(Number(value))}
            labelFormatter={(label) => `${label}`}
          />
          <Legend
            verticalAlign="bottom"
            align="center"
            layout="vertical"
            height={50}
            wrapperStyle={{ 
              paddingTop: "50px",
              marginTop: "20px",
              bottom: 0
            }}
          />
          <Bar dataKey="workforce" name="Численность" fill="#8884d8" />
        </BarChart>
      </ResponsiveContainer>
    ) : (
      <div style={{ width: '100%', height: '600px' }}>
        <h3 style={{ textAlign: 'center' }}>Распределение численности работников (топ-{topCount})</h3>
        <ResponsiveContainer width="100%" height={400}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={true}
              outerRadius={160}
              innerRadius={0}
              paddingAngle={5}
              fill="#8884d8"
              dataKey="value"
              nameKey="name"
              label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
              onClick={handlePieClick}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value) => formatValue(Number(value))} />
            <Legend 
              layout="vertical"
              align="right"
              verticalAlign="middle"
              wrapperStyle={{
                marginRight: "20px",
                paddingRight: "100px"
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    );
  };

  const renderSalaryChart = () => {
    const chartData = prepareChartData();
    
    return chartType === 'bar' ? (
      <ResponsiveContainer width="100%" height={600}>
        <BarChart 
          data={chartData} 
          margin={{ top: 20, right: 30, left: 250, bottom: 150 }}
          onClick={handleChartClick}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="name"
            angle={-45}
            textAnchor="end"
            interval={0}
            height={100}
          />
          <YAxis 
            label={{ 
              value: 'Средняя зарплата (тыс)', 
              angle: -90, 
              position: 'outside', 
              offset: 30,
              style: { textAnchor: 'middle' } 
            }}
            tickFormatter={formatValue}
            width={200}
            domain={[0, 400000]}
          />
          <Tooltip 
            formatter={(value) => formatValue(Number(value))}
            labelFormatter={(label) => `${label}`}
          />
          <Legend
            verticalAlign="bottom"
            align="center"
            layout="vertical"
            height={50}
            wrapperStyle={{ 
              paddingTop: "50px",
              marginTop: "20px",
              bottom: 0
            }}
          />
          <Bar dataKey="salary" name="Средняя зарплата" fill="#82ca9d" />
        </BarChart>
      </ResponsiveContainer>
    ) : (
      <div style={{ width: '100%', height: '600px' }}>
        <h3 style={{ textAlign: 'center' }}>Распределение средней зарплаты (топ-{topCount})</h3>
        <ResponsiveContainer width="100%" height={400}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={true}
              outerRadius={160}
              innerRadius={0}
              paddingAngle={5}
              fill="#82ca9d"
              dataKey="value"
              nameKey="name"
              label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
              onClick={handlePieClick}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value) => formatValue(Number(value))} />
            <Legend 
              layout="vertical"
              align="right"
              verticalAlign="middle"
              wrapperStyle={{
                marginRight: "20px",
                paddingRight: "100px"
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    );
  };

  const renderFundChart = () => {
    const chartData = prepareChartData();
    
    return chartType === 'bar' ? (
      <ResponsiveContainer width="100%" height={600}>
        <BarChart 
          data={chartData} 
          margin={{ top: 20, right: 30, left: 250, bottom: 150 }}
          onClick={handleChartClick}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="name"
            angle={-45}
            textAnchor="end"
            interval={0}
            height={100}
          />
          <YAxis 
            label={{ 
              value: 'Фонд оплаты труда (млрд)', 
              angle: -90, 
              position: 'outside', 
              offset: 10,
              style: { textAnchor: 'middle' } 
            }}
            tickFormatter={formatValue}
            width={220}
            domain={[0, 6000000000]}
          />
          <Tooltip 
            formatter={(value) => formatValue(Number(value))}
            labelFormatter={(label) => `${label}`}
          />
          <Legend
            verticalAlign="bottom"
            align="center"
            layout="vertical"
            height={50}
            wrapperStyle={{ 
              paddingTop: "50px",
              marginTop: "20px",
              bottom: 0
            }}
          />
          <Bar dataKey="fund" name="ФОТ" fill="#ffc658" />
        </BarChart>
      </ResponsiveContainer>
    ) : (
      <div style={{ width: '100%', height: '600px' }}>
        <h3 style={{ textAlign: 'center' }}>Распределение фонда оплаты труда (топ-{topCount})</h3>
        <ResponsiveContainer width="100%" height={400}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={true}
              outerRadius={160}
              innerRadius={0}
              paddingAngle={5}
              fill="#8884d8"
              dataKey="value"
              nameKey="name"
              label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
              onClick={handlePieClick}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value) => formatValue(Number(value))} />
            <Legend 
              layout="vertical"
              align="right"
              verticalAlign="middle"
              wrapperStyle={{
                marginRight: "20px",
                paddingRight: "100px"
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    );
  };

  return (
    <>
      <Paper sx={{ p: 3 }}>
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Аналитика по видам деятельности (топ-{topCount})
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            <FormControl>
              <InputLabel>Тип данных</InputLabel>
              <Select
                value={selectedChart}
                onChange={(e) => setSelectedChart(e.target.value)}
                label="Тип данных"
              >
                <MenuItem value="workforce">Численность работников</MenuItem>
                <MenuItem value="salary">Среднемесячная зарплата</MenuItem>
                <MenuItem value="fund">Фонд оплаты труда</MenuItem>
              </Select>
            </FormControl>
            <FormControl>
              <InputLabel>Тип диаграммы</InputLabel>
              <Select
                value={chartType}
                onChange={(e) => setChartType(e.target.value as 'bar' | 'pie')}
                label="Тип диаграммы"
              >
                <MenuItem value="bar">Столбчатая</MenuItem>
                <MenuItem value="pie">Круговая</MenuItem>
              </Select>
            </FormControl>
            <FormControl>
              <InputLabel>Количество записей</InputLabel>
              <Select
                value={topCount}
                onChange={(e) => setTopCount(Number(e.target.value))}
                label="Количество записей"
              >
                <MenuItem value={10}>Топ 10</MenuItem>
                <MenuItem value={15}>Топ 15</MenuItem>
                <MenuItem value={25}>Топ 25</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </Box>
        {selectedChart === 'workforce' && renderWorkforceChart()}
        {selectedChart === 'salary' && renderSalaryChart()}
        {selectedChart === 'fund' && renderFundChart()}
      </Paper>

      <Dialog
        open={showRelatedDialog}
        onClose={handleCloseDialog}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          Связанные данные для: {selectedActivity}
          <IconButton
            onClick={handleCloseDialog}
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
          <Button onClick={handleCloseDialog}>Закрыть</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default DataCharts; 