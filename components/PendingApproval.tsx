import React, { useState, useEffect } from 'react';
import { Clock, CheckCircle, XCircle, PartyPopper } from 'lucide-react';
import { createClient } from '../lib/supabase';

const PendingApproval: React.FC = () => {
    const [loggingOut, setLoggingOut] = useState(false);
    const [organizacionId, setOrganizacionId] = useState<string | null>(null);
    const [aprobada, setAprobada] = useState(false);
    const supabase = createClient();

    useEffect(() => {
        // Obtener ID de la organización del usuario
        const getOrganizacionId = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: miembros } = await supabase
                .from('miembros')
                .select('organizacion_id')
                .eq('user_id', user.id)
                .limit(1);

            if (miembros && miembros.length > 0) {
                setOrganizacionId(miembros[0].organizacion_id);
            }
        };

        getOrganizacionId();
    }, []);

    useEffect(() => {
        if (!organizacionId) return;

        // Suscribirse a cambios en la organización
        const channel = supabase
            .channel(`org-${organizacionId}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'organizaciones',
                    filter: `id=eq.${organizacionId}`
                },
                (payload: any) => {
                    console.log('Cambio detectado en organización:', payload);

                    if (payload.new.estado === 'APROBADA') {
                        // Mostrar animación de aprobación
                        setAprobada(true);

                        // Redirigir después de 2 segundos
                        setTimeout(() => {
                            window.location.reload();
                        }, 2000);
                    } else if (payload.new.estado === 'RECHAZADA') {
                        // Recargar para mostrar mensaje de rechazo
                        window.location.reload();
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [organizacionId]);

    const handleLogout = async () => {
        setLoggingOut(true);
        try {
            await supabase.auth.signOut();
            // Recargar la página para que App.tsx detecte que no hay usuario y muestre el Login
            window.location.reload();
        } catch (error) {
            console.error('Error al cerrar sesión:', error);
            setLoggingOut(false);
        }
    };

    // Mostrar animación de aprobación
    if (aprobada) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
                <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
                    <div className="flex justify-center mb-6">
                        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center animate-bounce">
                            <PartyPopper className="w-10 h-10 text-green-600" />
                        </div>
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-3">
                        ¡Aprobado! 🎉
                    </h1>
                    <p className="text-gray-600 mb-6">
                        Tu organización ha sido aprobada. Redirigiendo al sistema...
                    </p>
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
                </div>
            </div>
        );
    }
    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">

                {/* Icon */}
                <div className="flex justify-center mb-6">
                    <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center">
                        <Clock className="w-10 h-10 text-amber-600" />
                    </div>
                </div>

                {/* Title */}
                <h1 className="text-2xl font-bold text-gray-900 text-center mb-3">
                    Solicitud en Revisión
                </h1>

                {/* Description */}
                <p className="text-gray-600 text-center mb-6">
                    Tu solicitud de registro ha sido recibida y está siendo revisada por nuestro equipo.
                </p>

                {/* Status Card */}
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
                    <div className="flex items-start gap-3">
                        <Clock className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                        <div>
                            <h3 className="font-semibold text-amber-900 mb-1">Estado: Pendiente de Aprobación</h3>
                            <p className="text-sm text-amber-700">
                                Serás redirigido automáticamente cuando tu cuenta sea aprobada.
                                No es necesario refrescar la página.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Info */}
                <div className="space-y-3 mb-6">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span>Tu cuenta ha sido creada exitosamente</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span>Configuración inicial completada</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Clock className="w-4 h-4 text-amber-600" />
                        <span>Esperando aprobación del administrador</span>
                    </div>
                </div>

                {/* Actions */}
                <div className="space-y-3">
                    <button
                        onClick={() => window.location.reload()}
                        className="w-full px-4 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        Verificar Estado
                    </button>

                    <button
                        onClick={handleLogout}
                        disabled={loggingOut}
                        className="w-full px-4 py-3 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loggingOut ? 'Cerrando sesión...' : 'Cerrar Sesión'}
                    </button>
                </div>

                {/* Contact */}
                <div className="mt-6 pt-6 border-t border-gray-200 text-center">
                    <p className="text-sm text-gray-500">
                        ¿Necesitas ayuda?{' '}
                        <a href="mailto:soporte@techstock.com" className="text-blue-600 hover:underline">
                            Contáctanos
                        </a>
                    </p>
                </div>

            </div>
        </div>
    );
};

export default PendingApproval;
