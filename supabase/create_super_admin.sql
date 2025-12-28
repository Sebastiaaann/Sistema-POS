-- ============================================
-- CREAR SUPER_ADMIN: sebastian.almo9@gmail.com
-- ============================================
-- Ejecuta este script DESPUÉS de haber ejecutado admin_setup.sql
-- y DESPUÉS de haberte registrado en la aplicación
-- ============================================

-- Verificar que el usuario existe
SELECT 
  id,
  email,
  email_confirmed_at,
  created_at
FROM auth.users
WHERE email = 'sebastian.almo9@gmail.com';

-- Si el usuario existe, crear el rol de SUPER_ADMIN
INSERT INTO public.admin_roles (user_id, role)
SELECT id, 'SUPER_ADMIN'
FROM auth.users
WHERE email = 'sebastian.almo9@gmail.com'
ON CONFLICT (user_id) DO UPDATE
SET role = 'SUPER_ADMIN';

-- Verificar que se creó correctamente
SELECT 
  ar.role,
  u.email,
  u.email_confirmed_at,
  ar.created_at as admin_desde
FROM public.admin_roles ar
JOIN auth.users u ON ar.user_id = u.id
WHERE u.email = 'sebastian.almo9@gmail.com';

-- ============================================
-- RESULTADO ESPERADO
-- ============================================
-- Deberías ver una fila con:
-- role: SUPER_ADMIN
-- email: sebastian.almo9@gmail.com
-- email_confirmed_at: (fecha de confirmación)
-- admin_desde: (fecha actual)
-- ============================================
