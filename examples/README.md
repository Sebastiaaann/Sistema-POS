# 📚 Ejemplos de Uso - Supabase

Este directorio contiene ejemplos simplificados de cómo usar Supabase en tu aplicación.

## 📄 Archivo: `supabase-usage.ts`

Contiene funciones de ejemplo para:

### Autenticación
- ✅ `signUp()` - Registrar usuario
- ✅ `signIn()` - Iniciar sesión
- ✅ `signOut()` - Cerrar sesión
- ✅ `getCurrentUser()` - Obtener usuario actual

### Organizaciones
- ✅ `createOrganization()` - Crear org y auto-agregarse como ADMIN
- ✅ `getMyOrganizations()` - Listar mis organizaciones

### Productos
- ✅ `getProductos()` - Listar productos con joins
- ✅ `createProducto()` - Crear producto con validación
- ✅ `updateProducto()` - Actualizar producto
- ✅ `deleteProducto()` - Soft delete (solo ADMIN)

### Movimientos de Stock
- ✅ `createMovimiento()` - Entrada/Salida/Ajuste
- ✅ `transferirStock()` - Transferencia entre almacenes (2 movimientos)
- ✅ `getMovimientos()` - Historial con vista completa

### Vistas
- ✅ `getProductosStockBajo()` - Alertas de stock
- ✅ `getStockPorAlmacen()` - Distribución por almacén

### Realtime
- ✅ `subscribeToProductos()` - Cambios en tiempo real

## 🚀 Uso

```typescript
import { signIn, getProductos, createMovimiento } from './examples/supabase-usage'

// Login
await signIn('user@example.com', 'password')

// Listar productos
const productos = await getProductos('org-id')

// Crear entrada de stock
await createMovimiento('org-id', 'prod-id', 'alm-id', 'ENTRADA', 10)
```

## ⚠️ Nota

Estas son funciones de ejemplo. En tu app real:
- Agrega manejo de errores más robusto
- Implementa loading states
- Valida inputs antes de enviar
- Usa TypeScript strict mode

## 🔗 Referencias

- Ver `lib/supabase.ts` para el cliente
- Ver `lib/database.types.ts` para los tipos
- Ver `PRODUCTION_NOTES.md` para mejores prácticas
