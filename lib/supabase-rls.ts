/**
 * HELPERS PARA SUPABASE AUTH + RLS
 * 
 * Funciones auxiliares para trabajar con autenticación y permisos
 */

import { createClient } from './supabase'

/**
 * Obtiene la organización activa del usuario actual
 * 
 * @returns ID de la primera organización o null
 */
export async function getActiveOrganization(): Promise<string | null> {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('miembros')
    .select('organizacion_id')
    .eq('user_id', user.id)
    .limit(1)
    .single()

  if (error || !data) return null

  return data.organizacion_id
}

/**
 * Obtiene todas las organizaciones del usuario actual
 * 
 * @returns Array de IDs de organizaciones
 */
export async function getUserOrganizations(): Promise<string[]> {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('miembros')
    .select('organizacion_id')
    .eq('user_id', user.id)

  if (error || !data) return []

  return data.map(m => m.organizacion_id)
}

/**
 * Verifica si el usuario actual tiene acceso a una organización
 * 
 * @param orgId - ID de la organización
 * @returns true si el usuario es miembro
 */
export async function hasOrganizationAccess(orgId: string): Promise<boolean> {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const { data, error } = await supabase
    .from('miembros')
    .select('id')
    .eq('user_id', user.id)
    .eq('organizacion_id', orgId)
    .single()

  return !!data && !error
}

/**
 * Verifica si el usuario actual es ADMIN de una organización
 * 
 * @param orgId - ID de la organización
 * @returns true si es ADMIN
 */
export async function isOrganizationAdmin(orgId: string): Promise<boolean> {
  const supabase = createClient()

  // Usar la función RPC del backend
  const { data, error } = await supabase
    .rpc('is_organization_admin', { org_id: orgId })

  return data === true && !error
}

/**
 * Obtiene el rol del usuario actual en una organización
 * 
 * @param orgId - ID de la organización
 * @returns Rol del usuario o null
 */
export async function getUserRole(orgId: string): Promise<'ADMIN' | 'VENDEDOR' | null> {
  const supabase = createClient()

  // Usar la función RPC del backend
  const { data, error } = await supabase
    .rpc('get_user_role', { org_id: orgId })

  if (error || !data) return null

  return data as 'ADMIN' | 'VENDEDOR'
}

/**
 * Obtiene los detalles del miembro actual
 * 
 * @param orgId - ID de la organización
 * @returns Datos del miembro o null
 */
export async function getMemberDetails(orgId: string) {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('miembros')
    .select('id, rol')
    .eq('user_id', user.id)
    .eq('organizacion_id', orgId)
    .single()

  if (error || !data) return null

  return {
    id: data.id,
    rol: data.rol as 'ADMIN' | 'VENDEDOR'
  }
}

/**
 * Obtiene el usuario actual
 * 
 * @returns Usuario de Supabase Auth o null
 */
export async function getCurrentUser() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

/**
 * Obtiene el perfil del usuario actual
 * 
 * @returns Perfil público del usuario o null
 */
export async function getUserProfile() {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (error || !data) return null

  return data
}
