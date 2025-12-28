# 📧 Configuración de Notificaciones por Email

Este documento explica cómo configurar el sistema de notificaciones por email para recibir alertas cuando se crean nuevas organizaciones pendientes de aprobación.

## 🧪 Modo Test (Sin Resend)

**Para empezar a testear sin configurar Resend**, puedes usar el **modo test** que solo registra las notificaciones en los logs de Supabase sin enviar emails reales.

### Configuración Rápida para Testing

1. **Desplegar la Edge Function** (ver sección 2.1 más abajo)
2. **Configurar solo estas variables** en la Edge Function:
   - `ADMIN_EMAIL`: Tu email para recibir notificaciones (solo para referencia en logs)
   - `TEST_MODE`: `true` (o simplemente no configurar `RESEND_API_KEY`)
3. **Ejecutar el SQL** de aprobación (sección 3.1)
4. **Verificar logs**: Ve a Supabase Dashboard → Edge Functions → send-approval-notification → Logs

En modo test, verás toda la información del email en los logs, incluyendo:
- Organización creada
- Solicitante
- Fecha
- Contenido completo del email (HTML)

**Ventajas del modo test:**
- ✅ No requiere configuración de Resend
- ✅ No requiere verificar dominios
- ✅ Funciona inmediatamente
- ✅ Perfecto para desarrollo y pruebas

## 📋 Requisitos Previos (Para Producción con Resend)

1. Una cuenta en [Resend](https://resend.com) (recomendado) o cualquier servicio de email compatible
2. Un proyecto de Supabase configurado
3. Acceso al dashboard de Supabase para configurar Edge Functions

## 🚀 Pasos de Configuración

### 1. Crear cuenta en Resend y verificar dominio

1. Ve a [https://resend.com](https://resend.com)
2. Crea una cuenta gratuita (incluye 3,000 emails/mes)
3. **Verifica tu dominio** (requerido):
   - Ve a **Domains** en el dashboard de Resend
   - Haz clic en **Add Domain**
   - Ingresa tu dominio (ej: `tudominio.com`)
   - Resend te proporcionará registros DNS que debes agregar a tu proveedor de dominio:
     - **SPF record**: Para autenticación del remitente
     - **DKIM records**: Para firma criptográfica
     - **DMARC record** (opcional pero recomendado): Para políticas de autenticación
   - Agrega estos registros en tu proveedor de DNS (ej: Cloudflare, GoDaddy, Namecheap)
   - Espera a que Resend verifique el dominio (puede tomar unos minutos)
4. Obtén tu API Key desde el dashboard (Settings → API Keys → Create API Key)

**Nota importante:**
- Resend **requiere** un dominio verificado para enviar emails
- Si no tienes un dominio propio, puedes:
  - Usar un subdominio de un dominio que ya poseas
  - Registrar un dominio económico (ej: Namecheap, Google Domains)
  - Usar un servicio como Cloudflare para gestionar DNS fácilmente

### 2. Configurar Edge Function en Supabase

#### 2.1 Desplegar la Edge Function

1. Instala la CLI de Supabase (si no la tienes):
   ```bash
   npm install -g supabase
   ```

2. Inicia sesión en Supabase:
   ```bash
   supabase login
   ```

3. Enlaza tu proyecto:
   ```bash
   supabase link --project-ref tu-project-ref
   ```

4. Despliega la Edge Function:
   ```bash
   supabase functions deploy send-approval-notification
   ```

#### 2.2 Configurar Variables de Entorno

En el dashboard de Supabase, ve a **Edge Functions** → **send-approval-notification** → **Settings** y agrega:

**Variables para Modo Test (sin Resend):**
- `ADMIN_EMAIL`: Tu email (solo para referencia en logs)
- `TEST_MODE`: `true` (opcional - se activa automáticamente si no hay `RESEND_API_KEY`)

**Variables para Producción (con Resend):**
- `RESEND_API_KEY`: Tu API key de Resend (formato: `re_xxxxxxxxxxxxx`) - **REQUERIDO para producción**
- `ADMIN_EMAIL`: El email donde quieres recibir las notificaciones (ej: `admin@tudominio.com`)
- `EMAIL_DOMAIN`: Tu dominio verificado en Resend (ej: `tudominio.com`) - **REQUERIDO para producción**

**Variables opcionales (tienen valores por defecto):**
- `EMAIL_FROM_NAME`: Nombre que aparece en el remitente. Por defecto: `TechStock`
- `TEST_MODE`: `true` para forzar modo test incluso con Resend configurado
- `SUPABASE_URL`: La URL de tu proyecto Supabase (se configura automáticamente)
- `SUPABASE_SERVICE_ROLE_KEY`: Tu service role key de Supabase (se configura automáticamente)

**Nota importante sobre EMAIL_DOMAIN:**
- **DEBE ser un dominio verificado en Resend** - No puedes usar dominios no verificados
- Solo incluye el dominio, sin `http://` ni `www` (ej: `tudominio.com`, no `www.tudominio.com`)
- El email se enviará desde `noreply@${EMAIL_DOMAIN}`

### 3. Configurar Trigger en Base de Datos

#### 3.1 Ejecutar SQL de Configuración

1. Ve al **SQL Editor** en el dashboard de Supabase
2. Ejecuta el archivo `supabase/aprobacion_organizaciones.sql` completo
3. Esto creará el trigger que llama automáticamente a la Edge Function

#### 3.2 Configurar Variables de Base de Datos

Para que el trigger funcione correctamente, necesitas actualizar la tabla de configuración con tus valores de Supabase:

```sql
-- Reemplaza TU-PROJECT-REF con tu project reference de Supabase
-- Puedes encontrarlo en: Supabase Dashboard → Settings → API → Project URL
UPDATE public.app_config 
SET value = 'https://TU-PROJECT-REF.supabase.co' 
WHERE key = 'supabase_url';

-- Reemplaza TU-ANON-KEY-AQUI con tu anon/public key
-- Puedes encontrarlo en: Supabase Dashboard → Settings → API → anon/public key
UPDATE public.app_config 
SET value = 'TU-ANON-KEY-AQUI' 
WHERE key = 'supabase_anon_key';
```

**Nota**: Estos valores son necesarios para que el trigger pueda llamar a la Edge Function. Sin ellos, las notificaciones por email no se enviarán.

### 4. Verificar Configuración

#### 4.1 Probar la Edge Function Manualmente

Puedes probar la Edge Function directamente desde el dashboard de Supabase:

1. Ve a **Edge Functions** → **send-approval-notification**
2. Haz clic en **Invoke**
3. Usa este payload de prueba:
   ```json
   {
     "organizacion_id": "uuid-de-una-organizacion-pendiente",
     "user_id": "uuid-del-usuario-creador"
   }
   ```

#### 4.2 Crear una Organización de Prueba

1. Registra un nuevo usuario en tu aplicación
2. Esto creará automáticamente una organización con estado `PENDIENTE`
3. El trigger debería llamar a la Edge Function
4. **En modo test**: Ve a Supabase Dashboard → Edge Functions → send-approval-notification → Logs para ver la notificación
5. **En producción**: Verifica que recibiste el email en `ADMIN_EMAIL`

### 4.3 Ver Logs en Modo Test

Cuando uses el modo test, puedes ver todas las notificaciones en los logs de Supabase:

1. Ve a **Supabase Dashboard**
2. Navega a **Edge Functions** → **send-approval-notification**
3. Haz clic en la pestaña **Logs**
4. Busca entradas que comiencen con `📧 NOTIFICACIÓN DE APROBACIÓN (MODO TEST)`
5. Verás toda la información del email, incluyendo:
   - Destinatario
   - Asunto
   - Información de la organización
   - Contenido completo del email (HTML)

**Tip**: Los logs se actualizan en tiempo real, así que puedes crear una organización y ver inmediatamente la notificación en los logs.

## 🔧 Solución de Problemas

### El email no se envía

1. **Verifica las variables de entorno**: Asegúrate de que `RESEND_API_KEY`, `ADMIN_EMAIL` y `EMAIL_DOMAIN` estén configuradas correctamente
2. **Verifica que el dominio esté verificado**: En el dashboard de Resend, ve a **Domains** y confirma que tu dominio muestra estado "Verified"
3. **Revisa los logs**: Ve a **Edge Functions** → **send-approval-notification** → **Logs** para ver errores
4. **Verifica el trigger**: Ejecuta este SQL para verificar que el trigger existe:
   ```sql
   SELECT * FROM pg_trigger WHERE tgname = 'trigger_notificar_organizacion_pendiente';
   ```

### Error: "RESEND_API_KEY no está configurada"

- Asegúrate de haber agregado la variable `RESEND_API_KEY` en la configuración de la Edge Function
- Verifica que el nombre de la variable sea exactamente `RESEND_API_KEY` (case-sensitive)

### Error: "EMAIL_DOMAIN no está configurada"

- Debes configurar `EMAIL_DOMAIN` con tu dominio verificado en Resend
- El dominio debe estar completamente verificado en el dashboard de Resend antes de poder enviar emails
- Verifica que el dominio esté en estado "Verified" en Resend → Domains

### Error: "Domain not verified" o "Unauthorized domain"

- Tu dominio no está verificado en Resend
- Ve a Resend → Domains y verifica que todos los registros DNS estén configurados correctamente
- Espera unos minutos después de agregar los registros DNS para que se propaguen

### Error: "pg_net extension not found"

- Ejecuta este SQL en el SQL Editor:
  ```sql
  CREATE EXTENSION IF NOT EXISTS pg_net;
  ```

### El trigger no se ejecuta

1. Verifica que el trigger esté creado:
   ```sql
   SELECT tgname, tgrelid::regclass 
   FROM pg_trigger 
   WHERE tgname = 'trigger_notificar_organizacion_pendiente';
   ```

2. Verifica que la organización tenga estado `PENDIENTE`:
   ```sql
   SELECT id, nombre, estado 
   FROM organizaciones 
   WHERE estado = 'PENDIENTE';
   ```

## 📝 Personalización del Email

Puedes personalizar el template del email editando el archivo:
- `supabase/functions/send-approval-notification/index.ts`

Busca la sección `emailHtml` y modifica el HTML según tus necesidades.

## 🔐 Seguridad

- **Nunca** expongas tu `RESEND_API_KEY` en el código del frontend
- **Nunca** expongas tu `SUPABASE_SERVICE_ROLE_KEY` en el código del frontend
- Las variables de entorno solo deben estar en la configuración de la Edge Function
- Usa el dominio verificado en Resend para emails de producción

## 📚 Recursos Adicionales

- [Documentación de Resend](https://resend.com/docs)
- [Documentación de Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Documentación de pg_net](https://github.com/supabase/pg_net)

## ✅ Checklist de Configuración

### Para Testing (Modo Test)
- [ ] Edge Function desplegada en Supabase
- [ ] Variable `ADMIN_EMAIL` configurada (opcional, solo para logs)
- [ ] SQL de aprobación ejecutado (incluye trigger)
- [ ] Extensión `pg_net` habilitada
- [ ] Tabla `app_config` actualizada con valores reales de Supabase
- [ ] Verificar logs en Supabase Dashboard después de crear una organización

### Para Producción (Con Resend)
- [ ] Cuenta de Resend creada
- [ ] Dominio verificado en Resend (con registros DNS configurados)
- [ ] API Key de Resend obtenida
- [ ] Edge Function desplegada en Supabase
- [ ] Variables de entorno configuradas en la Edge Function:
  - [ ] `RESEND_API_KEY`
  - [ ] `ADMIN_EMAIL`
  - [ ] `EMAIL_DOMAIN` (dominio verificado)
  - [ ] `TEST_MODE`: NO configurado o `false`
- [ ] SQL de aprobación ejecutado (incluye trigger)
- [ ] Extensión `pg_net` habilitada
- [ ] Tabla `app_config` actualizada con valores reales de Supabase
- [ ] Prueba de email exitosa

## 🎯 Próximos Pasos

Una vez configurado, cada vez que se cree una organización con estado `PENDIENTE`, recibirás automáticamente un email con:
- Nombre de la organización
- Información del solicitante
- Fecha de solicitud
- ID de la organización para referencia

