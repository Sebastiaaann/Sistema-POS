import React from 'react';
import {
  LayoutDashboard,
  Package,
  ArrowUpDown,
  Users,
  PieChart,
  CreditCard,
  Settings,
  LogOut,
  ChevronDown,
  Building2,
  Grid3x3
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  currentView: string;
  onNavigate: (view: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose, currentView, onNavigate }) => {
  return (
    <>
      {/* Mobile Overlay */}
      <div
        className={`fixed inset-0 z-20 bg-gray-900/50 lg:hidden transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />

      {/* Sidebar Container */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-30 w-64 bg-[#1e3a8a] text-white transform transition-transform duration-300 ease-in-out lg:transform-none flex flex-col ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        {/* Header Sidebar */}
        <div className="h-16 flex items-center px-6 border-b border-blue-800/50">
          <div className="flex items-center gap-2 cursor-pointer w-full hover:bg-blue-800/30 p-2 -ml-2 rounded-lg transition-colors">
            <div className="bg-white p-1 rounded">
              <Building2 className="w-5 h-5 text-blue-900" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-sm font-bold truncate">TechStock</h1>
              <p className="text-xs text-blue-200 truncate">Sistema de Inventario</p>
            </div>
            <ChevronDown className="w-4 h-4 text-blue-300" />
          </div>
        </div>

        {/* Main Menu */}
        <div className="flex-1 overflow-y-auto py-6 px-4 custom-scrollbar space-y-1">
          <p className="px-2 text-xs font-semibold text-blue-300 uppercase tracking-wider mb-2">Principal</p>

          <NavItem
            icon={<LayoutDashboard size={20} />}
            label="Dashboard"
            active={currentView === 'dashboard'}
            onClick={() => onNavigate('dashboard')}
          />
          <NavItem
            icon={<Package size={20} />}
            label="Inventario"
            active={currentView === 'inventory'}
            onClick={() => onNavigate('inventory')}
          />
          <NavItem
            icon={<Grid3x3 size={20} />}
            label="Inventario Demo"
            active={currentView === 'inventoryDemo'}
            onClick={() => onNavigate('inventoryDemo')}
          />
          <NavItem
            icon={<ArrowUpDown size={20} />}
            label="Movimientos"
            active={currentView === 'movements'}
            onClick={() => onNavigate('movements')}
          />
          <NavItem
            icon={<Users size={20} />}
            label="Equipo"
            onClick={() => { }}
          />
          <NavItem
            icon={<PieChart size={20} />}
            label="Reportes"
            proBadge
            onClick={() => { }}
          />

          <div className="pt-6">
            <p className="px-2 text-xs font-semibold text-blue-300 uppercase tracking-wider mb-2">Configuración</p>
            <NavItem icon={<CreditCard size={20} />} label="Suscripción" subBadge="PRO" onClick={() => { }} />
            <NavItem icon={<Settings size={20} />} label="Configuración" onClick={() => { }} />
          </div>
        </div>

        {/* Footer Sidebar */}
        <div className="p-4 border-t border-blue-800/50 bg-[#172554]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full border-2 border-blue-400 bg-blue-600 flex items-center justify-center">
              <span className="text-white text-sm font-semibold">U</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">Usuario</p>
              <p className="text-xs text-blue-300 truncate">user@techstock.com</p>
            </div>
            <button className="text-blue-300 hover:text-white transition-colors">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  proBadge?: boolean;
  subBadge?: string;
  onClick: () => void;
}

const NavItem: React.FC<NavItemProps> = ({ icon, label, active, proBadge, subBadge, onClick }) => {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group text-left ${active
        ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50'
        : 'text-blue-100 hover:bg-blue-800/50 hover:text-white'
        }`}
    >
      <span className={active ? 'text-white' : 'text-blue-300 group-hover:text-white'}>
        {icon}
      </span>
      <span className="flex-1">{label}</span>
      {proBadge && (
        <span className="px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-blue-900 bg-gradient-to-r from-amber-200 to-yellow-400 rounded-sm">
          PRO
        </span>
      )}
      {subBadge && (
        <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-blue-800 text-blue-200 rounded border border-blue-700">
          {subBadge}
        </span>
      )}
    </button>
  );
};

export default Sidebar;