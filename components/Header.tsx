import React, { useState, useEffect } from 'react';
import { Search, Bell, Menu, LogOut } from 'lucide-react';
import { createClient } from '../lib/supabase';
import type { Database } from '../lib/database.types';

interface HeaderProps {
  onMenuClick: () => void;
}

type Profile = Database['public']['Tables']['profiles']['Row'];

const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
  const [loggingOut, setLoggingOut] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const supabase = createClient();

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      setProfile(data);
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  const handleLogout = async () => {
    if (!confirm('¿Estás seguro que deseas cerrar sesión?')) return;

    setLoggingOut(true);
    try {
      await supabase.auth.signOut();
      window.location.reload();
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      setLoggingOut(false);
    }
  };

  const getUserInitials = () => {
    if (profile?.full_name) {
      return profile.full_name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    return profile?.email?.slice(0, 2).toUpperCase() || 'U';
  };

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-8 sticky top-0 z-10 shadow-sm">
      <div className="flex items-center gap-4 flex-1">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 -ml-2 text-gray-500 hover:bg-gray-100 rounded-lg"
        >
          <Menu size={24} />
        </button>

        <div className="relative w-full max-w-xl hidden md:block">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg leading-5 bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:bg-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-all"
            placeholder="Buscar por SKU, producto o movimiento..."
          />
        </div>
      </div>

      <div className="flex items-center gap-3 sm:gap-6">
        <button className="relative p-2 text-gray-400 hover:text-gray-500 hover:bg-gray-100 rounded-full transition-colors">
          <Bell size={20} />
          <span className="absolute top-2 right-2 block h-2 w-2 rounded-full bg-red-500 ring-2 ring-white"></span>
        </button>

        <div className="h-8 w-px bg-gray-200 mx-1 hidden sm:block"></div>

        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium text-gray-700">
              {profile?.full_name || profile?.email || 'Cargando...'}
            </p>
            <p className="text-xs text-gray-500">Administrador</p>
          </div>

          {profile?.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt="Profile"
              className="h-9 w-9 rounded-full border border-gray-200 shadow-sm object-cover"
            />
          ) : (
            <div className="h-9 w-9 rounded-full border border-gray-200 shadow-sm bg-blue-600 flex items-center justify-center">
              <span className="text-white text-xs font-semibold">{getUserInitials()}</span>
            </div>
          )}
        </div>

        <div className="h-8 w-px bg-gray-200 mx-1"></div>

        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
          title="Cerrar Sesión"
        >
          <LogOut size={18} />
          <span className="hidden sm:inline">{loggingOut ? 'Cerrando...' : 'Salir'}</span>
        </button>
      </div>
    </header>
  );
};

export default Header;