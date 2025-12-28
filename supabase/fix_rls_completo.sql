-- ============================================
-- POLÍTICAS RLS COMPLETAS PARA ORGANIZACIONES
-- ============================================

-- Eliminar políticas existentes
DROP POLICY IF EXISTS "Ver organizaciones donde soy miembro" ON public.organizaciones;
DROP POLICY IF EXISTS "Crear organizacion" ON public.organizaciones;
DROP POLICY IF EXISTS "Actualizar organizacion" ON public.organizaciones;

-- ============================================
-- POLÍTICA SELECT: Ver organizaciones donde soy miembro
-- ============================================
CREATE POLICY "Ver organizaciones donde soy miembro" ON public.organizaciones
  FOR SELECT USING (
    id IN (SELECT get_user_organizations())
  );

-- ============================================
-- POLÍTICA INSERT: Permitir crear organizaciones
-- ============================================
CREATE POLICY "Crear organizacion" ON public.organizaciones
  FOR INSERT WITH CHECK (true);
  -- Cualquier usuario autenticado puede crear una organización
  -- La seguridad se maneja en el nivel de aplicación

-- ============================================
-- POLÍTICA UPDATE: Actualizar organizaciones donde soy miembro
-- ============================================
CREATE POLICY "Actualizar organizacion" ON public.organizaciones
  FOR UPDATE USING (
    id IN (SELECT get_user_organizations())
  );

-- ============================================
-- POLÍTICAS PARA MIEMBROS
-- ============================================

-- Eliminar políticas existentes
DROP POLICY IF EXISTS "Ver miembros de mis organizaciones" ON public.miembros;
DROP POLICY IF EXISTS "Crear miembro" ON public.miembros;

-- Ver miembros de organizaciones donde participo
CREATE POLICY "Ver miembros de mis organizaciones" ON public.miembros
  FOR SELECT USING (
    organizacion_id IN (SELECT get_user_organizations())
  );

-- Permitir crear miembros (necesario para auto-asignarse como ADMIN)
CREATE POLICY "Crear miembro" ON public.miembros
  FOR INSERT WITH CHECK (
    user_id = auth.uid() OR
    organizacion_id IN (SELECT get_user_organizations())
  );

-- ============================================
-- VERIFICAR POLÍTICAS
-- ============================================

SELECT 
  tablename,
  policyname,
  cmd,
  CASE 
    WHEN cmd = 'SELECT' THEN 'Ver'
    WHEN cmd = 'INSERT' THEN 'Crear'
    WHEN cmd = 'UPDATE' THEN 'Actualizar'
    WHEN cmd = 'DELETE' THEN 'Eliminar'
  END as accion
FROM pg_policies 
WHERE tablename IN ('organizaciones', 'miembros')
ORDER BY tablename, cmd;
