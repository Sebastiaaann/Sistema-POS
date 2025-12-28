-- ============================================
-- SUPABASE NATIVE SCHEMA - Sistema de Stock SaaS
-- VERSIÓN: Con Supabase Auth Nativo + RLS
-- ============================================

BEGIN;

-- ============================================
-- 1. EXTENSIONES
-- ============================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";      -- Búsquedas de texto rápidas
CREATE EXTENSION IF NOT EXISTS "moddatetime";  -- Auto-update timestamps

-- ============================================
-- 2. ENUMS
-- ============================================

DO $$ BEGIN
    CREATE TYPE "RolUsuario" AS ENUM ('ADMIN', 'VENDEDOR');
    CREATE TYPE "TipoMovimiento" AS ENUM ('ENTRADA', 'SALIDA', 'AJUSTE_POSITIVO', 'AJUSTE_NEGATIVO', 'TRANSFERENCIA');
    CREATE TYPE "PlanSuscripcion" AS ENUM ('BASICO', 'PRO', 'ENTERPRISE');
    CREATE TYPE "TipoTercero" AS ENUM ('PROVEEDOR', 'CLIENTE', 'AMBOS');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================
-- 3. PERFILES (Sincronizado con auth.users)
-- ============================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Trigger: Crear perfil automáticamente al registrarse
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ============================================
-- 4. ORGANIZACIONES (Multi-tenancy)
-- ============================================

CREATE TABLE IF NOT EXISTS public.organizaciones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  url_logo TEXT,
  colores JSONB,
  plan "PlanSuscripcion" DEFAULT 'BASICO',
  
  -- Configuración de Negocio
  moneda TEXT DEFAULT 'CLP',
  formato_fecha TEXT DEFAULT 'DD/MM/YYYY',
  permitir_stock_negativo BOOLEAN DEFAULT true,
  alerta_stock_bajo INTEGER DEFAULT 10,
  venta_sin_stock BOOLEAN DEFAULT false,
  
  -- Auditoría
  deleted_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.organizaciones ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 5. MIEMBROS (Pivote: Usuario <-> Organización)
-- ============================================

CREATE TABLE IF NOT EXISTS public.miembros (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  organizacion_id UUID NOT NULL REFERENCES public.organizaciones(id) ON DELETE CASCADE,
  rol "RolUsuario" DEFAULT 'VENDEDOR',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, organizacion_id)
);

ALTER TABLE public.miembros ENABLE ROW LEVEL SECURITY;

-- Índices
CREATE INDEX IF NOT EXISTS idx_miembros_user ON public.miembros(user_id);
CREATE INDEX IF NOT EXISTS idx_miembros_org ON public.miembros(organizacion_id);

-- ============================================
-- 6. CATEGORÍAS
-- ============================================

CREATE TABLE IF NOT EXISTS public.categorias (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre TEXT NOT NULL,
  descripcion TEXT,
  organizacion_id UUID NOT NULL REFERENCES public.organizaciones(id) ON DELETE CASCADE,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.categorias ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_categorias_org ON public.categorias(organizacion_id);

-- ============================================
-- 7. TERCEROS (Proveedores y Clientes)
-- ============================================

CREATE TABLE IF NOT EXISTS public.terceros (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organizacion_id UUID NOT NULL REFERENCES public.organizaciones(id) ON DELETE CASCADE,
  tipo "TipoTercero" NOT NULL,
  nombre TEXT NOT NULL,
  rut TEXT,
  email TEXT,
  telefono TEXT,
  direccion TEXT,
  ciudad TEXT,
  pais TEXT DEFAULT 'Chile',
  notas TEXT,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(rut, organizacion_id)
);

ALTER TABLE public.terceros ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_terceros_org ON public.terceros(organizacion_id);
CREATE INDEX IF NOT EXISTS idx_terceros_tipo ON public.terceros(tipo);

-- ============================================
-- 8. ALMACENES
-- ============================================

CREATE TABLE IF NOT EXISTS public.almacenes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organizacion_id UUID NOT NULL REFERENCES public.organizaciones(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  codigo TEXT NOT NULL,
  direccion TEXT,
  ciudad TEXT,
  responsable TEXT,
  es_principal BOOLEAN DEFAULT false,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(codigo, organizacion_id)
);

ALTER TABLE public.almacenes ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_almacenes_org ON public.almacenes(organizacion_id);

-- ============================================
-- 9. PRODUCTOS
-- ============================================

CREATE TABLE IF NOT EXISTS public.productos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organizacion_id UUID NOT NULL REFERENCES public.organizaciones(id) ON DELETE CASCADE,
  categoria_id UUID REFERENCES public.categorias(id) ON DELETE SET NULL,
  nombre TEXT NOT NULL,
  sku TEXT NOT NULL,
  codigo_barras TEXT,
  descripcion TEXT,
  unidad_medida TEXT DEFAULT 'UND',
  
  -- Finanzas (Precisión Alta)
  precio_venta DECIMAL(12, 4) NOT NULL DEFAULT 0,
  precio_costo DECIMAL(12, 4) NOT NULL DEFAULT 0,
  
  -- Stock Global (Caché, actualizado por triggers)
  stock_actual INTEGER DEFAULT 0,
  
  -- Imagen
  imagen_url TEXT,
  
  -- Soft Delete
  deleted_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.productos ENABLE ROW LEVEL SECURITY;

-- ÍNDICE PARCIAL: Permite reutilizar SKU si el anterior fue borrado
CREATE UNIQUE INDEX IF NOT EXISTS productos_sku_org_idx 
ON public.productos(sku, organizacion_id) 
WHERE deleted_at IS NULL;

-- Índices de búsqueda
CREATE INDEX IF NOT EXISTS idx_productos_org ON public.productos(organizacion_id);
CREATE INDEX IF NOT EXISTS idx_productos_nombre ON public.productos USING GIN (nombre gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_productos_sku ON public.productos(sku);
CREATE INDEX IF NOT EXISTS idx_productos_barras ON public.productos(codigo_barras) WHERE codigo_barras IS NOT NULL;

-- ============================================
-- 10. STOCK POR ALMACÉN
-- ============================================

CREATE TABLE IF NOT EXISTS public.stock_por_almacen (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organizacion_id UUID NOT NULL REFERENCES public.organizaciones(id) ON DELETE CASCADE,
  producto_id UUID NOT NULL REFERENCES public.productos(id) ON DELETE CASCADE,
  almacen_id UUID NOT NULL REFERENCES public.almacenes(id) ON DELETE CASCADE,
  
  stock_actual INTEGER DEFAULT 0,
  stock_minimo INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(producto_id, almacen_id)
);

ALTER TABLE public.stock_por_almacen ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_stock_producto ON public.stock_por_almacen(producto_id);
CREATE INDEX IF NOT EXISTS idx_stock_almacen ON public.stock_por_almacen(almacen_id);
CREATE INDEX IF NOT EXISTS idx_stock_org ON public.stock_por_almacen(organizacion_id);

-- ============================================
-- 11. MOVIMIENTOS DE STOCK
-- ============================================

CREATE TABLE IF NOT EXISTS public.movimientos_stock (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organizacion_id UUID NOT NULL REFERENCES public.organizaciones(id) ON DELETE CASCADE,
  
  tipo "TipoMovimiento" NOT NULL,
  cantidad INTEGER NOT NULL CHECK (cantidad > 0),
  motivo TEXT,
  numero_documento TEXT,
  fecha TIMESTAMPTZ DEFAULT NOW(),
  
  -- Referencias
  producto_id UUID NOT NULL REFERENCES public.productos(id) ON DELETE RESTRICT,
  almacen_id UUID REFERENCES public.almacenes(id) ON DELETE RESTRICT,
  creado_por_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  tercero_id UUID REFERENCES public.terceros(id) ON DELETE SET NULL,
  
  -- Snapshots Financieros
  precio_unitario_snapshot DECIMAL(12, 4),
  costo_unitario_snapshot DECIMAL(12, 4),
  
  -- COLUMNA GENERADA (Cálculo automático)
  valor_total DECIMAL(14, 4) GENERATED ALWAYS AS (
    cantidad * COALESCE(precio_unitario_snapshot, 0)
  ) STORED
);

ALTER TABLE public.movimientos_stock ENABLE ROW LEVEL SECURITY;

-- Índices de rendimiento
CREATE INDEX IF NOT EXISTS idx_movimientos_org_fecha ON public.movimientos_stock(organizacion_id, fecha DESC);
CREATE INDEX IF NOT EXISTS idx_movimientos_producto ON public.movimientos_stock(producto_id);
CREATE INDEX IF NOT EXISTS idx_movimientos_almacen ON public.movimientos_stock(almacen_id);
CREATE INDEX IF NOT EXISTS idx_movimientos_tipo ON public.movimientos_stock(tipo, fecha DESC);

-- ============================================
-- 12. TRIGGERS DE ACTUALIZACIÓN (updated_at)
-- ============================================

CREATE TRIGGER update_profiles_modtime 
  BEFORE UPDATE ON public.profiles 
  FOR EACH ROW EXECUTE PROCEDURE moddatetime(updated_at);

CREATE TRIGGER update_organizaciones_modtime 
  BEFORE UPDATE ON public.organizaciones 
  FOR EACH ROW EXECUTE PROCEDURE moddatetime(updated_at);

CREATE TRIGGER update_miembros_modtime 
  BEFORE UPDATE ON public.miembros 
  FOR EACH ROW EXECUTE PROCEDURE moddatetime(updated_at);

CREATE TRIGGER update_categorias_modtime 
  BEFORE UPDATE ON public.categorias 
  FOR EACH ROW EXECUTE PROCEDURE moddatetime(updated_at);

CREATE TRIGGER update_terceros_modtime 
  BEFORE UPDATE ON public.terceros 
  FOR EACH ROW EXECUTE PROCEDURE moddatetime(updated_at);

CREATE TRIGGER update_almacenes_modtime 
  BEFORE UPDATE ON public.almacenes 
  FOR EACH ROW EXECUTE PROCEDURE moddatetime(updated_at);

CREATE TRIGGER update_productos_modtime 
  BEFORE UPDATE ON public.productos 
  FOR EACH ROW EXECUTE PROCEDURE moddatetime(updated_at);

CREATE TRIGGER update_stock_modtime 
  BEFORE UPDATE ON public.stock_por_almacen 
  FOR EACH ROW EXECUTE PROCEDURE moddatetime(updated_at);

COMMIT;

-- ============================================
-- VERIFICACIÓN
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ Schema Supabase Native creado';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Tablas: 10';
  RAISE NOTICE 'Enums: 4';
  RAISE NOTICE 'Triggers: 9';
  RAISE NOTICE '========================================';
  RAISE NOTICE '⚠️  Ejecuta supabase_setup.sql para RLS';
  RAISE NOTICE '========================================';
END $$;
