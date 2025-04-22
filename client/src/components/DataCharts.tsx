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
} from '@mui/material';
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

interface DataRow {
  код_окэд: string;
  вид_деятельности: string;
  средняя_численность_работников: number;
  Сумма_по_полю_ФОТ: number;
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

  const prepareChartData = () => {
    const totalFund = data.reduce((sum, row) => sum + row.Сумма_по_полю_ФОТ, 0);
    const sortedData = [...data].sort((a, b) => {
      if (selectedChart === 'workforce') {
        return b.средняя_численность_работников - a.средняя_численность_работников;
      } else if (selectedChart === 'salary') {
        return b.Сумма_по_полю_ср_зп - a.Сумма_по_полю_ср_зп;
      } else {
        return b.Сумма_по_полю_ФОТ - a.Сумма_по_полю_ФОТ;
      }
    });

    return sortedData.slice(0, 10).map(row => {
      const fundPercentage = (row.Сумма_по_полю_ФОТ / totalFund) * 100;
      return {
        name: row.вид_деятельности.length > 30 
          ? row.вид_деятельности.substring(0, 30) + '...'
          : row.вид_деятельности,
        fullName: row.вид_деятельности,
        code: row.код_окэд,
        workforce: row.средняя_численность_работников,
        salary: row.Сумма_по_полю_ср_зп,
        fund: row.Сумма_по_полю_ФОТ,
        fundPercentage,
        totalFund
      };
    });
  };

  const getChartHeight = () => {
    if (chartType === 'pie') return 600;
    return 600;
  };

  const renderWorkforceChart = () => {
    const chartData = prepareChartData();
    
    // Статические тестовые данные для отладки
    const staticWorkforceData = [
      { name: "Гос.Органы", value: 500000 },
      { name: "Сельское хозяйство", value: 320000 },
      { name: "Промышленность", value: 280000 },
      { name: "Торговля", value: 200000 },
      { name: "Строительство", value: 180000 },
      { name: "Образование", value: 150000 },
      { name: "Здравоохранение", value: 120000 },
      { name: "Транспорт", value: 90000 },
      { name: "Информация и связь", value: 70000 },
      { name: "Финансы", value: 50000 }
    ];

    return chartType === 'bar' ? (
      <ResponsiveContainer width="100%" height={600}>
        <BarChart data={chartData} margin={{ top: 20, right: 30, left: 250, bottom: 150 }}>
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
        <h3 style={{ textAlign: 'center' }}>Распределение численности работников (топ-10)</h3>
        <ResponsiveContainer width="100%" height="80%">
          <PieChart>
            <Pie
              data={staticWorkforceData}
              cx="50%"
              cy="50%"
              labelLine={false}
              outerRadius={200}
              fill="#8884d8"
              dataKey="value"
              nameKey="name"
              label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
            >
              {staticWorkforceData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value) => formatValue(Number(value))} />
            <Legend 
              layout="vertical"
              align="right"
              verticalAlign="middle"
              wrapperStyle={{
                marginRight: "200px"
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    );
  };

  const renderSalaryChart = () => {
    const chartData = prepareChartData();
    
    // Статические тестовые данные для отладки
    const staticSalaryData = [
      { name: "Финансы", value: 350000 },
      { name: "Информация и связь", value: 320000 },
      { name: "Гос.Органы", value: 280000 },
      { name: "Добыча полезных ископаемых", value: 250000 },
      { name: "Энергетика", value: 220000 },
      { name: "Транспорт", value: 180000 },
      { name: "Строительство", value: 160000 },
      { name: "Промышленность", value: 150000 },
      { name: "Торговля", value: 130000 },
      { name: "Сельское хозяйство", value: 100000 }
    ];

    return chartType === 'bar' ? (
      <ResponsiveContainer width="100%" height={600}>
        <BarChart data={chartData} margin={{ top: 20, right: 30, left: 250, bottom: 150 }}>
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
        <h3 style={{ textAlign: 'center' }}>Распределение средней зарплаты (топ-10)</h3>
        <ResponsiveContainer width="100%" height="80%">
          <PieChart>
            <Pie
              data={staticSalaryData}
              cx="50%"
              cy="50%"
              labelLine={false}
              outerRadius={200}
              fill="#82ca9d"
              dataKey="value"
              nameKey="name"
              label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
            >
              {staticSalaryData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value) => formatValue(Number(value))} />
            <Legend 
              layout="vertical"
              align="right"
              verticalAlign="middle"
              wrapperStyle={{
                marginRight: "200px"
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    );
  };

  const renderFundChart = () => {
    const chartData = prepareChartData();
    
    // Статические тестовые данные для отладки
    const staticTestData = [
      { name: "Гос.Органы", value: 5000000000 },
      { name: "Сельское хозяйство", value: 2500000000 },
      { name: "Промышленность", value: 1500000000 },
      { name: "Торговля", value: 800000000 },
      { name: "Строительство", value: 700000000 },
      { name: "Образование", value: 600000000 },
      { name: "Здравоохранение", value: 550000000 },
      { name: "Транспорт", value: 450000000 },
      { name: "Информация и связь", value: 400000000 },
      { name: "Финансы", value: 300000000 }
    ];

    return chartType === 'bar' ? (
      <ResponsiveContainer width="100%" height={600}>
        <BarChart data={chartData} margin={{ top: 20, right: 30, left: 250, bottom: 150 }}>
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
        <h3 style={{ textAlign: 'center' }}>Распределение фонда оплаты труда (топ-10)</h3>
        <ResponsiveContainer width="100%" height="80%">
          <PieChart>
            <Pie
              data={staticTestData}
              cx="50%"
              cy="50%"
              labelLine={false}
              outerRadius={200}
              fill="#8884d8"
              dataKey="value"
              nameKey="name"
              label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
            >
              {staticTestData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value) => formatValue(Number(value))} />
            <Legend 
              layout="vertical"
              align="right"
              verticalAlign="middle"
              wrapperStyle={{
                marginRight: "200px"
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    );
  };

  return (
    <Paper sx={{ p: 3 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Аналитика по видам деятельности (топ-10)
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
        </Box>
      </Box>
      {selectedChart === 'workforce' && renderWorkforceChart()}
      {selectedChart === 'salary' && renderSalaryChart()}
      {selectedChart === 'fund' && renderFundChart()}
    </Paper>
  );
};

export default DataCharts; 