import { useState, useEffect } from 'react';
import { createClient } from '../lib/supabase';

export interface SolicitudPendiente {
    organizacion_id: string;
    organizacion_nombre: string;
    organizacion_slug: string;
    organizacion_estado: 'PENDIENTE' | 'APROBADA' | 'RECHAZADA';
    organizacion_created_at: string;
    organizacion_tipo_negocio: string | null;
    organizacion_descripcion: string | null;
    organizacion_telefono: string | null;
    organizacion_email_contacto: string | null;
    user_id: string | null;
    user_email: string | null;
    user_full_name: string | null;
    solicitud_id: string | null;
    solicitud_created_at: string | null;
}

interface UseAdminReturn {
    isAdmin: boolean;
    loading: boolean;
    solicitudes: SolicitudPendiente[];
    error: string | null;
    aprobar: (orgId: string, notas?: string) => Promise<void>;
    rechazar: (orgId: string, motivo: string) => Promise<void>;
    refetch: () => Promise<void>;
}

export function useAdmin(): UseAdminReturn {
    const [isAdmin, setIsAdmin] = useState(false);
    const [loading, setLoading] = useState(true);
    const [solicitudes, setSolicitudes] = useState<SolicitudPendiente[]>([]);
    const [error, setError] = useState<string | null>(null);

    const supabase = createClient();

    // Verificar si el usuario es admin
    const checkAdminStatus = async () => {
        try {
            const { data, error: rpcError } = await supabase.rpc('is_admin' as any);

            if (rpcError) {
                console.error('Error verificando admin:', rpcError);
                setIsAdmin(false);
                return;
            }

            setIsAdmin(Boolean(data));
        } catch (err) {
            console.error('Error en checkAdminStatus:', err);
            setIsAdmin(false);
        }
    };

    // Cargar solicitudes
    const loadSolicitudes = async () => {
        try {
            setLoading(true);
            setError(null);

            const { data, error: rpcError } = await supabase.rpc('get_solicitudes_pendientes' as any);

            if (rpcError) {
                throw rpcError;
            }

            setSolicitudes(data || []);
        } catch (err: any) {
            console.error('Error cargando solicitudes:', err);
            setError(err.message || 'Error al cargar solicitudes');
        } finally {
            setLoading(false);
        }
    };

    // Aprobar organización
    const aprobar = async (orgId: string, notas?: string) => {
        try {
            const { data, error: rpcError } = await supabase.rpc('aprobar_organizacion_rpc' as any, {
                p_organizacion_id: orgId,
                p_notas: notas || null
            });

            if (rpcError) {
                throw rpcError;
            }

            // Recargar solicitudes
            await loadSolicitudes();
        } catch (err: any) {
            console.error('Error aprobando organización:', err);
            throw new Error(err.message || 'Error al aprobar organización');
        }
    };

    // Rechazar organización
    const rechazar = async (orgId: string, motivo: string) => {
        try {
            if (!motivo || motivo.trim() === '') {
                throw new Error('Debes proporcionar un motivo para el rechazo');
            }

            const { data, error: rpcError } = await supabase.rpc('rechazar_organizacion_rpc' as any, {
                p_organizacion_id: orgId,
                p_motivo: motivo
            });

            if (rpcError) {
                throw rpcError;
            }

            // Recargar solicitudes
            await loadSolicitudes();
        } catch (err: any) {
            console.error('Error rechazando organización:', err);
            throw new Error(err.message || 'Error al rechazar organización');
        }
    };

    useEffect(() => {
        const init = async () => {
            await checkAdminStatus();
        };

        init();
    }, []);

    useEffect(() => {
        if (isAdmin) {
            loadSolicitudes();

            // Suscribirse a cambios en tiempo real
            const channel = supabase
                .channel('admin-solicitudes')
                .on(
                    'postgres_changes',
                    {
                        event: '*',
                        schema: 'public',
                        table: 'organizaciones'
                    },
                    () => {
                        // Recargar solicitudes cuando hay cambios
                        loadSolicitudes();
                    }
                )
                .subscribe();

            return () => {
                supabase.removeChannel(channel);
            };
        }
    }, [isAdmin]);

    return {
        isAdmin,
        loading,
        solicitudes,
        error,
        aprobar,
        rechazar,
        refetch: loadSolicitudes
    };
}
