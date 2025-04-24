const { createCanvas } = require('canvas');
const { ChartJSNodeCanvas } = require('chartjs-node-canvas');
const ChartDataLabels = require('chartjs-plugin-datalabels');

const width = 800;
const height = 500; // Немного увеличим высоту, но не радикально

const chartCallback = (ChartJS) => {
  ChartJS.defaults.font.family = 'Arial';
  ChartJS.defaults.font.size = 14;
  ChartJS.register(ChartDataLabels);
};

const chartJSNodeCanvas = new ChartJSNodeCanvas({ width, height, chartCallback });

const generateBarChart = async (data, title, yAxisLabel) => {
  const formatNumber = (value) => {
    if (value >= 1000000000) {
      return (value / 1000000000).toFixed(1) + ' млрд';
    } else if (value >= 1000000) {
      return (value / 1000000).toFixed(1) + ' млн';
    } else if (value >= 1000) {
      return (value / 1000).toFixed(1) + ' тыс';
    }
    return value.toLocaleString('ru-RU');
  };

  const configuration = {
    type: 'bar',
    data: {
      labels: data.map(item => item.name),
      datasets: [{
        label: yAxisLabel,
        data: data.map(item => item.value),
        backgroundColor: 'rgba(54, 162, 235, 0.5)',
        borderColor: 'rgba(54, 162, 235, 1)',
        borderWidth: 1,
        maxBarThickness: 150,
        minBarLength: 50,
        categoryPercentage: 0.8,
        barPercentage: 0.9
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        title: {
          display: true,
          text: title,
          font: {
            size: 18,
            weight: 'bold'
          },
          padding: {
            top: 10,
            bottom: 30
          }
        },
        legend: {
          display: false
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              return `${yAxisLabel}: ${formatNumber(context.parsed.y)}`;
            }
          }
        },
        datalabels: {
          display: true,
          anchor: 'end',
          align: 'top',
          offset: 15,
          color: '#000',
          font: {
            size: 12,
            weight: 'bold'
          },
          formatter: function(value) {
            return formatNumber(value);
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: yAxisLabel,
            font: {
              size: 14,
              weight: 'bold'
            },
            padding: {
              top: 20,
              bottom: 20
            }
          },
          ticks: {
            callback: function(value) {
              return formatNumber(value);
            },
            font: {
              weight: 'bold',
              size: 12
            }
          }
        },
        x: {
          grid: {
            display: false
          },
          ticks: {
            maxRotation: 45,
            minRotation: 45,
            font: {
              weight: 'bold',
              size: 11
            },
            padding: 10,
            autoSkip: false,
            callback: function(value, index) {
              const label = this.getLabelForValue(value);
              const words = label.split(' ');
              let lines = [];
              let currentLine = words[0];
              
              for(let i = 1; i < words.length; i++) {
                if (currentLine.length + words[i].length < 20) {
                  currentLine += ' ' + words[i];
                } else {
                  lines.push(currentLine);
                  currentLine = words[i];
                }
              }
              lines.push(currentLine);
              return lines;
            }
          }
        }
      },
      layout: {
        padding: {
          top: 20,
          right: 20,
          bottom: 120,
          left: 20
        }
      }
    }
  };

  return await chartJSNodeCanvas.renderToBuffer(configuration);
};

const generatePieChart = async (data, title) => {
  const total = data.reduce((sum, item) => sum + (Number(item.value) || 0), 0);
  
  const configuration = {
    type: 'pie',
    data: {
      labels: data.map(item => item.name),
      datasets: [{
        data: data.map(item => Number(item.value) || 0),
        backgroundColor: [
          'rgba(255, 99, 132, 0.5)',
          'rgba(54, 162, 235, 0.5)',
          'rgba(255, 206, 86, 0.5)',
          'rgba(75, 192, 192, 0.5)',
          'rgba(153, 102, 255, 0.5)',
          'rgba(255, 159, 64, 0.5)',
          'rgba(199, 199, 199, 0.5)',
          'rgba(83, 102, 255, 0.5)',
          'rgba(255, 99, 255, 0.5)',
          'rgba(255, 159, 159, 0.5)'
        ],
        borderColor: [
          'rgba(255, 99, 132, 1)',
          'rgba(54, 162, 235, 1)',
          'rgba(255, 206, 86, 1)',
          'rgba(75, 192, 192, 1)',
          'rgba(153, 102, 255, 1)',
          'rgba(255, 159, 64, 1)',
          'rgba(199, 199, 199, 1)',
          'rgba(83, 102, 255, 1)',
          'rgba(255, 99, 255, 1)',
          'rgba(255, 159, 159, 1)'
        ],
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: title,
          font: {
            size: 16,
            weight: 'bold'
          }
        },
        legend: {
          position: 'right',
          labels: {
            font: {
              size: 11,
              weight: 'bold'
            }
          }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const value = Number(context.parsed) || 0;
              const percentage = ((value / total) * 100).toFixed(1);
              return `${context.label}: ${percentage}%`;
            }
          }
        },
        datalabels: {
          display: true,
          color: '#000',
          font: {
            size: 16,
            weight: 'bold'
          },
          formatter: function(value) {
            value = Number(value) || 0;
            const percentage = ((value / total) * 100).toFixed(1);
            return `${percentage}%`;
          }
        }
      }
    }
  };

  return await chartJSNodeCanvas.renderToBuffer(configuration);
};

module.exports = {
  generateBarChart,
  generatePieChart
}; 