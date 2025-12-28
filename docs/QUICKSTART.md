# 🚀 Quick Start - Supabase Auth Nativo

## 📥 Instalación Rápida

### 1. Instalar Dependencias

```bash
npm install @supabase/supabase-js @supabase/ssr
```

### 2. Configurar Variables

Copia `.env.example` a `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL="https://xxx.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJ..."
SUPABASE_SERVICE_ROLE_KEY="eyJ..."
```

### 3. Ejecutar SQL en Supabase

Ve a **SQL Editor** en Supabase Dashboard y ejecuta:

1. **Schema** (tablas, enums, triggers):
   ```sql
   -- Copia y pega: supabase/schema.sql
   ```

2. **Setup** (RLS, vistas, funciones):
   ```sql
   -- Copia y pega: supabase_setup.sql
   ```

### 4. Usar en tu App

```typescript
import { createClient } from '@/lib/supabase'

const supabase = createClient()

// Login
await supabase.auth.signInWithPassword({ email, password })

// Consultar datos (RLS automático)
const { data } = await supabase.from('productos').select('*')
```

## ✅ ¡Listo!

Lee `SUPABASE_MIGRATION.md` para detalles completos.
