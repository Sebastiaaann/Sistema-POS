-- ============================================
-- AGREGAR ESTADOS A ORGANIZACIONES
-- ============================================

-- Crear ENUM para estados de organización
DO $$ BEGIN
  CREATE TYPE estado_organizacion AS ENUM ('PENDIENTE', 'APROBADA', 'RECHAZADA', 'SUSPENDIDA');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Agregar columnas a organizaciones
ALTER TABLE public.organizaciones 
ADD COLUMN IF NOT EXISTS estado estado_organizacion DEFAULT 'PENDIENTE',
ADD COLUMN IF NOT EXISTS fecha_aprobacion TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS aprobado_por UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS notas_aprobacion TEXT;

-- Crear índice
CREATE INDEX IF NOT EXISTS idx_organizaciones_estado ON public.organizaciones(estado);

-- ============================================
-- TABLA DE SOLICITUDES DE REGISTRO
-- ============================================

CREATE TABLE IF NOT EXISTS public.solicitudes_registro (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organizacion_id UUID REFERENCES public.organizaciones(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  
  -- Información de la solicitud
  nombre_negocio TEXT NOT NULL,
  tipo_negocio TEXT NOT NULL,
  email_contacto TEXT NOT NULL,
  telefono TEXT,
  descripcion TEXT,
  
  -- Estado
  estado estado_organizacion DEFAULT 'PENDIENTE',
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_solicitudes_estado ON public.solicitudes_registro(estado);
CREATE INDEX IF NOT EXISTS idx_solicitudes_org ON public.solicitudes_registro(organizacion_id);

-- RLS
ALTER TABLE public.solicitudes_registro ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas existentes si existen (para permitir re-ejecución)
DROP POLICY IF EXISTS "Ver mis solicitudes" ON public.solicitudes_registro;
DROP POLICY IF EXISTS "Crear solicitud" ON public.solicitudes_registro;

-- Ver solo mis solicitudes
CREATE POLICY "Ver mis solicitudes" ON public.solicitudes_registro
  FOR SELECT USING (user_id = auth.uid());

-- Crear solicitud
CREATE POLICY "Crear solicitud" ON public.solicitudes_registro
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- ============================================
-- FUNCIÓN PARA APROBAR ORGANIZACIÓN
-- ============================================

CREATE OR REPLACE FUNCTION aprobar_organizacion(
  p_organizacion_id UUID,
  p_notas TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
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
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FUNCIÓN PARA RECHAZAR ORGANIZACIÓN
-- ============================================

CREATE OR REPLACE FUNCTION rechazar_organizacion(
  p_organizacion_id UUID,
  p_notas TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE public.organizaciones
  SET 
    estado = 'RECHAZADA',
    notas_aprobacion = p_notas,
    updated_at = NOW()
  WHERE id = p_organizacion_id;
  
  UPDATE public.solicitudes_registro
  SET 
    estado = 'RECHAZADA',
    updated_at = NOW()
  WHERE organizacion_id = p_organizacion_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- ACTUALIZAR RLS DE ORGANIZACIONES
-- ============================================

-- Eliminar políticas existentes si existen (para permitir re-ejecución)
DROP POLICY IF EXISTS "Ver organizaciones donde soy miembro" ON public.organizaciones;
DROP POLICY IF EXISTS "Ver organizaciones aprobadas donde soy miembro" ON public.organizaciones;
DROP POLICY IF EXISTS "Ver mis organizaciones pendientes" ON public.organizaciones;
DROP POLICY IF EXISTS "Crear organizaciones" ON public.organizaciones;
DROP POLICY IF EXISTS "Crear organizacion" ON public.organizaciones;

-- Nueva política: solo ver organizaciones APROBADAS donde soy miembro
CREATE POLICY "Ver organizaciones aprobadas donde soy miembro" ON public.organizaciones
  FOR SELECT USING (
    id IN (SELECT get_user_organizations()) 
    AND estado = 'APROBADA'
  );

-- Permitir ver organizaciones PENDIENTES propias (para mostrar estado)
CREATE POLICY "Ver mis organizaciones pendientes" ON public.organizaciones
  FOR SELECT USING (
    id IN (SELECT get_user_organizations())
  );

-- Permitir crear organizaciones a usuarios autenticados
-- IMPORTANTE: Esta política debe permitir INSERT a cualquier usuario autenticado
CREATE POLICY "Crear organizaciones" ON public.organizaciones
  FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================
-- POLÍTICAS RLS PARA MIEMBROS
-- ============================================

-- Eliminar políticas existentes de miembros si existen
DROP POLICY IF EXISTS "Agregar miembros (solo ADMIN)" ON public.miembros;
DROP POLICY IF EXISTS "Crear miembro" ON public.miembros;
DROP POLICY IF EXISTS "Auto-agregarse como ADMIN" ON public.miembros;

-- Permitir que usuarios se agreguen a sí mismos como ADMIN cuando crean una organización
-- Esto permite el flujo: crear organización → agregarse como ADMIN
-- Verifica que:
-- 1. El usuario se está agregando a sí mismo
-- 2. Se está agregando como ADMIN
-- 3. La organización existe y está en estado PENDIENTE (recién creada)
CREATE POLICY "Auto-agregarse como ADMIN" ON public.miembros
  FOR INSERT WITH CHECK (
    auth.uid() = user_id 
    AND rol = 'ADMIN'
    AND organizacion_id IN (
      SELECT id FROM public.organizaciones 
      WHERE estado = 'PENDIENTE'
    )
  );

-- Permitir que ADMIN agregue otros miembros (política existente mejorada)
CREATE POLICY "Agregar miembros (solo ADMIN)" ON public.miembros
  FOR INSERT WITH CHECK (
    organizacion_id IN (
      SELECT m.organizacion_id 
      FROM public.miembros m
      WHERE m.user_id = auth.uid() 
        AND m.rol = 'ADMIN'
    )
  );

-- ============================================
-- TRIGGER PARA NOTIFICACIONES POR EMAIL
-- ============================================

-- Habilitar extensión pg_net para hacer HTTP requests (si no está habilitada)
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Tabla de configuración para almacenar la URL de Supabase
CREATE TABLE IF NOT EXISTS public.app_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insertar configuración por defecto (debe actualizarse con los valores reales)
INSERT INTO public.app_config (key, value)
VALUES 
  ('supabase_url', 'https://TU-PROJECT-REF.supabase.co'),
  ('supabase_anon_key', 'TU-ANON-KEY-AQUI')
ON CONFLICT (key) DO NOTHING;

-- Función que llama a la Edge Function cuando se crea una organización PENDIENTE
CREATE OR REPLACE FUNCTION notificar_organizacion_pendiente()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id UUID;
  v_supabase_url TEXT;
  v_supabase_anon_key TEXT;
  v_edge_function_url TEXT;
BEGIN
  -- Solo procesar si el estado es PENDIENTE
  IF NEW.estado = 'PENDIENTE' THEN
    -- Obtener el user_id del creador (primer miembro ADMIN de la organización)
    SELECT m.user_id INTO v_user_id
    FROM public.miembros m
    WHERE m.organizacion_id = NEW.id
      AND m.rol = 'ADMIN'
    LIMIT 1;

    -- Obtener la URL de Supabase desde la tabla de configuración
    SELECT value INTO v_supabase_url
    FROM public.app_config
    WHERE key = 'supabase_url';

    -- Obtener el anon key desde la tabla de configuración
    SELECT value INTO v_supabase_anon_key
    FROM public.app_config
    WHERE key = 'supabase_anon_key';

    -- Si no hay configuración, salir silenciosamente
    IF v_supabase_url IS NULL OR v_supabase_url = 'https://TU-PROJECT-REF.supabase.co' THEN
      RAISE NOTICE 'Configuración de Supabase no encontrada. Por favor, actualiza public.app_config con tus valores. Email no enviado.';
      RETURN NEW;
    END IF;

    -- Construir URL de la Edge Function
    -- Formato: https://[project-ref].supabase.co/functions/v1/send-approval-notification
    v_edge_function_url := v_supabase_url || '/functions/v1/send-approval-notification';

    -- Llamar a la Edge Function de forma asíncrona usando pg_net
    -- Esto no bloquea la transacción
    PERFORM
      net.http_post(
        url := v_edge_function_url,
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || COALESCE(v_supabase_anon_key, '')
        ),
        body := jsonb_build_object(
          'organizacion_id', NEW.id,
          'user_id', COALESCE(v_user_id, NULL)
        )
      );

    RAISE NOTICE 'Notificación de aprobación enviada para organización: %', NEW.id;
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Si hay algún error, registrar pero no fallar la transacción
    RAISE WARNING 'Error al enviar notificación de aprobación: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Crear el trigger
DROP TRIGGER IF EXISTS trigger_notificar_organizacion_pendiente ON public.organizaciones;
CREATE TRIGGER trigger_notificar_organizacion_pendiente
  AFTER INSERT ON public.organizaciones
  FOR EACH ROW
  EXECUTE FUNCTION notificar_organizacion_pendiente();

-- ============================================
-- CONFIGURACIÓN DE VARIABLES
-- ============================================
-- IMPORTANTE: Debes actualizar la tabla app_config con tus valores reales:
-- 
-- UPDATE public.app_config 
-- SET value = 'https://TU-PROJECT-REF.supabase.co' 
-- WHERE key = 'supabase_url';
--
-- UPDATE public.app_config 
-- SET value = 'TU-ANON-KEY-AQUI' 
-- WHERE key = 'supabase_anon_key';
--
-- Puedes encontrar estos valores en:
-- - Supabase Dashboard → Settings → API
-- - supabase_url: Project URL
-- - supabase_anon_key: anon/public key

-- ============================================
-- VERIFICACIÓN
-- ============================================

SELECT 'Sistema de aprobación de organizaciones creado exitosamente!' as status;
