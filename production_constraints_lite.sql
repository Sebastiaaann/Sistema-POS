-- ============================================
-- PRODUCTION CONSTRAINTS LITE - Sistema de Stock SaaS
-- VERSIÓN: TIENDA FLEXIBLE (Ferreterías, Botillerías, Panaderías)
-- ============================================
-- 
-- Esta versión está optimizada para TIENDAS PEQUEÑAS donde:
-- ✅ La velocidad de venta es más importante que el control estricto
-- ✅ El inventario físico y digital pueden no coincidir
-- ✅ Se permite stock negativo (corrección posterior)
-- ✅ Los dueños borran productos por error y quieren recrearlos
--
-- DIFERENCIAS CON LA VERSIÓN ENTERPRISE:
-- ❌ NO tiene CHECK de stock >= 0 (permite ventas con stock en 0)
-- ❌ NO tiene columna generada valorTotal (menos complejidad)
-- ✅ SÍ tiene índice parcial de SKU (usabilidad crítica)
-- ✅ SÍ tiene índices de performance (velocidad)
-- ✅ SÍ tiene vista simplificada (reportes)
--
-- Ejecutar con:
-- psql -U postgres -d sistema_stock -f production_constraints_lite.sql
-- ============================================

BEGIN;

-- ============================================
-- 1. ÍNDICE PARCIAL: SKU Reutilizable
-- ============================================
-- CRÍTICO: Permite recrear un producto con el mismo código de barras
-- si el anterior fue borrado. Sin esto, el dueño no puede corregir errores.
--
-- Caso real: "Borré la Coca Cola por error, ahora no puedo crearla de nuevo"
-- Con este índice: Puede recrearla inmediatamente ✅

DO $$ 
BEGIN
  -- Limpiar constraint si Prisma lo creó
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'productos_sku_organizacionId_key'
  ) THEN
    ALTER TABLE "productos" DROP CONSTRAINT "productos_sku_organizacionId_key";
    RAISE NOTICE '🗑️  Constraint de SKU eliminado';
  END IF;

  -- Limpiar índice estándar si existe
  DROP INDEX IF EXISTS "productos_sku_organizacionId_key";
  
  -- Crear índice PARCIAL (solo productos activos)
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'productos_sku_organizacionId_key'
  ) THEN
    CREATE UNIQUE INDEX "productos_sku_organizacionId_key" 
    ON "productos"("sku", "organizacionId") 
    WHERE "deletedAt" IS NULL;
    
    RAISE NOTICE '✅ Índice parcial de SKU creado (permite reutilizar códigos)';
  ELSE
    RAISE NOTICE '⚠️  Índice de SKU ya existe';
  END IF;
END $$;

-- ============================================
-- 2. VALIDACIÓN BÁSICA (Sin bloquear ventas)
-- ============================================
-- Solo validamos que la CANTIDAD sea positiva.
-- El TIPO de movimiento (ENTRADA/SALIDA) define la dirección.
-- 
-- ❌ NO bloqueamos stock negativo - la tienda decide si vende o no

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'check_movimiento_cantidad_positiva'
  ) THEN
    ALTER TABLE "movimientos_stock" 
    ADD CONSTRAINT "check_movimiento_cantidad_positiva" 
    CHECK ("cantidad" > 0);
    
    RAISE NOTICE '✅ Validación de cantidad positiva creada';
  ELSE
    RAISE NOTICE '⚠️  Validación de cantidad ya existe';
  END IF;
END $$;

-- ============================================
-- 3. ÍNDICES DE VELOCIDAD
-- ============================================
-- Para que la tienda no espere cuando busca productos o ve reportes

-- Búsqueda de productos (ignorando mayúsculas)
-- "coca" encuentra "Coca Cola", "COCA COLA", etc.
CREATE INDEX IF NOT EXISTS "productos_nombre_lower_idx" 
ON "productos"(LOWER("nombre"));

-- Búsqueda por SKU/código de barras
CREATE INDEX IF NOT EXISTS "productos_sku_lower_idx" 
ON "productos"(LOWER("sku"), "organizacionId");

-- Historial de movimientos (para reportes rápidos)
CREATE INDEX IF NOT EXISTS "movimientos_reportes_idx" 
ON "movimientos_stock"("organizacionId", "fecha" DESC, "tipo");

-- Productos por categoría (para navegación)
CREATE INDEX IF NOT EXISTS "productos_categoria_idx" 
ON "productos"("organizacionId", "categoriaId") 
WHERE "deletedAt" IS NULL;

-- Búsqueda de usuarios por email
CREATE INDEX IF NOT EXISTS "users_email_lower_idx" 
ON "users"(LOWER("email"));

-- ============================================
-- 4. VISTA SIMPLIFICADA (Dashboard)
-- ============================================
-- Una sola vista con todo lo necesario para reportes
-- Calcula totales aquí para no cargar Node.js

CREATE OR REPLACE VIEW "view_movimientos_completo" AS
SELECT 
  m.id,
  m.fecha,
  m.tipo,
  m.cantidad,
  m.motivo,
  
  -- Precios del momento de la venta
  m."precioUnitarioSnapshot",
  m."costoUnitarioSnapshot",
  
  -- Totales calculados
  (m.cantidad * COALESCE(m."precioUnitarioSnapshot", 0)) as "totalVenta",
  (m.cantidad * COALESCE(m."costoUnitarioSnapshot", 0)) as "totalCosto",
  (m.cantidad * COALESCE(m."precioUnitarioSnapshot", 0)) - 
  (m.cantidad * COALESCE(m."costoUnitarioSnapshot", 0)) as "ganancia",
  
  -- Datos del producto
  p.id as "productoId",
  p.nombre as "productoNombre",
  p.sku as "productoSku",
  p."stockActual",
  
  -- Datos del usuario
  u.id as "usuarioId",
  u.name as "usuarioNombre",
  
  -- Organización (para filtrar)
  m."organizacionId"

FROM "movimientos_stock" m
JOIN "productos" p ON p.id = m."productoId"
LEFT JOIN "users" u ON u.id = m."creadoPorId"
ORDER BY m.fecha DESC;

-- ============================================
-- 5. VISTA DE ALERTAS (Stock Bajo)
-- ============================================
-- Para notificaciones de "te estás quedando sin X"

CREATE OR REPLACE VIEW "view_productos_stock_bajo" AS
SELECT 
  p.id,
  p.nombre,
  p.sku,
  p."stockActual",
  p."precioVenta",
  p."precioCosto",
  c.nombre as "categoriaNombre",
  o.id as "organizacionId",
  o.nombre as "organizacionNombre",
  o."alertaStockBajo" as "umbral",
  
  -- Indicadores
  CASE 
    WHEN p."stockActual" <= 0 THEN 'AGOTADO'
    WHEN p."stockActual" < COALESCE(o."alertaStockBajo", 10) THEN 'BAJO'
    ELSE 'OK'
  END as "estadoStock"

FROM "productos" p
JOIN "organizaciones" o ON o.id = p."organizacionId"
LEFT JOIN "categorias" c ON c.id = p."categoriaId"
WHERE p."deletedAt" IS NULL
  AND p."isActive" = true
  AND p."stockActual" < COALESCE(o."alertaStockBajo", 10)
ORDER BY p."stockActual" ASC;

-- ============================================
-- VERIFICACIÓN FINAL
-- ============================================

DO $$
DECLARE
  idx_count INTEGER;
  constraint_count INTEGER;
BEGIN
  -- Contar índices creados
  SELECT COUNT(*) INTO idx_count 
  FROM pg_indexes 
  WHERE schemaname = 'public' 
    AND indexname IN (
      'productos_sku_organizacionId_key',
      'productos_nombre_lower_idx',
      'productos_sku_lower_idx',
      'movimientos_reportes_idx',
      'productos_categoria_idx',
      'users_email_lower_idx'
    );
    
  -- Contar constraints
  SELECT COUNT(*) INTO constraint_count
  FROM pg_constraint
  WHERE conname = 'check_movimiento_cantidad_positiva';
  
  RAISE NOTICE '========================================';
  RAISE NOTICE '📊 RESUMEN DE INSTALACIÓN';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ Índices creados: %', idx_count;
  RAISE NOTICE '✅ Constraints creados: %', constraint_count;
  RAISE NOTICE '✅ Vistas creadas: 2';
  RAISE NOTICE '========================================';
  RAISE NOTICE '🎉 ¡Listo para vender!';
  RAISE NOTICE '========================================';
END $$;

COMMIT;

-- ============================================
-- ROLLBACK (En caso de error)
-- ============================================
/*
BEGIN;

-- Eliminar índices
DROP INDEX IF EXISTS "productos_sku_organizacionId_key";
DROP INDEX IF EXISTS "productos_nombre_lower_idx";
DROP INDEX IF EXISTS "productos_sku_lower_idx";
DROP INDEX IF EXISTS "movimientos_reportes_idx";
DROP INDEX IF EXISTS "productos_categoria_idx";
DROP INDEX IF EXISTS "users_email_lower_idx";

-- Eliminar constraints
ALTER TABLE "movimientos_stock" DROP CONSTRAINT IF EXISTS "check_movimiento_cantidad_positiva";

-- Eliminar vistas
DROP VIEW IF EXISTS "view_movimientos_completo";
DROP VIEW IF EXISTS "view_productos_stock_bajo";

COMMIT;
*/

-- ============================================
-- NOTAS DE USO
-- ============================================
--
-- PARA TIENDAS QUE QUIEREN BLOQUEAR STOCK NEGATIVO:
-- Pueden activarlo en la configuración de su organización:
-- UPDATE organizaciones SET "permitirStockNegativo" = false WHERE id = 'xxx';
--
-- La validación se hace en el código backend, no en la base de datos.
-- Esto permite flexibilidad por cliente sin cambiar el schema.
-- ============================================

