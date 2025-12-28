import React from 'react';
import { ArrowUpRight, ArrowDownRight, AlertCircle, DollarSign, Package, Activity, TrendingUp } from 'lucide-react';
import { KPIData } from '../types';

interface KPICardProps {
  data: KPIData;
  index: number;
}

const KPICard: React.FC<KPICardProps> = ({ data, index }) => {
  
  // Helper to determine icon based on label (mock logic for demo)
  const getIcon = () => {
    if (data.label.includes('Valor')) return <DollarSign className="w-5 h-5 text-blue-600" />;
    if (data.label.includes('Bajo Stock')) return <AlertCircle className="w-5 h-5 text-red-600" />;
    if (data.label.includes('Movimientos')) return <Activity className="w-5 h-5 text-indigo-600" />;
    if (data.label.includes('Margen')) return <TrendingUp className="w-5 h-5 text-emerald-600" />;
    return <Package className="w-5 h-5 text-gray-600" />;
  };

  const getBgColor = () => {
    if (data.label.includes('Valor')) return 'bg-blue-50';
    if (data.label.includes('Bajo Stock')) return 'bg-red-50';
    if (data.label.includes('Movimientos')) return 'bg-indigo-50';
    if (data.label.includes('Margen')) return 'bg-emerald-50';
    return 'bg-gray-50';
  };

  return (
    <div className="bg-white rounded-xl shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] p-5 border border-gray-100 hover:shadow-lg transition-shadow duration-300 relative overflow-hidden group">
      <div className="flex justify-between items-start mb-4">
        <div className={`p-2.5 rounded-lg ${getBgColor()}`}>
          {getIcon()}
        </div>
        {data.trend && (
           <div className={`flex items-center text-xs font-semibold px-2 py-1 rounded-full ${
             data.trend === 'up' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
           }`}>
             {data.trend === 'up' ? <ArrowUpRight size={14} className="mr-1" /> : <ArrowDownRight size={14} className="mr-1" />}
             {data.trendValue}
           </div>
        )}
      </div>
      
      <div>
        <h3 className="text-gray-500 text-sm font-medium mb-1">{data.label}</h3>
        <p className={`text-2xl font-bold tracking-tight ${data.alert ? 'text-red-600' : 'text-gray-900'}`}>
          {data.value}
        </p>
        {data.subValue && (
          <p className="text-xs text-gray-400 mt-2 font-medium">
            {data.subValue}
          </p>
        )}
      </div>

      {/* Decorative element */}
      <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-gray-50 rounded-full opacity-0 group-hover:opacity-50 transition-opacity duration-500 pointer-events-none"></div>
    </div>
  );
};

export default KPICard;