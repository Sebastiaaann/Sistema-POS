import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { ChartDataPoint } from '../types';

interface MovementsChartProps {
  data: ChartDataPoint[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 border border-gray-100 shadow-xl rounded-lg text-xs">
        <p className="font-bold text-gray-800 mb-2">{label}</p>
        <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
            <span className="text-gray-600">Entradas:</span>
            <span className="font-bold text-gray-900">{payload[0].value}</span>
        </div>
        <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-rose-500"></div>
            <span className="text-gray-600">Salidas:</span>
            <span className="font-bold text-gray-900">{payload[1].value}</span>
        </div>
      </div>
    );
  }
  return null;
};

const MovementsChart: React.FC<MovementsChartProps> = ({ data }) => {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="font-semibold text-gray-800">Entradas vs Salidas</h3>
          <p className="text-xs text-gray-400 mt-1">Últimos 30 días de actividad</p>
        </div>
        <select className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 text-gray-600 bg-gray-50 focus:outline-none focus:ring-1 focus:ring-blue-500">
          <option>Últimos 30 días</option>
          <option>Esta semana</option>
          <option>Este año</option>
        </select>
      </div>
      
      <div className="flex-1 w-full min-h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{
              top: 5,
              right: 10,
              left: -20,
              bottom: 0,
            }}
            barSize={12}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis 
              dataKey="name" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#94a3b8', fontSize: 11 }} 
              dy={10}
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#94a3b8', fontSize: 11 }} 
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
            <Legend 
              iconType="circle" 
              wrapperStyle={{ fontSize: '12px', paddingTop: '15px' }}
            />
            <Bar 
                dataKey="entradas" 
                name="Entradas" 
                fill="#10b981" 
                radius={[4, 4, 0, 0]} 
                stackId="stack"
            />
            <Bar 
                dataKey="salidas" 
                name="Salidas" 
                fill="#f43f5e" 
                radius={[4, 4, 0, 0]} 
                stackId="stack" // Remove stackId if you want side-by-side
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default MovementsChart;