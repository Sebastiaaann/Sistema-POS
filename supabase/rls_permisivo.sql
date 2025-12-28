-- ============================================
-- SOLUCIÓN DEFINITIVA: POLÍTICAS RLS SIMPLES
-- ============================================

-- PASO 1: Eliminar TODAS las políticas existentes
DROP POLICY IF EXISTS "Ver organizaciones donde soy miembro" ON public.organizaciones;
DROP POLICY IF EXISTS "Crear organizacion" ON public.organizaciones;
DROP POLICY IF EXISTS "Actualizar organizacion" ON public.organizaciones;
DROP POLICY IF EXISTS "Actualizar mis organizaciones" ON public.organizaciones;
DROP POLICY IF EXISTS "Ver organizaciones aprobadas donde soy miembro" ON public.organizaciones;
DROP POLICY IF EXISTS "Ver mis organizaciones pendientes" ON public.organizaciones;

-- PASO 2: Crear políticas SIMPLES y PERMISIVAS
CREATE POLICY "allow_all_select" ON public.organizaciones
  FOR SELECT USING (true);

CREATE POLICY "allow_all_insert" ON public.organizaciones
  FOR INSERT WITH CHECK (true);

CREATE POLICY "allow_all_update" ON public.organizaciones
  FOR UPDATE USING (true);

-- PASO 3: Políticas para miembros
DROP POLICY IF EXISTS "Ver miembros de mis organizaciones" ON public.miembros;
DROP POLICY IF EXISTS "Crear miembro" ON public.miembros;

CREATE POLICY "allow_all_select_miembros" ON public.miembros
  FOR SELECT USING (true);

CREATE POLICY "allow_all_insert_miembros" ON public.miembros
  FOR INSERT WITH CHECK (true);

-- ============================================
-- VERIFICACIÓN
-- ============================================

SELECT 
  'Políticas RLS configuradas (modo permisivo para desarrollo)' as status;

SELECT 
  tablename,
  policyname,
  cmd
FROM pg_policies 
WHERE tablename IN ('organizaciones', 'miembros')
ORDER BY tablename, cmd;
