# 🚀 Migración a Supabase Auth Nativo

Esta guía te ayudará a configurar tu sistema de stock SaaS usando **Supabase Auth + RLS nativo**, la forma más simple y segura.

## 🎯 ¿Por qué Supabase Auth Nativo?

✅ **Sin NextAuth.js**: Una dependencia menos  
✅ **RLS Automático**: `auth.uid()` funciona out-of-the-box  
✅ **Session Management**: Supabase maneja cookies automáticamente  
✅ **Menos código**: No necesitas middleware custom  
✅ **Más seguro**: Todo validado a nivel de base de datos  

## 📦 Paso 1: Instalar Dependencias

```bash
# Supabase con helpers de SSR para Next.js
npm install @supabase/supabase-js @supabase/ssr

# Remover NextAuth si lo tenías
npm uninstall next-auth
```

## 🔧 Paso 2: Variables de Entorno

Copia `.env.example` a `.env.local` y configura:

```env
NEXT_PUBLIC_SUPABASE_URL="https://xxx.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJ..."
SUPABASE_SERVICE_ROLE_KEY="eyJ..." # Solo para backend
```

## 🗄️ Paso 3: Ejecutar SQL en Supabase

### 3.1 Crear Schema

En **SQL Editor** de Supabase Dashboard:

```sql
-- Copia y pega el contenido de supabase/schema.sql
-- Esto crea: tablas, enums, triggers, índices
```

### 3.2 Configurar RLS y Vistas

```sql
-- Copia y pega el contenido de supabase_setup.sql
-- Esto configura: políticas RLS, vistas, funciones
```

## 🔐 Paso 4: Configurar Autenticación en Frontend

### 4.1 Crear Middleware (opcional)

Para proteger rutas automáticamente:

```typescript
// middleware.ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: any) {
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  await supabase.auth.getUser()

  return response
}

export const config = {
  matcher: ['/dashboard/:path*', '/api/:path*'],
}
```

### 4.2 Login Component

```typescript
'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'

export function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    
    if (error) {
      alert(error.message)
    } else {
      window.location.href = '/dashboard'
    }
  }

  return (
    <form onSubmit={handleLogin}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
      />
      <button type="submit">Iniciar Sesión</button>
    </form>
  )
}
```

### 4.3 Registro de Usuario

```typescript
const handleSignUp = async (email: string, password: string, fullName: string) => {
  const supabase = createClient()
  
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName, // Se guarda automáticamente en profiles
      },
    },
  })
  
  if (error) {
    console.error('Error:', error.message)
  } else {
    // El trigger handle_new_user() creó el perfil automáticamente
    console.log('Usuario creado:', data.user)
  }
}
```

## 📝 Paso 5: Uso en Server Components

```typescript
import { cookies } from 'next/headers'
import { createServerSupabaseClient } from '@/lib/supabase'

export default async function DashboardPage() {
  const cookieStore = cookies()
  const supabase = createServerSupabaseClient(cookieStore)
  
  // Obtener usuario (automático, sin pasar IDs)
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/login')
  }
  
  // RLS filtra automáticamente por usuario
  const { data: productos } = await supabase
    .from('productos')
    .select('*')
  
  return <div>{/* Renderizar productos */}</div>
}
```

## 🎨 Paso 6: Uso en Client Components

```typescript
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

export function ProductList({ orgId }: { orgId: string }) {
  const [productos, setProductos] = useState([])
  const supabase = createClient()
  
  useEffect(() => {
    const fetchProductos = async () => {
      const { data } = await supabase
        .from('productos')
        .select('*')
        .eq('organizacion_id', orgId)
      
      setProductos(data || [])
    }
    
    fetchProductos()
  }, [orgId])
  
  return <ul>{/* Renderizar lista */}</ul>
}
```

## 🔄 Paso 7: Realtime (Bonus)

Supabase permite suscripciones en tiempo real:

```typescript
const supabase = createClient()

// Escuchar cambios en productos
const channel = supabase
  .channel('productos-changes')
  .on(
    'postgres_changes',
    {
      event: '*', // INSERT, UPDATE, DELETE
      schema: 'public',
      table: 'productos'
    },
    (payload) => {
      console.log('Cambio detectado:', payload)
      // Actualizar UI automáticamente
    }
  )
  .subscribe()

// Cleanup
return () => {
  supabase.removeChannel(channel)
}
```

## ✅ Verificación

- [ ] SQL ejecutado sin errores
- [ ] RLS habilitado en todas las tablas
- [ ] Login funciona y crea perfil automáticamente
- [ ] Queries filtran correctamente por organización
- [ ] Solo ADMIN puede eliminar datos

## 🎯 Ventajas vs NextAuth.js

| Feature | NextAuth.js | Supabase Auth |
|---------|-------------|---------------|
| Setup Inicial | Complejo | Simple |
| Tablas Custom | Sí (users, accounts, sessions) | No (usa auth.users) |
| RLS | Manual con middleware | Automático con auth.uid() |
| Session | JWT custom | Cookie automática |
| Realtime | No | Sí (built-in) |
| Email Verification | Requiere config | Built-in |
| Password Reset | Custom | Built-in |

## 🐛 Troubleshooting

### Error: "JWT expired"
**Solución**: Supabase refresca el token automáticamente. Verifica que uses `@supabase/ssr`.

### Error: "RLS policy violated"
**Solución**: El usuario no es miembro de la organización. Verifica `miembros` table.

### Perfil no se crea automáticamente
**Solución**: Verifica que el trigger `on_auth_user_created` existe en `auth.users`.

### No puedo insertar datos
**Solución**: Asegúrate de estar enviando `organizacion_id` y que seas miembro de esa org.

## 📚 Recursos

- [Supabase Auth Docs](https://supabase.com/docs/guides/auth)
- [Next.js + Supabase SSR](https://supabase.com/docs/guides/auth/auth-helpers/nextjs)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)

---

**¡Sistema 100% Nativo con Supabase! 🎉**
