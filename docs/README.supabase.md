# 📦 TechStock - Sistema de Inventario SaaS

Sistema de gestión de inventario multi-tenancy construido con **React + Vite** y **Supabase**.

## 🛠️ Stack Tecnológico

- **Frontend**: React 19 + TypeScript + Vite
- **Backend/Base de Datos**: Supabase (PostgreSQL + Auth + Storage)
- **Base de Datos**: Supabase (PostgreSQL)
- **Cliente DB**: `@supabase/supabase-js` (sin ORM)
- **Autenticación**: NextAuth.js (compatible con Supabase Auth)
- **Seguridad**: Row Level Security (RLS) nativo

## 📋 Características

✅ **Multi-tenancy completo** con aislamiento por organización  
✅ **Row Level Security** a nivel de base de datos  
✅ **Sistema de roles** (ADMIN, VENDEDOR)  
✅ **Gestión de productos** con categorías  
✅ **Stock multi-almacén** con alertas  
✅ **Movimientos de inventario** con snapshots de precios  
✅ **Proveedores y clientes** (terceros)  
✅ **Soft deletes** para auditoria  
✅ **Vistas optimizadas** para reportes  

## 🛠️ Instalación

### 1. Clonar e instalar dependencias

```bash
git clone <repo>
cd saas
npm install @supabase/supabase-js
```

### 2. Configurar Supabase

1. Crear proyecto en [Supabase](https://supabase.com)
2. Copiar credenciales a `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL="https://xxx.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJ..."
SUPABASE_SERVICE_ROLE_KEY="eyJ..."
```

### 3. Crear schema de base de datos

En Supabase SQL Editor, ejecutar en orden:

```sql
-- 1. Crear tablas
\i supabase/schema.sql

-- 2. Configurar índices, RLS y vistas
\i supabase_setup.sql
```

### 4. Ejecutar aplicación

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000)

## 📁 Estructura del Proyecto

```
saas/
├── supabase/
│   └── schema.sql          # Schema de base de datos
├── lib/
│   ├── supabase.ts         # Cliente de Supabase
│   ├── supabase-rls.ts     # Helpers para RLS
│   └── database.types.ts   # Tipos TypeScript
├── app/
│   └── api/
│       └── productos/
│           └── route.example.ts  # Ejemplo de API
├── supabase_setup.sql      # Índices, RLS, Vistas
├── .env.example            # Template de variables
├── SUPABASE_MIGRATION.md   # Guía de migración
└── RESUMEN_SUPABASE.md     # Resumen técnico
```

## 🔐 Seguridad y RLS

Todas las tablas tienen políticas RLS que garantizan:

- Los usuarios solo ven datos de sus organizaciones
- Los ADMIN pueden eliminar, VENDEDOR solo editar
- Imposible acceder a datos de otras organizaciones
- Validaciones a nivel de base de datos

## 📊 Modelos de Datos

### Principales
- **Organizaciones**: Multi-tenancy
- **Usuarios**: Autenticación
- **Miembros**: Roles por organización
- **Productos**: Inventario
- **Movimientos**: Historial de stock
- **Almacenes**: Multi-ubicación
- **Terceros**: Proveedores/Clientes

## 🎯 Ejemplos de Uso

### Consultar productos

```typescript
import { supabase } from '@/lib/supabase'

const { data, error } = await supabase
  .from('productos')
  .select('*, categoria:categorias(*)')
  .eq('organizacionId', orgId)
  .is('deletedAt', null)
```

### Crear movimiento

```typescript
const { data, error } = await supabase
  .from('movimientos_stock')
  .insert({
    tipo: 'ENTRADA',
    cantidad: 10,
    productoId: productId,
    creadoPorId: userId,
    organizacionId: orgId,
    almacenId: almacenId
  })
```

### Verificar permisos

```typescript
import { isOrganizationAdmin } from '@/lib/supabase-rls'

if (await isOrganizationAdmin(userId, orgId)) {
  // Permitir eliminación
}
```

## 📖 Documentación

- [SUPABASE_MIGRATION.md](./SUPABASE_MIGRATION.md) - Guía completa de setup
- [RESUMEN_SUPABASE.md](./RESUMEN_SUPABASE.md) - Resumen técnico
- [Supabase Docs](https://supabase.com/docs)

## 🤝 Contribuir

Las contribuciones son bienvenidas. Por favor:

1. Fork el proyecto
2. Crea una rama (`git checkout -b feature/nueva-funcionalidad`)
3. Commit tus cambios (`git commit -m 'Agregar nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Abre un Pull Request

## 📝 Licencia

MIT

## 🙋 Soporte

Si tienes preguntas, revisa la documentación o abre un issue.

---

**Hecho con ❤️ usando Supabase**
