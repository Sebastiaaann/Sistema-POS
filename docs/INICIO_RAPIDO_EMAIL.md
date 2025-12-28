# 🚀 INICIO RÁPIDO: Notificaciones por Email

## Tu configuración actual

- ✅ **Edge Functions creadas**: `send-approval-notification` y `approve-organization`
- ✅ **Email de admin**: `sebastian.almo9@gmail.com`
- ⏳ **Falta**: Desplegar funciones y configurar variables

---

## 🎯 Opción 1: Modo Test (5 minutos - RECOMENDADO)

Con esta opción verás las notificaciones en los **logs de Supabase** sin necesitar Resend.

### Comandos a ejecutar:

```powershell
# 1. Desplegar Edge Functions
.\deploy-functions.ps1

# Te pedirá tu Project Reference ID (ej: tfuqlbrxjzxepdbkdmqg)
# Lo encuentras en: Settings → General en Supabase Dashboard
```

### Configurar en Supabase Dashboard:

1. **Edge Functions** → **send-approval-notification** → **Settings**
   - Agregar secret: `ADMIN_EMAIL` = `sebastian.almo9@gmail.com`
   - Agregar secret: `TEST_MODE` = `true`

2. **SQL Editor** → Ejecutar `supabase/aprobacion_organizaciones.sql`

3. **SQL Editor** → Ejecutar:
   ```sql
   -- Actualizar con TU URL de Supabase
   UPDATE public.app_config 
   SET value = 'https://[TU-PROJECT-REF].supabase.co' 
   WHERE key = 'supabase_url';
   
   -- Actualizar con TU anon key (Settings → API)
   UPDATE public.app_config 
   SET value = '[TU-ANON-KEY]' 
   WHERE key = 'supabase_anon_key';
   ```

### Ver las notificaciones:

**Edge Functions** → **send-approval-notification** → **Logs**

¡Listo! Cuando alguien cree una organización, verás toda la info en los logs.

---

## 🎯 Opción 2: Emails Reales con Resend (15 minutos)

Solo si tienes un dominio verificado.

### Pasos adicionales:

1. Crear cuenta en [Resend.com](https://resend.com)
2. Verificar tu dominio (agregar registros DNS)
3. Obtener API Key

### Variables adicionales en Supabase:

En **send-approval-notification** → **Settings**:
- `RESEND_API_KEY` = `re_...` (tu API key)
- `EMAIL_DOMAIN` = `tudominio.com` (dominio verificado)
- `ADMIN_SECRET_TOKEN` = `mi-token-secreto-123`
- Eliminar `TEST_MODE`

En **approve-organization** → **Settings**:
- `ADMIN_SECRET_TOKEN` = `mi-token-secreto-123` (el mismo)

---

## 🔧 Herramientas de Diagnóstico

### Ver estado del sistema:

```sql
-- Ejecutar en SQL Editor
\i supabase/diagnostico_email.sql
```

### Probar Edge Function manualmente:

**Edge Functions** → **send-approval-notification** → **Invoke**

```json
{
  "organizacion_id": "00000000-0000-0000-0000-000000000000",
  "user_id": "00000000-0000-0000-0000-000000000000"
}
```

---

## 📁 Archivos Importantes

- **GUIA_CONFIG_EMAIL.md**: Guía detallada paso a paso
- **deploy-functions.ps1**: Script de despliegue automático
- **supabase/diagnostico_email.sql**: Verificación del sistema
- **supabase/aprobacion_organizaciones.sql**: Setup de base de datos

---

## ⚡ Inicio Ultra-Rápido (Copiar y Pegar)

1. **PowerShell**:
   ```powershell
   .\deploy-functions.ps1
   ```

2. **Supabase Dashboard** → Edge Functions → send-approval-notification → Settings:
   - `ADMIN_EMAIL` = `sebastian.almo9@gmail.com`
   - `TEST_MODE` = `true`

3. **Supabase Dashboard** → SQL Editor → Nueva Query:
   - Pegar contenido de `supabase/aprobacion_organizaciones.sql`
   - Run

4. **Actualizar app_config** (en SQL Editor):
   ```sql
   -- Reemplazar con tus valores reales
   UPDATE public.app_config SET value = 'https://tfuqlbrxjzxepdbkdmqg.supabase.co' WHERE key = 'supabase_url';
   UPDATE public.app_config SET value = 'eyJhbGc...' WHERE key = 'supabase_anon_key';
   ```

5. **Ver logs**: Edge Functions → send-approval-notification → Logs

---

## ✅ Checklist

- [ ] Ejecuté `deploy-functions.ps1`
- [ ] Configuré variables en Edge Functions
- [ ] Ejecuté SQL de aprobación
- [ ] Actualicé `app_config` con valores reales
- [ ] Probé creando una organización
- [ ] Vi la notificación en los logs

---

**¿Necesitas más ayuda?** Consulta **GUIA_CONFIG_EMAIL.md** para instrucciones detalladas.
