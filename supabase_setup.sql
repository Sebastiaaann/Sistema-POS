-- ============================================
-- SUPABASE RLS + VISTAS - Sistema de Stock SaaS
-- VERSIÓN: Con Supabase Auth Nativo
-- ============================================
-- 
-- EJECUTAR DESPUÉS de schema.sql
-- ============================================

BEGIN;

-- ============================================
-- 1. POLÍTICAS RLS - PROFILES
-- ============================================

-- Los usuarios pueden ver su propio perfil
CREATE POLICY "Usuarios ven su propio perfil" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

-- Los usuarios pueden actualizar su propio perfil
CREATE POLICY "Usuarios actualizan su propio perfil" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- ============================================
-- 2. POLÍTICAS RLS - ORGANIZACIONES
-- ============================================

-- Los usuarios ven organizaciones donde son miembros
CREATE POLICY "Ver organizaciones donde soy miembro" ON public.organizaciones
  FOR SELECT USING (
    id IN (
      SELECT organizacion_id 
      FROM public.miembros 
      WHERE user_id = auth.uid()
    )
  );

-- Cualquiera puede crear una organización
CREATE POLICY "Crear organizaciones" ON public.organizaciones
  FOR INSERT WITH CHECK (true);

-- Solo ADMIN puede actualizar organizaciones
CREATE POLICY "Actualizar organizaciones (solo ADMIN)" ON public.organizaciones
  FOR UPDATE USING (
    id IN (
      SELECT m.organizacion_id 
      FROM public.miembros m
      WHERE m.user_id = auth.uid() 
        AND m.rol = 'ADMIN'
    )
  );

-- Solo ADMIN puede eliminar organizaciones
CREATE POLICY "Eliminar organizaciones (solo ADMIN)" ON public.organizaciones
  FOR DELETE USING (
    id IN (
      SELECT m.organizacion_id 
      FROM public.miembros m
      WHERE m.user_id = auth.uid() 
        AND m.rol = 'ADMIN'
    )
  );

-- ============================================
-- 3. POLÍTICAS RLS - MIEMBROS
-- ============================================

-- Ver miembros de mis organizaciones
CREATE POLICY "Ver miembros de mis organizaciones" ON public.miembros
  FOR SELECT USING (
    organizacion_id IN (
      SELECT organizacion_id 
      FROM public.miembros 
      WHERE user_id = auth.uid()
    )
  );

-- Solo ADMIN puede agregar miembros
CREATE POLICY "Agregar miembros (solo ADMIN)" ON public.miembros
  FOR INSERT WITH CHECK (
    organizacion_id IN (
      SELECT m.organizacion_id 
      FROM public.miembros m
      WHERE m.user_id = auth.uid() 
        AND m.rol = 'ADMIN'
    )
  );

-- Solo ADMIN puede eliminar miembros
CREATE POLICY "Eliminar miembros (solo ADMIN)" ON public.miembros
  FOR DELETE USING (
    organizacion_id IN (
      SELECT m.organizacion_id 
      FROM public.miembros m
      WHERE m.user_id = auth.uid() 
        AND m.rol = 'ADMIN'
    )
  );

-- ============================================
-- 4. FUNCIÓN AUXILIAR: get_user_organizations
-- ============================================

CREATE OR REPLACE FUNCTION public.get_user_organizations()
RETURNS SETOF UUID AS $$
BEGIN
  RETURN QUERY
  SELECT organizacion_id
  FROM public.miembros
  WHERE user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 5. POLÍTICAS RLS - TABLAS DE NEGOCIO
-- ============================================
-- Template que aplica a: categorias, productos, terceros, 
-- almacenes, stock_por_almacen, movimientos_stock

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN 
    SELECT unnest(ARRAY[
      'categorias',
      'productos',
      'terceros',
      'almacenes',
      'stock_por_almacen',
      'movimientos_stock'
    ])
  LOOP
    -- SELECT: Ver datos de mis organizaciones
    EXECUTE format('
      CREATE POLICY "Ver %s de mis organizaciones" ON public.%s
        FOR SELECT USING (
          organizacion_id IN (SELECT public.get_user_organizations())
        );
    ', tbl, tbl);

    -- INSERT: Solo miembros de la org
    EXECUTE format('
      CREATE POLICY "Crear %s en mis organizaciones" ON public.%s
        FOR INSERT WITH CHECK (
          organizacion_id IN (SELECT public.get_user_organizations())
        );
    ', tbl, tbl);

    -- UPDATE: Solo miembros de la org
    EXECUTE format('
      CREATE POLICY "Actualizar %s de mis organizaciones" ON public.%s
        FOR UPDATE USING (
          organizacion_id IN (SELECT public.get_user_organizations())
        );
    ', tbl, tbl);

    -- DELETE: Solo ADMIN
    EXECUTE format('
      CREATE POLICY "Eliminar %s (solo ADMIN)" ON public.%s
        FOR DELETE USING (
          organizacion_id IN (
            SELECT m.organizacion_id 
            FROM public.miembros m
            WHERE m.user_id = auth.uid() 
              AND m.rol = ''ADMIN''
          )
        );
    ', tbl, tbl);

    RAISE NOTICE '✅ Políticas RLS creadas para: %', tbl;
  END LOOP;
END $$;

-- ============================================
-- 6. VISTAS OPTIMIZADAS
-- ============================================

-- Vista: Movimientos Completos
CREATE OR REPLACE VIEW public.view_movimientos_completo AS
SELECT 
  m.id,
  m.fecha,
  m.tipo,
  m.cantidad,
  m.motivo,
  m.numero_documento,
  
  -- Snapshots
  m.precio_unitario_snapshot,
  m.costo_unitario_snapshot,
  m.valor_total,
  
  -- Cálculos
  (m.cantidad * COALESCE(m.costo_unitario_snapshot, 0)) as total_costo,
  (m.valor_total - (m.cantidad * COALESCE(m.costo_unitario_snapshot, 0))) as ganancia,
  
  -- Producto
  p.id as producto_id,
  p.nombre as producto_nombre,
  p.sku as producto_sku,
  p.stock_actual,
  
  -- Usuario (desde profiles)
  prof.id as usuario_id,
  prof.full_name as usuario_nombre,
  
  -- Tercero
  t.id as tercero_id,
  t.nombre as tercero_nombre,
  t.tipo as tercero_tipo,
  
  -- Almacén
  a.id as almacen_id,
  a.nombre as almacen_nombre,
  
  -- Organización
  m.organizacion_id

FROM public.movimientos_stock m
JOIN public.productos p ON p.id = m.producto_id
LEFT JOIN public.profiles prof ON prof.id = m.creado_por_id
LEFT JOIN public.terceros t ON t.id = m.tercero_id
LEFT JOIN public.almacenes a ON a.id = m.almacen_id
ORDER BY m.fecha DESC;

-- Vista: Productos con Stock Bajo
CREATE OR REPLACE VIEW public.view_productos_stock_bajo AS
SELECT 
  p.id,
  p.nombre,
  p.sku,
  p.stock_actual,
  p.precio_venta,
  p.precio_costo,
  c.nombre as categoria_nombre,
  o.id as organizacion_id,
  o.nombre as organizacion_nombre,
  o.alerta_stock_bajo as umbral,
  
  -- Estado
  CASE 
    WHEN p.stock_actual <= 0 THEN 'AGOTADO'
    WHEN p.stock_actual < COALESCE(o.alerta_stock_bajo, 10) THEN 'BAJO'
    ELSE 'OK'
  END as estado_stock

FROM public.productos p
JOIN public.organizaciones o ON o.id = p.organizacion_id
LEFT JOIN public.categorias c ON c.id = p.categoria_id
WHERE p.deleted_at IS NULL
  AND p.is_active = true
  AND p.stock_actual < COALESCE(o.alerta_stock_bajo, 10)
ORDER BY p.stock_actual ASC;

-- Vista: Stock por Almacén Detallado
CREATE OR REPLACE VIEW public.view_stock_por_almacen_detalle AS
SELECT 
  spa.id,
  spa.producto_id,
  p.nombre as producto_nombre,
  p.sku as producto_sku,
  spa.almacen_id,
  a.nombre as almacen_nombre,
  a.codigo as almacen_codigo,
  spa.stock_actual,
  spa.stock_minimo,
  spa.organizacion_id,
  
  -- Estado
  CASE 
    WHEN spa.stock_actual <= 0 THEN 'AGOTADO'
    WHEN spa.stock_actual < spa.stock_minimo THEN 'BAJO'
    ELSE 'OK'
  END as estado_stock

FROM public.stock_por_almacen spa
JOIN public.productos p ON p.id = spa.producto_id
JOIN public.almacenes a ON a.id = spa.almacen_id
WHERE p.deleted_at IS NULL
  AND p.is_active = true
  AND a.activo = true
ORDER BY spa.stock_actual ASC;

-- ============================================
-- 7. TRIGGER: Actualizar Stock Automáticamente
-- ============================================

CREATE OR REPLACE FUNCTION public.actualizar_stock_almacen()
RETURNS TRIGGER AS $$
BEGIN
  -- Actualizar stock por almacén si existe almacen
  IF NEW.almacen_id IS NOT NULL THEN
    INSERT INTO public.stock_por_almacen (
      organizacion_id,
      producto_id,
      almacen_id,
      stock_actual
    ) VALUES (
      NEW.organizacion_id,
      NEW.producto_id,
      NEW.almacen_id,
      CASE 
        WHEN NEW.tipo IN ('ENTRADA', 'AJUSTE_POSITIVO') THEN NEW.cantidad
        WHEN NEW.tipo IN ('SALIDA', 'AJUSTE_NEGATIVO') THEN -NEW.cantidad
        ELSE 0
      END
    )
    ON CONFLICT (producto_id, almacen_id) 
    DO UPDATE SET
      stock_actual = public.stock_por_almacen.stock_actual + 
        CASE 
          WHEN NEW.tipo IN ('ENTRADA', 'AJUSTE_POSITIVO') THEN NEW.cantidad
          WHEN NEW.tipo IN ('SALIDA', 'AJUSTE_NEGATIVO') THEN -NEW.cantidad
          ELSE 0
        END,
      updated_at = NOW();
  END IF;

  -- Actualizar stock global del producto
  UPDATE public.productos
  SET 
    stock_actual = stock_actual + 
      CASE 
        WHEN NEW.tipo IN ('ENTRADA', 'AJUSTE_POSITIVO') THEN NEW.cantidad
        WHEN NEW.tipo IN ('SALIDA', 'AJUSTE_NEGATIVO') THEN -NEW.cantidad
        ELSE 0
      END,
    updated_at = NOW()
  WHERE id = NEW.producto_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_actualizar_stock ON public.movimientos_stock;
CREATE TRIGGER trigger_actualizar_stock
  AFTER INSERT ON public.movimientos_stock
  FOR EACH ROW
  EXECUTE FUNCTION public.actualizar_stock_almacen();

-- ============================================
-- 8. FUNCIONES AUXILIARES
-- ============================================

-- Verificar si usuario es ADMIN de una organización
CREATE OR REPLACE FUNCTION public.is_organization_admin(org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.miembros 
    WHERE user_id = auth.uid() 
      AND organizacion_id = org_id 
      AND rol = 'ADMIN'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Obtener rol del usuario en una organización
CREATE OR REPLACE FUNCTION public.get_user_role(org_id UUID)
RETURNS "RolUsuario" AS $$
DECLARE
  user_role "RolUsuario";
BEGIN
  SELECT rol INTO user_role
  FROM public.miembros
  WHERE user_id = auth.uid() 
    AND organizacion_id = org_id;
  
  RETURN user_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;

-- ============================================
-- VERIFICACIÓN FINAL
-- ============================================

DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public';
  
  RAISE NOTICE '========================================';
  RAISE NOTICE '📊 CONFIGURACIÓN RLS COMPLETADA';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ Políticas RLS: %', policy_count;
  RAISE NOTICE '✅ Vistas: 3';
  RAISE NOTICE '✅ Triggers: 1 (actualizar_stock_almacen)';
  RAISE NOTICE '✅ Funciones: 3';
  RAISE NOTICE '========================================';
  RAISE NOTICE '🎉 Supabase Auth Native configurado!';
  RAISE NOTICE '========================================';
END $$;
