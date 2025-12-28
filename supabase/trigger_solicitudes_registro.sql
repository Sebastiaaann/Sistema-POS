-- =============================================
-- TRIGGER: Guardar Solicitudes de Registro
-- =============================================
-- Este script crea un trigger que automáticamente guarda
-- todas las solicitudes de registro en la tabla solicitudes_registro
-- =============================================

-- 1. Función que guarda la solicitud cuando se crea una organización
CREATE OR REPLACE FUNCTION guardar_solicitud_registro()
RETURNS TRIGGER AS $$
DECLARE
  v_user_email TEXT;
  v_user_id UUID;
BEGIN
  -- Obtener el user_id del creador de la organización
  SELECT m.user_id INTO v_user_id
  FROM public.miembros m
  WHERE m.organizacion_id = NEW.id
    AND m.rol = 'ADMIN'
  LIMIT 1;

  -- Si no encontramos en miembros, intentar obtener del contexto de auth
  IF v_user_id IS NULL THEN
    v_user_id := auth.uid();
  END IF;

  -- Obtener el email del usuario
  IF v_user_id IS NOT NULL THEN
    SELECT email INTO v_user_email
    FROM auth.users
    WHERE id = v_user_id;
  END IF;

  -- Insertar la solicitud de registro
  INSERT INTO public.solicitudes_registro (
    organizacion_id,
    user_id,
    nombre_negocio,
    email_contacto,
    estado,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    v_user_id,
    NEW.nombre,
    COALESCE(v_user_email, 'sin-email@pendiente.com'),
    NEW.estado::TEXT, -- Convertir el ENUM a TEXT
    NOW(),
    NOW()
  );

  RAISE NOTICE 'Solicitud de registro guardada para organización: %', NEW.nombre;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error al guardar solicitud de registro: %', SQLERRM;
    -- No fallar la inserción de la organización si esto falla
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Crear el trigger que se ejecuta DESPUÉS de insertar una organización
DROP TRIGGER IF EXISTS trigger_guardar_solicitud_registro ON public.organizaciones;
CREATE TRIGGER trigger_guardar_solicitud_registro
  AFTER INSERT ON public.organizaciones
  FOR EACH ROW
  EXECUTE FUNCTION guardar_solicitud_registro();

-- 3. Función para actualizar el estado de la solicitud cuando cambia la organización
CREATE OR REPLACE FUNCTION actualizar_estado_solicitud()
RETURNS TRIGGER AS $$
BEGIN
  -- Solo actualizar si cambió el estado
  IF NEW.estado IS DISTINCT FROM OLD.estado THEN
    UPDATE public.solicitudes_registro
    SET 
      estado = NEW.estado::TEXT,
      updated_at = NOW()
    WHERE organizacion_id = NEW.id;

    RAISE NOTICE 'Estado de solicitud actualizado a: %', NEW.estado;
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error al actualizar estado de solicitud: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Trigger para actualizar estado cuando se modifica la organización
DROP TRIGGER IF EXISTS trigger_actualizar_estado_solicitud ON public.organizaciones;
CREATE TRIGGER trigger_actualizar_estado_solicitud
  AFTER UPDATE ON public.organizaciones
  FOR EACH ROW
  WHEN (OLD.estado IS DISTINCT FROM NEW.estado)
  EXECUTE FUNCTION actualizar_estado_solicitud();

-- 5. Verificación
SELECT 'Triggers de solicitudes_registro creados exitosamente!' as status;

-- Ver triggers activos
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'organizaciones'
  AND trigger_name LIKE '%solicitud%';
