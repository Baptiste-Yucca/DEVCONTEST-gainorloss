// components/DailyDataChart.tsx
import React, { useRef } from 'react';
import { Line } from 'react-chartjs-2';
import { DailyData } from '../types/dailyData';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

// Enregistrement des composants Chart.js nécessaires
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface DailyDataChartProps {
  dailyData: DailyData[];
  onCaptureImage?: (imageData: string) => void;
}

const DailyDataChart: React.FC<DailyDataChartProps> = ({ dailyData, onCaptureImage }) => {
  const chartRef = useRef<HTMLDivElement>(null);

  if (!dailyData || dailyData.length === 0) {
    return (
      <div className="mt-8 text-center text-gray-600">
        Aucune donnée disponible pour ce graphique
      </div>
    );
  }

  // Trier les données par date (du plus ancien au plus récent)
  const sortedData = [...dailyData].sort((a, b) => parseInt(a.date) - parseInt(b.date));

  // Formater les dates pour l'affichage
  const formatDisplayDate = (dateStr: string) => {
    const year = dateStr.substring(0, 4);
    const month = dateStr.substring(4, 6);
    const day = dateStr.substring(6, 8);
    return `${year}/${month}/${day}`;
  };

  // Préparer les données pour le graphique
  const labels = sortedData.map(data => formatDisplayDate(data.date));
  const debtAmounts = sortedData.map(data => Number(data.amount) / 1000000); // Convertir BigInt en nombre et USDC en unités lisibles
  const interestAmounts = sortedData.map(data => Number(data.interest) / 1000000); // Convertir BigInt en nombre et USDC en unités lisibles

  const chartData = {
    labels,
    datasets: [
      {
        label: 'Dette (USDC)',
        data: debtAmounts,
        borderColor: 'rgb(255, 99, 132)',
        backgroundColor: 'rgba(255, 99, 132, 0.5)',
        yAxisID: 'y',
      },
      {
        label: 'Intérêts journaliers (USDC)',
        data: interestAmounts,
        borderColor: 'rgb(53, 162, 235)',
        backgroundColor: 'rgba(53, 162, 235, 0.5)',
        yAxisID: 'y1',
      },
    ],
  };

  const options = {
    responsive: true,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    stacked: false,
    plugins: {
      title: {
        display: true,
        text: 'Évolution de la dette et des intérêts journaliers',
      },
    },
    scales: {
      y: {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        title: {
          display: true,
          text: 'Dette (USDC)',
        },
      },
      y1: {
        type: 'linear' as const,
        display: true,
        position: 'right' as const,
        grid: {
          drawOnChartArea: false,
        },
        title: {
          display: true,
          text: 'Intérêts journaliers (USDC)',
        },
      },
    },
  };

  return (
    <div className="mt-6 bg-white rounded-xl shadow-md p-6 border border-gray-200">
      <h3 className="text-lg font-semibold mb-6 text-indigo-700 text-center">Évolution de votre dette et des intérêts</h3>
      <div className="h-80" ref={chartRef}>
        <Line options={options} data={chartData} />
      </div>
    </div>
  );
};

export default DailyDataChart;