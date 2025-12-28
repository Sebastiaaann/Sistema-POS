# 📋 Plan de Integración - Sistema de Aprobación y Notificaciones

Este documento describe el plan completo para integrar el sistema de aprobación de organizaciones y notificaciones por email en tu aplicación.

## 🎯 Objetivos

1. ✅ **Logout corregido** - Ya implementado en `components/PendingApproval.tsx`
2. 🔄 **Sistema de notificaciones** - Edge Function + Trigger SQL
3. 🧪 **Testing** - Modo test sin necesidad de Resend
4. 🚀 **Producción** - Configuración opcional con Resend

---

## 📦 Fase 1: Preparación y Verificación

### 1.1 Verificar Cambios en el Código

**Archivos ya modificados:**
- ✅ `components/PendingApproval.tsx` - Logout corregido
- ✅ `supabase/functions/send-approval-notification/index.ts` - Edge Function creada
- ✅ `supabase/aprobacion_organizaciones.sql` - Trigger SQL actualizado

**Verificación:**
```bash
# Verificar que los archivos existen
ls components/PendingApproval.tsx
ls supabase/functions/send-approval-notification/index.ts
ls supabase/aprobacion_organizaciones.sql
```

### 1.2 Verificar Variables de Entorno

Asegúrate de tener un archivo `.env.local` o `.env` con:

```env
# Variables para el frontend (React + Vite)
VITE_SUPABASE_URL=https://tu-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key-aqui
```

**Dónde encontrar estos valores:**
- Supabase Dashboard → Settings → API
- `VITE_SUPABASE_URL`: Project URL
- `VITE_SUPABASE_ANON_KEY`: anon/public key

---

## 🗄️ Fase 2: Configuración de Base de Datos

### 2.1 Ejecutar SQL de Aprobación

**⚠️ IMPORTANTE:** Debes ejecutar TODO el SQL completo antes de intentar actualizar `app_config`. El SQL crea la tabla `app_config` automáticamente.

1. **Abre Supabase Dashboard**
   - Ve a tu proyecto en [supabase.com](https://supabase.com)
   - Navega a **SQL Editor**

2. **Ejecutar el script completo**
   - Abre el archivo `supabase/aprobacion_organizaciones.sql`
   - Copia **TODO el contenido** (desde la primera línea hasta la última)
   - Pégalo en el SQL Editor de Supabase
   - Haz clic en **Run** o presiona `Ctrl+Enter`

3. **Verificar ejecución exitosa**
   - Deberías ver al final: `Sistema de aprobación de organizaciones creado exitosamente!`
   - Verifica que la tabla `app_config` se creó:
     ```sql
     SELECT * FROM public.app_config;
     ```
   - Deberías ver dos filas con valores por defecto

4. **Si hay errores:**
   - **Error "relation organizaciones does not exist"**: Ejecuta primero `supabase/schema.sql`
   - **Error "relation app_config does not exist"**: Asegúrate de haber ejecutado TODO el SQL completo
   - **Otros errores**: Revisa que tienes permisos de administrador en la base de datos

### 2.2 Configurar Tabla app_config

**IMPORTANTE:** La tabla `app_config` se crea automáticamente cuando ejecutas el SQL de aprobación (paso 2.1). Si obtienes un error "relation does not exist", significa que aún no has ejecutado el SQL completo.

**Si ya ejecutaste el SQL completo**, actualiza los valores:

```sql
-- Reemplaza TU-PROJECT-REF con tu project reference
-- Lo encuentras en: Supabase Dashboard → Settings → API → Project URL
UPDATE public.app_config 
SET value = 'https://TU-PROJECT-REF.supabase.co' 
WHERE key = 'supabase_url';

-- Reemplaza TU-ANON-KEY con tu anon key
-- Lo encuentras en: Supabase Dashboard → Settings → API → anon/public key
UPDATE public.app_config 
SET value = 'TU-ANON-KEY-AQUI' 
WHERE key = 'supabase_anon_key';
```

**Si la tabla no existe**, ejecuta primero esto:

```sql
-- Crear tabla app_config si no existe
CREATE TABLE IF NOT EXISTS public.app_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insertar valores iniciales
INSERT INTO public.app_config (key, value)
VALUES 
  ('supabase_url', 'https://TU-PROJECT-REF.supabase.co'),
  ('supabase_anon_key', 'TU-ANON-KEY-AQUI')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
```

**Verificar configuración:**
```sql
SELECT * FROM public.app_config;
```

Deberías ver dos filas con `supabase_url` y `supabase_anon_key`.

### 2.3 Verificar Extensión pg_net

El script SQL debería haber creado la extensión automáticamente, pero verifica:

```sql
SELECT * FROM pg_extension WHERE extname = 'pg_net';
```

Si no existe, créala:
```sql
CREATE EXTENSION IF NOT EXISTS pg_net;
```

---

## ⚡ Fase 3: Desplegar Edge Function

### 3.1 Instalar CLI de Supabase

**⚠️ IMPORTANTE:** Supabase CLI no se puede instalar con `npm install -g` en Windows. Usa una de estas opciones:

#### Opción 1: Usar Scoop (Recomendado para Windows)

```powershell
# Si no tienes Scoop, instálalo primero:
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
irm get.scoop.sh | iex

# Instalar Supabase CLI
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase

# Verificar instalación
supabase --version
```

#### Opción 2: Usar Chocolatey

```powershell
# Si tienes Chocolatey instalado:
choco install supabase

# Verificar instalación
supabase --version
```

#### Opción 3: Instalar como dependencia local del proyecto

```bash
# Instalar en el proyecto (no global)
npm install supabase --save-dev

# Usar con npx
npx supabase --version

# O agregar script en package.json:
# "supabase": "supabase"
```

#### Opción 4: Descargar binario manualmente

1. Ve a [Releases de Supabase CLI](https://github.com/supabase/cli/releases)
2. Descarga `supabase_windows_amd64.zip`
3. Extrae el archivo `supabase.exe`
4. Agrega la carpeta al PATH de Windows o muévelo a una carpeta que ya esté en el PATH

**Recomendación:** Usa la Opción 1 (Scoop) o la Opción 3 (npx) para mayor facilidad.

### 3.2 Autenticarse en Supabase

**Si instalaste con Scoop/Chocolatey:**
```bash
# Iniciar sesión (abrirá el navegador)
supabase login
```

**Si usas npx:**
```bash
npx supabase login
```

### 3.3 Enlazar Proyecto

**Si instalaste con Scoop/Chocolatey:**
```bash
# Obtén tu project reference de:
# Supabase Dashboard → Settings → General → Reference ID
supabase link --project-ref tu-project-ref
```

**Si usas npx:**
```bash
npx supabase link --project-ref tu-project-ref
```

**Nota:** Si prefieres no usar la CLI, puedes saltarte los pasos 3.2 y 3.3 y desplegar directamente desde el Dashboard (ver paso 3.4).

**Nota:** Si no tienes el project reference, está en la URL de tu proyecto:
- `https://app.supabase.com/project/tu-project-ref`
- El `tu-project-ref` es la parte después de `/project/`

### 3.4 Desplegar Edge Function

**Si instalaste con Scoop o Chocolatey:**
```bash
# Desde la raíz del proyecto
cd c:\Users\elwax\Desktop\saas

# Desplegar la función
supabase functions deploy send-approval-notification
```

**Si instalaste como dependencia local (npx):**
```bash
# Desde la raíz del proyecto
cd c:\Users\elwax\Desktop\saas

# Desplegar la función usando npx
npx supabase functions deploy send-approval-notification
```

**Alternativa: Desplegar desde el Dashboard de Supabase**

Si prefieres no usar la CLI, puedes desplegar manualmente:

1. Ve a Supabase Dashboard → Edge Functions
2. Haz clic en **Create a new function**
3. Nombre: `send-approval-notification`
4. Copia el contenido de `supabase/functions/send-approval-notification/index.ts`
5. Pégalo en el editor
6. Haz clic en **Deploy**

**Verificar despliegue:**
- Ve a Supabase Dashboard → Edge Functions
- Deberías ver `send-approval-notification` en la lista

### 3.5 Configurar Variables de Entorno (Modo Test)

En Supabase Dashboard → Edge Functions → send-approval-notification → Settings:

**Agregar variables:**
- `ADMIN_EMAIL`: `tu-email@ejemplo.com` (solo para referencia en logs)
- `TEST_MODE`: `true` (opcional, se activa automáticamente sin Resend)

**Variables automáticas** (ya configuradas por Supabase):
- `SUPABASE_URL`: Se configura automáticamente
- `SUPABASE_SERVICE_ROLE_KEY`: Se configura automáticamente

---

## 🧪 Fase 4: Pruebas y Verificación

### 4.1 Probar el Logout

1. **Iniciar la aplicación:**
   ```bash
   npm run dev
   ```

2. **Crear un usuario de prueba:**
   - Ve a `http://localhost:5173` (o el puerto que use Vite)
   - Regístrate con un nuevo usuario
   - Esto creará una organización con estado `PENDIENTE`

3. **Verificar pantalla de aprobación:**
   - Deberías ver la pantalla "Solicitud en Revisión"
   - Haz clic en "Cerrar Sesión"
   - Deberías volver al login (no a la pantalla de aprobación)

### 4.2 Probar Notificaciones (Modo Test)

1. **Crear una organización pendiente:**
   - Registra un nuevo usuario
   - O crea manualmente una organización:
     ```sql
     INSERT INTO public.organizaciones (nombre, slug, estado)
     VALUES ('Test Org', 'test-org-123', 'PENDIENTE');
     ```

2. **Verificar logs:**
   - Ve a Supabase Dashboard → Edge Functions → send-approval-notification
   - Haz clic en la pestaña **Logs**
   - Busca entradas con `📧 NOTIFICACIÓN DE APROBACIÓN (MODO TEST)`
   - Deberías ver toda la información del email en los logs

3. **Verificar trigger:**
   ```sql
   -- Verificar que el trigger existe
   SELECT tgname, tgrelid::regclass 
   FROM pg_trigger 
   WHERE tgname = 'trigger_notificar_organizacion_pendiente';
   ```

### 4.3 Probar Flujo Completo

1. **Usuario se registra** → Organización creada con estado `PENDIENTE`
2. **Trigger se ejecuta** → Llama a Edge Function
3. **Edge Function registra en logs** → Ver en Supabase Dashboard
4. **Usuario ve pantalla de aprobación** → `PendingApproval.tsx`
5. **Usuario hace logout** → Vuelve al login correctamente

---

## 🚀 Fase 5: Migración a Producción (Opcional)

### 5.1 Configurar Resend

Solo si quieres enviar emails reales:

1. **Crear cuenta en Resend:**
   - Ve a [resend.com](https://resend.com)
   - Crea una cuenta gratuita
   - Verifica tu dominio (ver `EMAIL_SETUP.md` para detalles)

2. **Obtener API Key:**
   - Resend Dashboard → Settings → API Keys
   - Crea una nueva API key

### 5.2 Actualizar Variables de Edge Function

En Supabase Dashboard → Edge Functions → send-approval-notification → Settings:

**Agregar/Actualizar:**
- `RESEND_API_KEY`: `re_xxxxxxxxxxxxx` (tu API key de Resend)
- `EMAIL_DOMAIN`: `tudominio.com` (dominio verificado en Resend)
- `ADMIN_EMAIL`: `admin@tudominio.com` (email donde recibir notificaciones)
- `TEST_MODE`: Eliminar o poner `false`

### 5.3 Probar Email Real

1. Crear una organización de prueba
2. Verificar que recibes el email en `ADMIN_EMAIL`
3. Revisar logs de la Edge Function para confirmar envío exitoso

---

## 🔍 Fase 6: Solución de Problemas

### Problema: Error "relation app_config does not exist"

**Causa:** Intentaste ejecutar el UPDATE antes de ejecutar el SQL completo que crea la tabla.

**Solución:**
1. Ejecuta primero TODO el contenido de `supabase/aprobacion_organizaciones.sql`
2. O ejecuta este SQL para crear la tabla manualmente:
   ```sql
   CREATE TABLE IF NOT EXISTS public.app_config (
     key TEXT PRIMARY KEY,
     value TEXT NOT NULL,
     updated_at TIMESTAMPTZ DEFAULT NOW()
   );
   
   INSERT INTO public.app_config (key, value)
   VALUES 
     ('supabase_url', 'https://TU-PROJECT-REF.supabase.co'),
     ('supabase_anon_key', 'TU-ANON-KEY-AQUI')
   ON CONFLICT (key) DO NOTHING;
   ```
3. Luego ejecuta los UPDATEs normalmente

### Problema: El trigger no se ejecuta

**Solución:**
```sql
-- Verificar que el trigger existe
SELECT * FROM pg_trigger WHERE tgname = 'trigger_notificar_organizacion_pendiente';

-- Si no existe, recrear la función y el trigger
-- Ejecutar nuevamente: supabase/aprobacion_organizaciones.sql
```

### Problema: Error al instalar Supabase CLI

**Error:** `Installing Supabase CLI as a global module is not supported`

**Solución:**
- **Opción 1 (Recomendada):** Usa Scoop:
  ```powershell
  Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
  irm get.scoop.sh | iex
  scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
  scoop install supabase
  ```

- **Opción 2:** Instala como dependencia local:
  ```bash
  npm install supabase --save-dev
  # Luego usa: npx supabase [comando]
  ```

- **Opción 3:** Despliega manualmente desde el Dashboard de Supabase (ver paso 3.4)

### Problema: Edge Function no se despliega

**Solución:**
```bash
# Si usas npx:
npx supabase projects list

# Re-enlazar si es necesario
npx supabase link --project-ref tu-project-ref

# Verificar estructura de carpetas
ls supabase/functions/send-approval-notification/
```

**Alternativa:** Despliega manualmente desde Supabase Dashboard → Edge Functions → Create new function

### Problema: No veo logs en modo test

**Solución:**
1. Verifica que `TEST_MODE` esté en `true` o que no haya `RESEND_API_KEY`
2. Verifica que el trigger se ejecutó (crea una organización nueva)
3. Espera unos segundos y refresca los logs
4. Verifica que la Edge Function está desplegada correctamente

### Problema: Logout no funciona

**Solución:**
1. Verifica que `components/PendingApproval.tsx` tiene el código actualizado
2. Revisa la consola del navegador para errores
3. Verifica que `lib/supabase.ts` está configurado correctamente

---

## ✅ Checklist Final

### Configuración Básica (Modo Test)
- [ ] Variables de entorno del frontend configuradas (`.env.local`)
- [ ] SQL de aprobación ejecutado en Supabase
- [ ] Tabla `app_config` actualizada con valores de Supabase
- [ ] Extensión `pg_net` habilitada
- [ ] Edge Function desplegada
- [ ] Variable `ADMIN_EMAIL` configurada en Edge Function
- [ ] Logout probado y funcionando
- [ ] Notificaciones aparecen en logs (modo test)

### Producción (Opcional)
- [ ] Cuenta de Resend creada
- [ ] Dominio verificado en Resend
- [ ] Variables de Resend configuradas en Edge Function
- [ ] Email de prueba recibido exitosamente

---

## 📚 Recursos Adicionales

- **Documentación de notificaciones**: Ver [EMAIL_SETUP.md](EMAIL_SETUP.md)
- **Supabase Edge Functions**: [Documentación oficial](https://supabase.com/docs/guides/functions)
- **Supabase SQL Editor**: Dashboard → SQL Editor
- **Logs de Edge Functions**: Dashboard → Edge Functions → [función] → Logs

---

## 🎉 Siguiente Paso

Una vez completado el checklist básico, tu sistema está listo para:
1. ✅ Recibir registros de nuevos usuarios
2. ✅ Mostrar pantalla de aprobación pendiente
3. ✅ Registrar notificaciones en logs (modo test)
4. ✅ Permitir logout correcto

Cuando estés listo para producción, sigue la Fase 5 para configurar Resend y enviar emails reales.

