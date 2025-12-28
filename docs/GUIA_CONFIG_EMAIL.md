# 📧 Guía Completa: Configurar Notificaciones por Email

Esta guía te llevará paso a paso para activar las notificaciones por email cuando se crea una nueva organización.

---

## 🎯 Objetivo

Cuando un usuario cree una organización, quieres recibir un email automático en **sebastian.almo9@gmail.com** para aprobarla.

---

## 📋 Pasos de Configuración

### **PASO 1: Desplegar las Edge Functions en Supabase**

#### 1.1 Instalar Supabase CLI (si no la tienes)

```powershell
npm install -g supabase
```

#### 1.2 Iniciar sesión en Supabase

```powershell
supabase login
```

Esto abrirá tu navegador para autenticarte.

#### 1.3 Enlazar tu proyecto

Primero, necesitas tu **Project Reference ID**:
- Ve a [Supabase Dashboard](https://app.supabase.com)
- Selecciona tu proyecto
- Ve a **Settings** → **General**
- Copia el **Reference ID** (algo como `tfuqlbrxjzxepdbkdmqg`)

Luego ejecuta:

```powershell
cd C:\Users\elwax\Desktop\saas
supabase link --project-ref [TU-PROJECT-REF]
```

Reemplaza `[TU-PROJECT-REF]` con tu Reference ID.

#### 1.4 Desplegar las Edge Functions

```powershell
# Desplegar función de notificación
supabase functions deploy send-approval-notification

# Desplegar función de aprobación
supabase functions deploy approve-organization
```

✅ **Checkpoint**: Deberías ver un mensaje de éxito. Las funciones ahora están desplegadas.

---

### **PASO 2: Configurar Variables de Entorno**

Ve a [Supabase Dashboard](https://app.supabase.com) → Tu Proyecto → **Edge Functions**.

#### 2.1 Variables para `send-approval-notification`

Haz clic en la función **send-approval-notification** → pestaña **Settings** → **Add secret**:

**Para Modo Test (SIN Resend - RECOMENDADO PARA EMPEZAR):**

| Variable | Valor |
|----------|-------|
| `ADMIN_EMAIL` | `sebastian.almo9@gmail.com` |
| `TEST_MODE` | `true` |

Con esto, las notificaciones se registrarán en los **logs** en lugar de enviarse por email real.

**Para Modo Producción (CON Resend - cuando tengas dominio verificado):**

| Variable | Valor |
|----------|-------|
| `ADMIN_EMAIL` | `sebastian.almo9@gmail.com` |
| `RESEND_API_KEY` | Tu API key de Resend (comienza con `re_`) |
| `EMAIL_DOMAIN` | Tu dominio verificado en Resend (ej: `tudominio.com`) |
| `EMAIL_FROM_NAME` | `TechStock` (opcional) |
| `ADMIN_SECRET_TOKEN` | Una clave secreta única (ej: `mi-token-secreto-123`) |

> **Nota**: `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` son automáticas, no las configures manualmente.

#### 2.2 Variables para `approve-organization`

Haz clic en la función **approve-organization** → pestaña **Settings** → **Add secret**:

| Variable | Valor |
|----------|-------|
| `ADMIN_SECRET_TOKEN` | El mismo token que usaste arriba |

---

### **PASO 3: Configurar el Trigger en la Base de Datos**

#### 3.1 Ejecutar SQL de aprobación

1. Ve a [Supabase Dashboard](https://app.supabase.com) → **SQL Editor**
2. Crea una nueva query
3. Pega el contenido del archivo `supabase/aprobacion_organizaciones.sql`
4. Haz clic en **Run**

✅ **Checkpoint**: Deberías ver un mensaje de éxito.

#### 3.2 Configurar URLs en la tabla `app_config`

En el **SQL Editor**, ejecuta:

```sql
-- Actualizar con tu URL de Supabase
-- Formato: https://[tu-project-ref].supabase.co
UPDATE public.app_config 
SET value = 'https://tfuqlbrxjzxepdbkdmqg.supabase.co' 
WHERE key = 'supabase_url';

-- Actualizar con tu anon key
-- Ve a Settings → API → Project API keys → anon public
UPDATE public.app_config 
SET value = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' 
WHERE key = 'supabase_anon_key';
```

**¿Dónde encuentro estos valores?**
- Supabase Dashboard → **Settings** → **API**
- **Project URL**: Copia la URL (ej: `https://tfuqlbrxjzxepdbkdmqg.supabase.co`)
- **anon/public key**: Copia la clave `anon public` (es un JWT largo)

---

### **PASO 4: Verificar que todo funciona**

#### 4.1 Verificar el Trigger

Ejecuta este SQL en el **SQL Editor**:

```sql
SELECT tgname, tgrelid::regclass 
FROM pg_trigger 
WHERE tgname = 'trigger_notificar_organizacion_pendiente';
```

Deberías ver una fila con el trigger. Si no aparece nada, vuelve al **PASO 3.1**.

#### 4.2 Probar la Edge Function manualmente

Ve a **Edge Functions** → **send-approval-notification** → **Invoke**

Pega este JSON de prueba:

```json
{
  "organizacion_id": "00000000-0000-0000-0000-000000000000",
  "user_id": "00000000-0000-0000-0000-000000000000"
}
```

Haz clic en **Invoke**. 

**Si estás en modo test**, ve a la pestaña **Logs** y deberías ver:
```
📧 NOTIFICACIÓN DE APROBACIÓN (MODO TEST)
Para: sebastian.almo9@gmail.com
...
```

#### 4.3 Crear una Organización de Prueba

1. En tu aplicación, registra un nuevo usuario
2. Verifica el email
3. Crea una organización
4. **Ve a los logs de la Edge Function**:
   - Supabase Dashboard → **Edge Functions** → **send-approval-notification** → **Logs**
   - Deberías ver toda la información del email

---

## 🔍 Diagnóstico de Problemas

### Problema: "No veo nada en los logs"

**Solución**: Ejecuta este SQL para diagnosticar:

```sql
-- Ver si el trigger existe
SELECT * FROM pg_trigger WHERE tgname = 'trigger_notificar_organizacion_pendiente';

-- Ver si pg_net está instalado
SELECT * FROM pg_extension WHERE extname = 'pg_net';

-- Si pg_net NO existe, ejecuta:
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Ver configuración
SELECT * FROM public.app_config;
```

### Problema: "El trigger no se ejecuta"

Verifica que la organización se creó con estado `PENDIENTE`:

```sql
SELECT id, nombre, estado, created_at 
FROM organizaciones 
ORDER BY created_at DESC 
LIMIT 5;
```

### Problema: "Error en los logs"

Revisa los logs de la Edge Function para ver el error específico.

---

## 📝 Resumen de lo que hiciste

1. ✅ Desplegaste las Edge Functions en Supabase
2. ✅ Configuraste las variables de entorno (modo test)
3. ✅ Ejecutaste el SQL para crear el trigger
4. ✅ Configuraste la tabla `app_config` con tus URLs
5. ✅ Verificaste que funciona viendo los logs

---

## 🎯 Próximos Pasos

### Opción A: Mantener Modo Test (Recomendado por ahora)

Cada vez que se cree una organización, verás la notificación en los **logs de Supabase**. 
Puedes aprobar organizaciones manualmente usando el panel que creé (`AdminPanel.tsx`).

### Opción B: Configurar Resend para emails reales

1. Crea cuenta en [Resend](https://resend.com) (gratis 3,000 emails/mes)
2. Verifica tu dominio agregando registros DNS
3. Obtén tu API Key
4. Actualiza las variables de entorno:
   - `RESEND_API_KEY`: Tu API key
   - `EMAIL_DOMAIN`: Tu dominio verificado
   - `TEST_MODE`: Eliminar esta variable o ponerla en `false`

---

## ✅ Checklist Final

- [ ] Edge Functions desplegadas (`supabase functions deploy`)
- [ ] Variables de entorno configuradas en Supabase
- [ ] SQL de aprobación ejecutado
- [ ] Extensión `pg_net` instalada
- [ ] Tabla `app_config` actualizada con valores reales
- [ ] Trigger verificado (existe en `pg_trigger`)
- [ ] Prueba manual exitosa (logs muestran notificación)

---

## 🆘 ¿Necesitas ayuda?

Si algo no funciona, ejecuta el archivo `supabase/diagnostico_email.sql` en el SQL Editor de Supabase.
Te mostrará exactamente qué está configurado y qué falta.

---

**¡Éxito!** 🎉 Ahora tienes un sistema completo de aprobación de organizaciones con notificaciones.
