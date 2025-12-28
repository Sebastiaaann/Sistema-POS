import React, { useState, useEffect } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import InventoryList from './components/InventoryList';
import InventoryDemo from './components/InventoryDemo';
import MovimientosList from './components/MovimientosList';
import Login from './components/Login';
import OnboardingWizard from './components/OnboardingWizard';
import PendingApproval from './components/PendingApproval';
import OrganizationSelector from './components/OrganizationSelector';
import AdminPanel from './components/AdminPanel';
import { createClient } from './lib/supabase';
import { queryClient } from './lib/queryClient';
import type { User } from '@supabase/supabase-js';
import { Package } from 'lucide-react';
import { useAdmin } from './hooks/useAdmin';

const AppContent: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentView, setCurrentView] = useState<'dashboard' | 'inventory' | 'inventoryDemo' | 'movements'>('inventory');
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [needsOrganization, setNeedsOrganization] = useState(false);
  const [organizacionId, setOrganizacionId] = useState<string | null>(null);

  const supabase = createClient();
  const { isAdmin, loading: adminLoading } = useAdmin();

  useEffect(() => {
    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        checkOnboardingStatus();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkSession = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);

      if (session?.user) {
        await checkOnboardingStatus();
      }
    } catch (error) {
      console.error('Error checking session:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkOnboardingStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Verificar si el email está confirmado
      const emailConfirmed = !!user.email_confirmed_at;

      // Obtener organizaciones donde el usuario es miembro
      const { data: miembros } = await supabase
        .from('miembros')
        .select(`
          organizacion_id,
          organizaciones (
            id,
            estado
          )
        `)
        .eq('user_id', user.id);

      // Extraer las organizaciones de los miembros
      const orgs = miembros?.map(m => m.organizaciones).filter(Boolean).flat() || [];

      // Si no tiene organización
      if (!orgs || orgs.length === 0) {
        // Si el email está verificado, mostrar selector de organización
        if (emailConfirmed) {
          setNeedsOrganization(true);
          setIsPending(false);
          setNeedsOnboarding(false);
          return;
        } else {
          // Si el email no está verificado, no mostrar nada (el usuario debe verificar primero)
          // El componente EmailVerification se mostrará en el render
          setNeedsOrganization(false);
          setIsPending(false);
          setNeedsOnboarding(false);
          return;
        }
      }

      const orgId = orgs[0].id;
      const orgEstado = orgs[0].estado || 'PENDIENTE';
      setOrganizacionId(orgId);

      console.log('Estado de organización:', orgEstado);

      // ============================================
      // REGLA PRINCIPAL: Solo APROBADAS pueden acceder
      // ============================================

      if (orgEstado !== 'APROBADA') {
        // Cualquier estado que NO sea APROBADA → Bloquear acceso
        console.log('Organización no aprobada, mostrando pantalla de espera');
        setIsPending(true);
        setNeedsOnboarding(false);
        return;
      }

      // Si llegamos aquí, la organización está APROBADA
      // Verificar si necesita completar onboarding
      const { data: config } = await supabase
        .from('configuracion_organizacion')
        .select('tipo_negocio')
        .eq('organizacion_id', orgId)
        .single();

      if (config && config.tipo_negocio === 'RETAIL_GENERAL') {
        // Necesita configurar tipo de negocio
        setNeedsOnboarding(true);
        setIsPending(false);
      } else {
        // Todo OK, puede acceder al sistema
        setNeedsOnboarding(false);
        setIsPending(false);
      }

    } catch (error) {
      console.error('Error checking onboarding:', error);
      setNeedsOnboarding(false);
      setIsPending(false);
    }
  };

  const handleOnboardingComplete = () => {
    setNeedsOnboarding(false);
    // Después de completar onboarding, verificar estado nuevamente
    // Si está PENDIENTE, mostrar pantalla de espera
    setIsPending(true);
  };

  const handleNavigate = (view: string) => {
    setCurrentView(view as 'dashboard' | 'inventory' | 'inventoryDemo' | 'movements');
    setSidebarOpen(false);
  };

  if (loading || adminLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600 mt-4">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  // ============================================
  // SUPER_ADMIN: Mostrar Panel de Administración
  // ============================================
  // Los administradores NO tienen organización propia
  // Solo administran las solicitudes de otros usuarios
  if (isAdmin) {
    return <AdminPanel />;
  }

  // Si el usuario no tiene email verificado y no tiene organización, mostrar mensaje
  if (!user.email_confirmed_at && !organizacionId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Package className="w-10 h-10 text-amber-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">
            Verifica tu Email
          </h1>
          <p className="text-gray-600 mb-6">
            Por favor, verifica tu email antes de crear una organización.
            Revisa tu bandeja de entrada y haz clic en el enlace de verificación.
          </p>
          <button
            onClick={async () => {
              await supabase.auth.signOut();
              window.location.reload();
            }}
            className="w-full px-4 py-3 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors"
          >
            Cerrar Sesión
          </button>
        </div>
      </div>
    );
  }

  // Mostrar selector de organización si no tiene organización y email está verificado
  if (needsOrganization) {
    return (
      <OrganizationSelector
        onOrganizationCreated={() => {
          setNeedsOrganization(false);
          // Recargar para verificar el estado de la organización
          checkOnboardingStatus();
        }}
      />
    );
  }

  // Mostrar Pending Approval si la organización NO está aprobada
  if (isPending) {
    return <PendingApproval />;
  }

  // Mostrar Onboarding si es necesario (solo para organizaciones APROBADAS)
  if (needsOnboarding && organizacionId) {
    return (
      <OnboardingWizard
        organizacionId={organizacionId}
        onComplete={handleOnboardingComplete}
      />
    );
  }

  // Sistema principal (solo accesible para organizaciones APROBADAS)
  return (
    <div className="flex h-screen bg-[#F3F4F6] overflow-hidden">
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        currentView={currentView}
        onNavigate={handleNavigate}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <Header onMenuClick={() => setSidebarOpen(true)} />

        <main className="flex-1 overflow-y-auto p-4 lg:p-8">
          <div className="max-w-7xl mx-auto space-y-8">
            {currentView === 'dashboard' ? (
              <div className="flex flex-col items-center justify-center min-h-[500px]">
                <Package className="w-24 h-24 text-gray-300 mb-6" />
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Dashboard en Construcción</h2>
                <p className="text-gray-500 mb-6">El dashboard con KPIs y gráficas estará disponible próximamente</p>
                <button
                  onClick={() => setCurrentView('inventory')}
                  className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Ir al Inventario
                </button>
              </div>
            ) : currentView === 'movements' ? (
              <div className="h-[calc(100vh-140px)]">
                <MovimientosList />
              </div>
            ) : currentView === 'inventoryDemo' ? (
              <div className="h-[calc(100vh-140px)]">
                <InventoryDemo />
              </div>
            ) : (
              <div className="h-[calc(100vh-140px)]">
                <InventoryList products={[]} onAddProduct={() => { }} />
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

// Wrapper principal con QueryClientProvider
const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
      {/* DevTools solo en desarrollo */}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
};

export default App;