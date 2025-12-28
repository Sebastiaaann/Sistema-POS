-- ============================================
-- CORRECCIÓN: Políticas RLS para Organizaciones
-- ============================================

-- Eliminar todas las políticas antiguas
DROP POLICY IF EXISTS "Ver organizaciones aprobadas donde soy miembro" ON public.organizaciones;
DROP POLICY IF EXISTS "Ver mis organizaciones pendientes" ON public.organizaciones;
DROP POLICY IF EXISTS "Ver mis organizaciones" ON public.organizaciones;

-- Nueva política: Permitir ver organizaciones donde soy miembro (cualquier estado)
-- Esto es necesario para que el sistema pueda verificar el estado
CREATE POLICY "Ver organizaciones donde soy miembro" ON public.organizaciones
  FOR SELECT USING (
    id IN (SELECT get_user_organizations())
  );

-- ============================================
-- VERIFICAR POLÍTICAS
-- ============================================

SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'organizaciones';

-- ============================================
-- ACTUALIZAR ORGANIZACIONES EXISTENTES
-- ============================================

-- Asegurarse de que todas las organizaciones tengan un estado
UPDATE organizaciones 
SET estado = 'PENDIENTE' 
WHERE estado IS NULL;

-- Ver estado actual
SELECT id, nombre, estado, created_at 
FROM organizaciones 
ORDER BY created_at DESC;
