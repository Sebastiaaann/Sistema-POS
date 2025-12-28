/**
 * EJEMPLOS DE USO - Supabase con React + Vite
 * 
 * Estos ejemplos muestran cómo usar Supabase con React y Vite
 */


import { createClient } from '../lib/supabase'
import type { Database } from '../lib/database.types'

// ============================================
// AUTENTICACIÓN
// ============================================

/**
 * Registrar nuevo usuario
 */
export async function signUp(email: string, password: string, fullName: string) {
    const supabase = createClient()

    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: {
                full_name: fullName,
            },
        },
    })

    if (error) {
        throw new Error(error.message)
    }

    // El trigger handle_new_user() creó el perfil automáticamente
    return data.user
}

/**
 * Iniciar sesión
 */
export async function signIn(email: string, password: string) {
    const supabase = createClient()

    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
    })

    if (error) {
        throw new Error(error.message)
    }

    return data.session
}

/**
 * Cerrar sesión
 */
export async function signOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
}

/**
 * Obtener usuario actual
 */
export async function getCurrentUser() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    return user
}

// ============================================
// ORGANIZACIONES
// ============================================

/**
 * Crear una organización y auto-agregarse como ADMIN
 */
export async function createOrganization(nombre: string, slug: string) {
    const supabase = createClient()

    // 1. Obtener usuario actual
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('No autenticado')

    // 2. Crear organización
    const { data: org, error: orgError } = await supabase
        .from('organizaciones')
        .insert({ nombre, slug })
        .select()
        .single()

    if (orgError) throw new Error(orgError.message)

    // 3. Agregarse como miembro ADMIN
    const { error: memberError } = await supabase
        .from('miembros')
        .insert({
            user_id: user.id,
            organizacion_id: org.id,
            rol: 'ADMIN'
        })

    if (memberError) throw new Error(memberError.message)

    return org
}

/**
 * Obtener mis organizaciones
 */
export async function getMyOrganizations() {
    const supabase = createClient()

    const { data, error } = await supabase
        .from('organizaciones')
        .select('*')
        .order('nombre')

    if (error) throw new Error(error.message)

    // RLS automáticamente filtra solo mis organizaciones
    return data
}

// ============================================
// PRODUCTOS
// ============================================

/**
 * Listar productos de una organización
 */
export async function getProductos(organizacionId: string) {
    const supabase = createClient()

    const { data, error } = await supabase
        .from('productos')
        .select(`
      *,
      categoria:categorias(id, nombre),
      stock_por_almacen(
        *,
        almacen:almacenes(id, nombre, codigo)
      )
    `)
        .eq('organizacion_id', organizacionId)
        .is('deleted_at', null)
        .eq('is_active', true)
        .order('nombre')

    if (error) throw new Error(error.message)

    return data
}

/**
 * Crear un producto
 */
export async function createProducto(producto: Database['public']['Tables']['productos']['Insert']) {
    const supabase = createClient()

    const { data, error } = await supabase
        .from('productos')
        .insert(producto)
        .select(`
      *,
      categoria:categorias(id, nombre)
    `)
        .single()

    if (error) {
        // Manejar error de SKU duplicado
        if (error.code === '23505') {
            throw new Error('El SKU ya existe en esta organización')
        }
        throw new Error(error.message)
    }

    return data
}

/**
 * Actualizar un producto
 */
export async function updateProducto(
    id: string,
    updates: Database['public']['Tables']['productos']['Update']
) {
    const supabase = createClient()

    const { data, error } = await supabase
        .from('productos')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

    if (error) throw new Error(error.message)

    return data
}

/**
 * Eliminar producto (soft delete)
 */
export async function deleteProducto(id: string, organizacionId: string) {
    const supabase = createClient()

    // Verificar que es ADMIN
    const { data: isAdmin } = await supabase
        .rpc('is_organization_admin', { org_id: organizacionId })

    if (!isAdmin) {
        throw new Error('Solo administradores pueden eliminar productos')
    }

    const { data, error } = await supabase
        .from('productos')
        .update({
            deleted_at: new Date().toISOString(),
            is_active: false
        })
        .eq('id', id)
        .select()
        .single()

    if (error) throw new Error(error.message)

    return data
}

// ============================================
// MOVIMIENTOS DE STOCK
// ============================================

/**
 * Crear movimiento de stock (entrada o salida)
 */
export async function createMovimiento(
    organizacionId: string,
    productoId: string,
    almacenId: string,
    tipo: 'ENTRADA' | 'SALIDA' | 'AJUSTE_POSITIVO' | 'AJUSTE_NEGATIVO',
    cantidad: number,
    opciones?: {
        motivo?: string
        numeroDocumento?: string
        terceroId?: string
        precioSnapshot?: number
        costoSnapshot?: number
    }
) {
    const supabase = createClient()

    // Obtener usuario actual
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('No autenticado')

    const { data, error } = await supabase
        .from('movimientos_stock')
        .insert({
            organizacion_id: organizacionId,
            producto_id: productoId,
            almacen_id: almacenId,
            tipo,
            cantidad,
            creado_por_id: user.id,
            motivo: opciones?.motivo,
            numero_documento: opciones?.numeroDocumento,
            tercero_id: opciones?.terceroId,
            precio_unitario_snapshot: opciones?.precioSnapshot,
            costo_unitario_snapshot: opciones?.costoSnapshot
        })
        .select()
        .single()

    if (error) throw new Error(error.message)

    // El trigger actualizar_stock_almacen() se ejecuta automáticamente
    return data
}

/**
 * Transferir stock entre almacenes
 * (Crea dos movimientos: SALIDA del origen, ENTRADA al destino)
 */
export async function transferirStock(
    organizacionId: string,
    productoId: string,
    almacenOrigenId: string,
    almacenDestinoId: string,
    cantidad: number
) {
    const supabase = createClient()

    // Obtener usuario actual
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('No autenticado')

    // Obtener nombres de almacenes para el motivo
    const { data: almacenes } = await supabase
        .from('almacenes')
        .select('id, nombre')
        .in('id', [almacenOrigenId, almacenDestinoId])

    const origen = almacenes?.find(a => a.id === almacenOrigenId)
    const destino = almacenes?.find(a => a.id === almacenDestinoId)

    // 1. SALIDA del origen
    const { error: salidaError } = await supabase
        .from('movimientos_stock')
        .insert({
            organizacion_id: organizacionId,
            producto_id: productoId,
            almacen_id: almacenOrigenId,
            tipo: 'SALIDA',
            cantidad,
            creado_por_id: user.id,
            motivo: `Transferencia a ${destino?.nombre || almacenDestinoId}`
        })

    if (salidaError) throw new Error(salidaError.message)

    // 2. ENTRADA al destino
    const { data, error: entradaError } = await supabase
        .from('movimientos_stock')
        .insert({
            organizacion_id: organizacionId,
            producto_id: productoId,
            almacen_id: almacenDestinoId,
            tipo: 'ENTRADA',
            cantidad,
            creado_por_id: user.id,
            motivo: `Transferencia desde ${origen?.nombre || almacenOrigenId}`
        })
        .select()
        .single()

    if (entradaError) throw new Error(entradaError.message)

    return data
}

/**
 * Ver historial de movimientos
 */
export async function getMovimientos(organizacionId: string, limit = 50) {
    const supabase = createClient()

    const { data, error } = await supabase
        .from('view_movimientos_completo')
        .select('*')
        .eq('organizacion_id', organizacionId)
        .limit(limit)

    if (error) throw new Error(error.message)

    return data
}

// ============================================
// VISTAS ESPECIALES
// ============================================

/**
 * Obtener productos con stock bajo
 */
export async function getProductosStockBajo(organizacionId: string) {
    const supabase = createClient()

    const { data, error } = await supabase
        .from('view_productos_stock_bajo')
        .select('*')
        .eq('organizacion_id', organizacionId)

    if (error) throw new Error(error.message)

    return data
}

/**
 * Obtener stock detallado por almacén
 */
export async function getStockPorAlmacen(organizacionId: string) {
    const supabase = createClient()

    const { data, error } = await supabase
        .from('view_stock_por_almacen_detalle')
        .select('*')
        .eq('organizacion_id', organizacionId)

    if (error) throw new Error(error.message)

    return data
}

// ============================================
// REALTIME (BONUS)
// ============================================

/**
 * Suscribirse a cambios en productos
 */
export function subscribeToProductos(
    organizacionId: string,
    callback: (payload: any) => void
) {
    const supabase = createClient()

    const channel = supabase
        .channel(`productos-${organizacionId}`)
        .on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'productos',
                filter: `organizacion_id=eq.${organizacionId}`
            },
            callback
        )
        .subscribe()

    // Retornar función para cleanup
    return () => {
        supabase.removeChannel(channel)
    }
}
