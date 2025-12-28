-- ============================================
-- FIX RLS: Permitir crear organizaciones
-- ============================================
-- Este script corrige las políticas RLS para permitir
-- que usuarios autenticados creen organizaciones

-- Eliminar TODAS las políticas INSERT existentes de organizaciones
DROP POLICY IF EXISTS "Crear organizaciones" ON public.organizaciones;
DROP POLICY IF EXISTS "Crear organizacion" ON public.organizaciones;
DROP POLICY IF EXISTS "allow_all_insert" ON public.organizaciones;

-- Crear política INSERT simple y clara
CREATE POLICY "Crear organizaciones" ON public.organizaciones
  FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL);

-- Verificar que la política se creó
SELECT 
  'Política INSERT creada exitosamente' as status,
  policyname,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'organizaciones' 
  AND cmd = 'INSERT';

-- ============================================
-- FIX RLS: Permitir auto-agregarse como miembro
-- ============================================

-- Eliminar políticas INSERT existentes de miembros
DROP POLICY IF EXISTS "Auto-agregarse como ADMIN" ON public.miembros;
DROP POLICY IF EXISTS "Agregar miembros (solo ADMIN)" ON public.miembros;
DROP POLICY IF EXISTS "Crear miembro" ON public.miembros;
DROP POLICY IF EXISTS "allow_all_insert_miembros" ON public.miembros;

-- Política 1: Permitir auto-agregarse como ADMIN cuando se crea organización
CREATE POLICY "Auto-agregarse como ADMIN" ON public.miembros
  FOR INSERT 
  WITH CHECK (
    auth.uid() = user_id 
    AND rol = 'ADMIN'
    AND organizacion_id IN (
      SELECT id FROM public.organizaciones 
      WHERE estado = 'PENDIENTE'
    )
  );

-- Política 2: Permitir que ADMIN agregue otros miembros
CREATE POLICY "Agregar miembros (solo ADMIN)" ON public.miembros
  FOR INSERT 
  WITH CHECK (
    organizacion_id IN (
      SELECT m.organizacion_id 
      FROM public.miembros m
      WHERE m.user_id = auth.uid() 
        AND m.rol = 'ADMIN'
    )
  );

-- Verificar políticas de miembros
SELECT 
  'Políticas INSERT de miembros creadas exitosamente' as status,
  policyname,
  cmd
FROM pg_policies 
WHERE tablename = 'miembros' 
  AND cmd = 'INSERT';

