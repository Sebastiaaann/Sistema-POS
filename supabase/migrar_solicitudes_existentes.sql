-- =============================================
-- MIGRACIÓN: Guardar organizaciones existentes
-- =============================================
-- Este script guarda en solicitudes_registro todas las
-- organizaciones que ya existen pero no tienen solicitud
-- =============================================

-- Insertar solicitudes para organizaciones existentes que no tienen registro
INSERT INTO public.solicitudes_registro (
  organizacion_id,
  user_id,
  nombre_negocio,
  email_contacto,
  estado,
  created_at,
  updated_at
)
SELECT 
  o.id,
  m.user_id,
  o.nombre,
  COALESCE(u.email, 'sin-email@pendiente.com'),
  o.estado::TEXT,
  o.created_at,
  o.updated_at
FROM public.organizaciones o
LEFT JOIN public.miembros m ON o.id = m.organizacion_id AND m.rol = 'ADMIN'
LEFT JOIN auth.users u ON m.user_id = u.id
WHERE NOT EXISTS (
  SELECT 1 FROM public.solicitudes_registro sr
  WHERE sr.organizacion_id = o.id
);

-- Mostrar resultado
SELECT 
  COUNT(*) as organizaciones_migradas,
  'Solicitudes creadas para organizaciones existentes' as mensaje
FROM public.solicitudes_registro;

-- Ver todas las solicitudes
SELECT 
  sr.id,
  sr.nombre_negocio,
  sr.email_contacto,
  sr.estado,
  sr.created_at,
  o.nombre as org_nombre
FROM public.solicitudes_registro sr
LEFT JOIN public.organizaciones o ON sr.organizacion_id = o.id
ORDER BY sr.created_at DESC;
