import { useState, useEffect } from 'react';
import { createClient } from '../lib/supabase';
import type { Database } from '../lib/database.types';

type ConfiguracionOrg = Database['public']['Tables']['configuracion_organizacion']['Row'];

interface UseOrganizacionReturn {
    configuracion: ConfiguracionOrg | null;
    loading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
}

export function useOrganizacion(): UseOrganizacionReturn {
    const [configuracion, setConfiguracion] = useState<ConfiguracionOrg | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const supabase = createClient();

    const loadConfiguracion = async () => {
        try {
            setLoading(true);
            setError(null);

            // Obtener usuario actual
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                setError('No hay sesión activa');
                return;
            }

            // Obtener primera organización del usuario
            const { data: orgs, error: orgsError } = await supabase
                .from('organizaciones')
                .select('id')
                .limit(1);

            if (orgsError) throw orgsError;

            if (!orgs || orgs.length === 0) {
                setError('No tienes una organización asignada');
                return;
            }

            const orgId = orgs[0].id;

            // Obtener configuración de la organización
            const { data: config, error: configError } = await supabase
                .from('configuracion_organizacion')
                .select('*')
                .eq('organizacion_id', orgId)
                .single();

            if (configError) throw configError;

            setConfiguracion(config);
        } catch (err: any) {
            console.error('Error cargando configuración:', err);
            setError(err.message || 'Error al cargar configuración');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadConfiguracion();
    }, []);

    return {
        configuracion,
        loading,
        error,
        refetch: loadConfiguracion
    };
}
