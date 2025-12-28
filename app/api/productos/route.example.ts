/**
 * EJEMPLO: API Route con Supabase Auth Nativo
 * 
 * Este archivo muestra cómo usar Supabase Auth + RLS directamente
 * sin necesidad de NextAuth.js. Supabase maneja todo automáticamente.
 */

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerSupabaseClient } from '@/lib/supabase'
import { isOrganizationAdmin } from '@/lib/supabase-rls'

// ============================================
// GET /api/productos - Listar productos
// ============================================
export async function GET(request: NextRequest) {
    try {
        const cookieStore = cookies()
        const supabase = createServerSupabaseClient(cookieStore)

        // 1. Verificar autenticación (automático con Supabase Auth)
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json(
                { error: 'No autenticado' },
                { status: 401 }
            )
        }

        // 2. Obtener organización de query params
        const searchParams = request.nextUrl.searchParams
        const orgId = searchParams.get('organizacionId')

        if (!orgId) {
            return NextResponse.json(
                { error: 'organizacionId requerido' },
                { status: 400 }
            )
        }

        // 3. Consultar productos
        // RLS automáticamente filtra por organizacionId
        // Solo verás productos de organizaciones donde eres miembro
        const { data: productos, error } = await supabase
            .from('productos')
            .select(`
        *,
        categoria:categorias(id, nombre),
        stock_por_almacen(
          *,
          almacen:almacenes(id, nombre, codigo)
        )
      `)
            .eq('organizacion_id', orgId)
            .is('deleted_at', null)
            .eq('is_active', true)
            .order('nombre', { ascending: true })

        if (error) {
            console.error('Error fetching productos:', error)
            return NextResponse.json(
                { error: 'Error al obtener productos' },
                { status: 500 }
            )
        }

        return NextResponse.json({ productos })

    } catch (error) {
        console.error('Error:', error)
        return NextResponse.json(
            { error: 'Error interno del servidor' },
            { status: 500 }
        )
    }
}

// ============================================
// POST /api/productos - Crear producto
// ============================================
export async function POST(request: NextRequest) {
    try {
        const cookieStore = cookies()
        const supabase = createServerSupabaseClient(cookieStore)

        // 1. Verificar autenticación
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json(
                { error: 'No autenticado' },
                { status: 401 }
            )
        }

        // 2. Parsear body
        const body = await request.json()
        const { organizacion_id, nombre, sku, precio_venta, precio_costo, ...rest } = body

        if (!organizacion_id) {
            return NextResponse.json(
                { error: 'organizacion_id requerido' },
                { status: 400 }
            )
        }

        // 3. Crear producto
        // RLS verifica automáticamente que seas miembro de la organización
        const { data: producto, error } = await supabase
            .from('productos')
            .insert({
                nombre,
                sku,
                precio_venta,
                precio_costo,
                organizacion_id,
                ...rest
            })
            .select(`
        *,
        categoria:categorias(id, nombre)
      `)
            .single()

        if (error) {
            console.error('Error creating producto:', error)

            // Manejar SKU duplicado
            if (error.code === '23505') {
                return NextResponse.json(
                    { error: 'El SKU ya existe en esta organización' },
                    { status: 409 }
                )
            }

            // Si RLS bloqueó el insert
            if (error.code === 'PGRST301') {
                return NextResponse.json(
                    { error: 'No tienes acceso a esta organización' },
                    { status: 403 }
                )
            }

            return NextResponse.json(
                { error: 'Error al crear producto' },
                { status: 500 }
            )
        }

        return NextResponse.json({ producto }, { status: 201 })

    } catch (error: any) {
        console.error('Error:', error)
        return NextResponse.json(
            { error: 'Error interno del servidor' },
            { status: 500 }
        )
    }
}

// ============================================
// DELETE /api/productos/[id] - Borrar producto (soft delete)
// ============================================
export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const cookieStore = cookies()
        const supabase = createServerSupabaseClient(cookieStore)

        // 1. Verificar autenticación
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json(
                { error: 'No autenticado' },
                { status: 401 }
            )
        }

        // 2. Obtener organización
        const searchParams = request.nextUrl.searchParams
        const orgId = searchParams.get('organizacionId')

        if (!orgId) {
            return NextResponse.json(
                { error: 'organizacionId requerido' },
                { status: 400 }
            )
        }

        // 3. Verificar que es ADMIN (usando RPC function)
        const { data: isAdmin } = await supabase
            .rpc('is_organization_admin', { org_id: orgId })

        if (!isAdmin) {
            return NextResponse.json(
                { error: 'Solo administradores pueden eliminar productos' },
                { status: 403 }
            )
        }

        // 4. Soft delete
        // RLS se asegura que solo puedas modificar productos de tu org
        const { data: producto, error } = await supabase
            .from('productos')
            .update({
                deleted_at: new Date().toISOString(),
                is_active: false
            })
            .eq('id', params.id)
            .eq('organizacion_id', orgId)
            .select()
            .single()

        if (error) {
            console.error('Error deleting producto:', error)
            return NextResponse.json(
                { error: 'Error al eliminar producto' },
                { status: 500 }
            )
        }

        return NextResponse.json({
            message: 'Producto eliminado',
            producto
        })

    } catch (error) {
        console.error('Error:', error)
        return NextResponse.json(
            { error: 'Error interno del servidor' },
            { status: 500 }
        )
    }
}

// ============================================
// EJEMPLO: Crear movimiento de stock
// ============================================
export async function createMovimiento(
    organizacion_id: string,
    tipo: 'ENTRADA' | 'SALIDA',
    producto_id: string,
    almacen_id: string,
    cantidad: number,
    precio?: number,
    costo?: number
) {
    const cookieStore = cookies()
    const supabase = createServerSupabaseClient(cookieStore)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('No autenticado')

    // creado_por_id se llena automáticamente con el user.id
    const { data, error } = await supabase
        .from('movimientos_stock')
        .insert({
            organizacion_id,
            tipo,
            producto_id,
            almacen_id,
            cantidad,
            creado_por_id: user.id, // ID del usuario autenticado
            precio_unitario_snapshot: precio,
            costo_unitario_snapshot: costo
        })
        .select()
        .single()

    if (error) throw error

    // El trigger actualizar_stock_almacen se ejecuta automáticamente
    return data
}
