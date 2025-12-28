-- ============================================
-- TABLA DE CONFIGURACIÓN POR ORGANIZACIÓN
-- ============================================

CREATE TABLE IF NOT EXISTS public.configuracion_organizacion (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organizacion_id UUID NOT NULL UNIQUE REFERENCES public.organizaciones(id) ON DELETE CASCADE,
  
  -- Tipo de negocio
  tipo_negocio TEXT NOT NULL DEFAULT 'RETAIL_GENERAL',
  
  -- Features habilitadas
  usa_vencimientos BOOLEAN DEFAULT false,
  usa_produccion BOOLEAN DEFAULT false,
  usa_lotes BOOLEAN DEFAULT false,
  usa_mermas BOOLEAN DEFAULT true,
  usa_terceros BOOLEAN DEFAULT false,
  usa_almacenes BOOLEAN DEFAULT false,
  
  -- Unidades de medida permitidas
  unidades_medida TEXT[] DEFAULT ARRAY['UNIDADES']::TEXT[],
  
  -- Configuración de UI
  mostrar_valor_inventario BOOLEAN DEFAULT true,
  requiere_aprobacion_movimientos BOOLEAN DEFAULT false,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ÍNDICES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_config_org ON public.configuracion_organizacion(organizacion_id);

-- ============================================
-- RLS POLICIES
-- ============================================

ALTER TABLE public.configuracion_organizacion ENABLE ROW LEVEL SECURITY;

-- Ver configuración de mis organizaciones
CREATE POLICY "Ver configuracion de mis organizaciones" ON public.configuracion_organizacion
  FOR SELECT USING (
    organizacion_id IN (SELECT get_user_organizations())
  );

-- Solo ADMIN puede actualizar configuración
CREATE POLICY "Actualizar configuracion (solo ADMIN)" ON public.configuracion_organizacion
  FOR UPDATE USING (
    organizacion_id IN (SELECT get_user_organizations())
  );

-- Crear configuración al crear organización
CREATE POLICY "Crear configuracion" ON public.configuracion_organizacion
  FOR INSERT WITH CHECK (
    organizacion_id IN (SELECT get_user_organizations())
  );

-- ============================================
-- TRIGGER PARA CREAR CONFIGURACIÓN DEFAULT
-- ============================================

CREATE OR REPLACE FUNCTION crear_configuracion_default()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.configuracion_organizacion (organizacion_id, tipo_negocio)
  VALUES (NEW.id, 'RETAIL_GENERAL');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_crear_configuracion ON public.organizaciones;

CREATE TRIGGER trigger_crear_configuracion
  AFTER INSERT ON public.organizaciones
  FOR EACH ROW
  EXECUTE FUNCTION crear_configuracion_default();

-- ============================================
-- MIGRAR ORGANIZACIONES EXISTENTES
-- ============================================

INSERT INTO public.configuracion_organizacion (organizacion_id, tipo_negocio)
SELECT id, 'RETAIL_GENERAL' 
FROM public.organizaciones 
WHERE id NOT IN (SELECT organizacion_id FROM public.configuracion_organizacion)
ON CONFLICT (organizacion_id) DO NOTHING;

-- ============================================
-- VERIFICACIÓN
-- ============================================

SELECT 'Tabla configuracion_organizacion creada exitosamente!' as status;
