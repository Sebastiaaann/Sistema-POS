-- ============================================
-- SISTEMA DE ADMINISTRACIÓN DE ORGANIZACIONES
-- ============================================
-- Este script configura el sistema de roles administrativos
-- y funciones para aprobar/rechazar organizaciones
-- ============================================

BEGIN;

-- ============================================
-- 1. TABLA DE ROLES ADMINISTRATIVOS
-- ============================================

CREATE TABLE IF NOT EXISTS public.admin_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('SUPER_ADMIN', 'ADMIN')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  
  UNIQUE(user_id)
);

-- RLS: Solo SUPER_ADMIN puede ver y modificar
ALTER TABLE public.admin_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Solo SUPER_ADMIN puede ver roles" ON public.admin_roles;
CREATE POLICY "Solo SUPER_ADMIN puede ver roles" ON public.admin_roles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.admin_roles ar
      WHERE ar.user_id = auth.uid() AND ar.role = 'SUPER_ADMIN'
    )
  );

DROP POLICY IF EXISTS "Solo SUPER_ADMIN puede modificar roles" ON public.admin_roles;
CREATE POLICY "Solo SUPER_ADMIN puede modificar roles" ON public.admin_roles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.admin_roles ar
      WHERE ar.user_id = auth.uid() AND ar.role = 'SUPER_ADMIN'
    )
  );

-- Índice
CREATE INDEX IF NOT EXISTS idx_admin_roles_user ON public.admin_roles(user_id);

-- ============================================
-- 2. TABLA DE AUDIT LOG
-- ============================================

CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_user_id UUID NOT NULL REFERENCES auth.users(id),
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id UUID NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: Solo admins pueden leer
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins pueden ver audit log" ON public.admin_audit_log;
CREATE POLICY "Admins pueden ver audit log" ON public.admin_audit_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.admin_roles ar
      WHERE ar.user_id = auth.uid()
    )
  );

-- Índices
CREATE INDEX IF NOT EXISTS idx_audit_log_admin ON public.admin_audit_log(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_target ON public.admin_audit_log(target_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON public.admin_audit_log(created_at DESC);

-- ============================================
-- 3. FUNCIÓN: Verificar si usuario es admin
-- ============================================

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.admin_roles
    WHERE user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 4. FUNCIÓN: Obtener solicitudes con detalles
-- ============================================

CREATE OR REPLACE FUNCTION public.get_solicitudes_pendientes()
RETURNS TABLE (
  organizacion_id UUID,
  organizacion_nombre TEXT,
  organizacion_slug TEXT,
  organizacion_estado TEXT,
  organizacion_created_at TIMESTAMPTZ,
  organizacion_tipo_negocio TEXT,
  organizacion_descripcion TEXT,
  organizacion_telefono TEXT,
  organizacion_email_contacto TEXT,
  user_id UUID,
  user_email TEXT,
  user_full_name TEXT,
  solicitud_id UUID,
  solicitud_created_at TIMESTAMPTZ
) AS $$
BEGIN
  -- Verificar que el usuario sea admin
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'No tienes permisos para ver solicitudes';
  END IF;

  RETURN QUERY
  SELECT 
    o.id as organizacion_id,
    o.nombre as organizacion_nombre,
    o.slug as organizacion_slug,
    o.estado::TEXT as organizacion_estado,
    o.created_at as organizacion_created_at,
    co.tipo_negocio as organizacion_tipo_negocio,
    co.descripcion as organizacion_descripcion,
    co.telefono as organizacion_telefono,
    co.email_contacto as organizacion_email_contacto,
    m.user_id,
    p.email as user_email,
    p.full_name as user_full_name,
    sr.id as solicitud_id,
    sr.created_at as solicitud_created_at
  FROM public.organizaciones o
  LEFT JOIN public.miembros m ON o.id = m.organizacion_id AND m.rol = 'ADMIN'
  LEFT JOIN public.profiles p ON m.user_id = p.id
  LEFT JOIN public.solicitudes_registro sr ON o.id = sr.organizacion_id
  LEFT JOIN public.configuracion_organizacion co ON o.id = co.organizacion_id
  ORDER BY o.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 5. FUNCIÓN: Aprobar organización
-- ============================================

CREATE OR REPLACE FUNCTION public.aprobar_organizacion_rpc(
  p_organizacion_id UUID,
  p_notas TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_org_nombre TEXT;
  v_org_estado TEXT;
BEGIN
  -- Verificar que el usuario sea admin
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'No tienes permisos para aprobar organizaciones';
  END IF;

  -- Verificar que la organización existe
  SELECT nombre, estado::TEXT INTO v_org_nombre, v_org_estado
  FROM public.organizaciones
  WHERE id = p_organizacion_id;

  IF v_org_nombre IS NULL THEN
    RAISE EXCEPTION 'Organización no encontrada';
  END IF;

  -- Verificar que está en estado PENDIENTE
  IF v_org_estado != 'PENDIENTE' THEN
    RAISE EXCEPTION 'La organización ya fue procesada (estado: %)', v_org_estado;
  END IF;

  -- Actualizar estado de organización
  UPDATE public.organizaciones
  SET 
    estado = 'APROBADA',
    fecha_aprobacion = NOW(),
    aprobado_por = auth.uid(),
    notas_aprobacion = p_notas,
    updated_at = NOW()
  WHERE id = p_organizacion_id;

  -- Actualizar solicitud si existe
  UPDATE public.solicitudes_registro
  SET 
    estado = 'APROBADA',
    updated_at = NOW()
  WHERE organizacion_id = p_organizacion_id;

  -- Registrar en audit log
  INSERT INTO public.admin_audit_log (
    admin_user_id,
    action,
    target_type,
    target_id,
    details
  ) VALUES (
    auth.uid(),
    'APROBAR_ORGANIZACION',
    'organizacion',
    p_organizacion_id,
    jsonb_build_object(
      'organizacion_nombre', v_org_nombre,
      'notas', p_notas
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Organización aprobada exitosamente',
    'organizacion_id', p_organizacion_id,
    'organizacion_nombre', v_org_nombre
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 6. FUNCIÓN: Rechazar organización
-- ============================================

CREATE OR REPLACE FUNCTION public.rechazar_organizacion_rpc(
  p_organizacion_id UUID,
  p_motivo TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_org_nombre TEXT;
  v_org_estado TEXT;
BEGIN
  -- Verificar que el usuario sea admin
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'No tienes permisos para rechazar organizaciones';
  END IF;

  -- Verificar que se proporcionó un motivo
  IF p_motivo IS NULL OR trim(p_motivo) = '' THEN
    RAISE EXCEPTION 'Debes proporcionar un motivo para el rechazo';
  END IF;

  -- Verificar que la organización existe
  SELECT nombre, estado::TEXT INTO v_org_nombre, v_org_estado
  FROM public.organizaciones
  WHERE id = p_organizacion_id;

  IF v_org_nombre IS NULL THEN
    RAISE EXCEPTION 'Organización no encontrada';
  END IF;

  -- Verificar que está en estado PENDIENTE
  IF v_org_estado != 'PENDIENTE' THEN
    RAISE EXCEPTION 'La organización ya fue procesada (estado: %)', v_org_estado;
  END IF;

  -- Actualizar estado de organización
  UPDATE public.organizaciones
  SET 
    estado = 'RECHAZADA',
    notas_aprobacion = p_motivo,
    updated_at = NOW()
  WHERE id = p_organizacion_id;

  -- Actualizar solicitud si existe
  UPDATE public.solicitudes_registro
  SET 
    estado = 'RECHAZADA',
    updated_at = NOW()
  WHERE organizacion_id = p_organizacion_id;

  -- Registrar en audit log
  INSERT INTO public.admin_audit_log (
    admin_user_id,
    action,
    target_type,
    target_id,
    details
  ) VALUES (
    auth.uid(),
    'RECHAZAR_ORGANIZACION',
    'organizacion',
    p_organizacion_id,
    jsonb_build_object(
      'organizacion_nombre', v_org_nombre,
      'motivo', p_motivo
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Organización rechazada',
    'organizacion_id', p_organizacion_id,
    'organizacion_nombre', v_org_nombre
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 7. HABILITAR REALTIME PARA NOTIFICACIONES
-- ============================================

-- Habilitar Realtime en la tabla organizaciones
ALTER PUBLICATION supabase_realtime ADD TABLE public.organizaciones;

-- ============================================
-- 8. FUNCIÓN HELPER: Crear organización de prueba
-- ============================================

CREATE OR REPLACE FUNCTION public.create_test_organization(
  p_nombre TEXT DEFAULT 'Organización de Prueba',
  p_email TEXT DEFAULT 'test@example.com'
)
RETURNS UUID AS $$
DECLARE
  v_org_id UUID;
  v_user_id UUID;
BEGIN
  -- Solo admins pueden crear organizaciones de prueba
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'No tienes permisos para crear organizaciones de prueba';
  END IF;

  -- Crear organización
  INSERT INTO public.organizaciones (nombre, slug, estado)
  VALUES (
    p_nombre,
    lower(replace(p_nombre, ' ', '-')) || '-' || floor(random() * 1000)::TEXT,
    'PENDIENTE'
  )
  RETURNING id INTO v_org_id;

  -- Crear solicitud
  INSERT INTO public.solicitudes_registro (
    organizacion_id,
    nombre_negocio,
    tipo_negocio,
    email_contacto,
    estado
  ) VALUES (
    v_org_id,
    p_nombre,
    'RETAIL_GENERAL',
    p_email,
    'PENDIENTE'
  );

  RETURN v_org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;

-- ============================================
-- VERIFICACIÓN
-- ============================================

SELECT '✅ Sistema de administración configurado exitosamente!' as status;

-- ============================================
-- INSTRUCCIONES PARA CREAR EL PRIMER ADMIN
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '📋 INSTRUCCIONES PARA CREAR SUPER_ADMIN';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE '1. Regístrate normalmente en la aplicación';
  RAISE NOTICE '2. Copia tu email registrado';
  RAISE NOTICE '3. Ejecuta el siguiente SQL:';
  RAISE NOTICE '';
  RAISE NOTICE 'INSERT INTO public.admin_roles (user_id, role)';
  RAISE NOTICE 'SELECT id, ''SUPER_ADMIN''';
  RAISE NOTICE 'FROM auth.users';
  RAISE NOTICE 'WHERE email = ''TU_EMAIL@example.com'';';
  RAISE NOTICE '';
  RAISE NOTICE '4. Cierra sesión y vuelve a iniciar sesión';
  RAISE NOTICE '5. Serás redirigido automáticamente al panel admin';
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
END $$;
