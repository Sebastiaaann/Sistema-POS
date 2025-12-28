-- =============================================
-- SCRIPT COMPLETO: Configuración de Aprobaciones
-- =============================================
-- Ejecutar este script completo en Supabase SQL Editor
-- =============================================

-- 1. Asegurarse que existe pg_net (para llamar Edge Functions)
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2. Crear ENUM para estados
DO $$ BEGIN
  CREATE TYPE estado_organizacion AS ENUM ('PENDIENTE', 'APROBADA', 'RECHAZADA', 'SUSPENDIDA');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 3. Agregar columnas a organizaciones
ALTER TABLE public.organizaciones 
ADD COLUMN IF NOT EXISTS estado estado_organizacion DEFAULT 'PENDIENTE',
ADD COLUMN IF NOT EXISTS fecha_aprobacion TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS aprobado_por UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS notas_aprobacion TEXT;

-- 4. Crear índice
CREATE INDEX IF NOT EXISTS idx_organizaciones_estado ON public.organizaciones(estado);

-- 5. Tabla de configuración para URLs
CREATE TABLE IF NOT EXISTS public.app_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Insertar configuración inicial
-- IMPORTANTE: Debes actualizar estos valores después con los reales
INSERT INTO public.app_config (key, value)
VALUES 
  ('supabase_url', 'https://TU-PROJECT-REF.supabase.co'),
  ('supabase_anon_key', 'TU-ANON-KEY-AQUI')
ON CONFLICT (key) DO NOTHING;

-- 7. Función que llama a la Edge Function
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
    -- Obtener el user_id del creador
    SELECT m.user_id INTO v_user_id
    FROM public.miembros m
    WHERE m.organizacion_id = NEW.id
      AND m.rol = 'ADMIN'
    LIMIT 1;

    -- Obtener configuración
    SELECT value INTO v_supabase_url
    FROM public.app_config
    WHERE key = 'supabase_url';

    SELECT value INTO v_supabase_anon_key
    FROM public.app_config
    WHERE key = 'supabase_anon_key';

    -- Si no hay configuración, salir
    IF v_supabase_url IS NULL OR v_supabase_url = 'https://TU-PROJECT-REF.supabase.co' THEN
      RAISE NOTICE 'Configuración no encontrada. Actualiza app_config.';
      RETURN NEW;
    END IF;

    -- Construir URL de la Edge Function
    v_edge_function_url := v_supabase_url || '/functions/v1/send-approval-notification';

    -- Llamar a la Edge Function
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

    RAISE NOTICE 'Notificación enviada para organización: %', NEW.id;
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error al enviar notificación: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Crear el trigger
DROP TRIGGER IF EXISTS trigger_notificar_organizacion_pendiente ON public.organizaciones;
CREATE TRIGGER trigger_notificar_organizacion_pendiente
  AFTER INSERT ON public.organizaciones
  FOR EACH ROW
  EXECUTE FUNCTION notificar_organizacion_pendiente();

-- 9. Verificación
SELECT 'Script ejecutado exitosamente!' as status;

-- Ver estado actual
SELECT 
  'Configuración actual' as tipo,
  key,
  CASE 
    WHEN key = 'supabase_url' AND value LIKE 'https://%.supabase.co' AND value NOT LIKE '%TU-PROJECT-REF%' THEN '✅ Configurado'
    WHEN key = 'supabase_anon_key' AND LENGTH(value) > 100 THEN '✅ Configurado'
    ELSE '❌ DEBES ACTUALIZAR ESTE VALOR'
  END as estado
FROM public.app_config;
