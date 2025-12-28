import React from 'react';
import { ArrowUpCircle, ArrowDownCircle, AlertTriangle, MoreHorizontal } from 'lucide-react';
import { Movement } from '../types';

interface RecentMovementsProps {
  movements: Movement[];
}

const RecentMovements: React.FC<RecentMovementsProps> = ({ movements }) => {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col h-full">
      <div className="p-5 border-b border-gray-100 flex justify-between items-center">
        <h3 className="font-semibold text-gray-800">Últimos Movimientos</h3>
        <button className="text-gray-400 hover:text-gray-600">
          <MoreHorizontal size={20} />
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-2">
        <ul className="space-y-1">
          {movements.map((movement) => (
            <li key={movement.id} className="flex items-center p-3 hover:bg-gray-50 rounded-lg transition-colors group">
              <div className="flex-shrink-0 mr-4">
                {movement.type === 'in' && <ArrowUpCircle className="w-8 h-8 text-emerald-500 bg-emerald-50 rounded-full p-1" />}
                {movement.type === 'out' && <ArrowDownCircle className="w-8 h-8 text-rose-500 bg-rose-50 rounded-full p-1" />}
                {movement.type === 'adjustment' && <AlertTriangle className="w-8 h-8 text-amber-500 bg-amber-50 rounded-full p-1" />}
              </div>
              
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {movement.productName}
                </p>
                <div className="flex items-center mt-0.5">
                   <img src={movement.userAvatar} alt={movement.userName} className="w-4 h-4 rounded-full mr-1.5" />
                   <p className="text-xs text-gray-500 truncate">
                      por {movement.userName}
                   </p>
                </div>
              </div>

              <div className="flex flex-col items-end ml-4">
                <span className={`text-sm font-bold ${
                  movement.quantity > 0 ? 'text-emerald-600' : 'text-rose-600'
                }`}>
                  {movement.quantity > 0 ? `+${movement.quantity}` : movement.quantity}
                </span>
                <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded mt-1">
                  {movement.timestamp}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </div>
      
      <div className="p-4 border-t border-gray-50 text-center">
        <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
          Ver todo el historial
        </button>
      </div>
    </div>
  );
};

export default RecentMovements;