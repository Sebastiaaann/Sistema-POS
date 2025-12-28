/**
 * CLIENTE DE SUPABASE
 * Configuración para React + Vite
 */

import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Faltan variables de entorno de Supabase. Verifica tu archivo .env.local')
}

// Crear una única instancia singleton
let supabaseInstance: SupabaseClient<Database> | null = null;

/**
 * Cliente de Supabase para React (Singleton)
 * Maneja automáticamente la sesión del usuario
 * Siempre retorna la misma instancia para evitar múltiples clientes
 */
export function createClient(): SupabaseClient<Database> {
    if (!supabaseInstance) {
        supabaseInstance = createSupabaseClient<Database>(
            supabaseUrl,
            supabaseAnonKey,
            {
                auth: {
                    persistSession: true,
                    autoRefreshToken: true,
                }
            }
        );
    }
    return supabaseInstance;
}

// También exportar directamente para uso conveniente
export const supabase = createClient();
