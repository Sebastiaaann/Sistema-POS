-- ============================================
-- DIAGNÓSTICO: Sistema de Notificaciones por Email
-- ============================================

-- 1. Verificar que existe el trigger
SELECT 
  'TRIGGER' as tipo,
  tgname as nombre,
  tgrelid::regclass as tabla,
  tgenabled as habilitado
FROM pg_trigger 
WHERE tgname = 'trigger_notificar_organizacion_pendiente';

-- 2. Verificar que existe la función del trigger
SELECT 
  'FUNCIÓN TRIGGER' as tipo,
  proname as nombre,
  pg_get_functiondef(oid) as definicion
FROM pg_proc
WHERE proname = 'notificar_organizacion_pendiente';

-- 3. Verificar que existe pg_net (necesario para llamar a Edge Functions)
SELECT 
  'EXTENSIÓN' as tipo,
  extname as nombre,
  extversion as version
FROM pg_extension
WHERE extname = 'pg_net';

-- Si pg_net NO aparece, ejecuta:
-- CREATE EXTENSION IF NOT EXISTS pg_net;

-- 4. Verificar configuración en app_config
SELECT 
  'CONFIG' as tipo,
  key,
  value,
  CASE 
    WHEN key = 'supabase_url' AND value LIKE 'https://%.supabase.co' THEN '✅ OK'
    WHEN key = 'supabase_url' THEN '❌ Debe ser tu URL real de Supabase'
    WHEN key = 'supabase_anon_key' AND LENGTH(value) > 100 THEN '✅ OK'
    WHEN key = 'supabase_anon_key' THEN '❌ Debe ser tu anon key real'
    ELSE '⚠️ Verificar'
  END as estado
FROM public.app_config
WHERE key IN ('supabase_url', 'supabase_anon_key');

-- Si la tabla no existe o está vacía, necesitas ejecutar aprobacion_organizaciones.sql

-- 5. Verificar organizaciones pendientes
SELECT 
  'ORGANIZACIONES' as tipo,
  id,
  nombre,
  slug,
  estado,
  created_at
FROM public.organizaciones
WHERE estado = 'PENDIENTE'
ORDER BY created_at DESC
LIMIT 5;

-- 6. Verificar que existe la columna estado
SELECT 
  'COLUMNA ESTADO' as tipo,
  column_name,
  data_type,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'organizaciones'
  AND column_name = 'estado';

-- ============================================
-- RESULTADO DEL DIAGNÓSTICO
-- ============================================
SELECT '
============================================
📊 RESUMEN DEL DIAGNÓSTICO
============================================

Para que las notificaciones funcionen necesitas:

✅ 1. Trigger creado (ver resultado arriba)
✅ 2. Función del trigger creada
✅ 3. Extensión pg_net instalada
✅ 4. Configuración en app_config con valores reales
✅ 5. Edge Function desplegada en Supabase (no se puede verificar desde SQL)

Si falta alguno de estos, sigue las instrucciones en EMAIL_SETUP.md

' as resumen;
