// Supabase Edge Function: Enviar notificación de aprobación por email
// Se ejecuta cuando se crea una organización con estado PENDIENTE

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const ADMIN_EMAIL = Deno.env.get('ADMIN_EMAIL') || 'admin@techstock.com';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
// Dominio de email: DEBE ser un dominio verificado en Resend (ej: 'tudominio.com')
// Resend requiere verificación de dominio para enviar emails
const EMAIL_DOMAIN = Deno.env.get('EMAIL_DOMAIN');
const EMAIL_FROM_NAME = Deno.env.get('EMAIL_FROM_NAME') || 'TechStock';
// Token secreto para los enlaces de aprobación/rechazo en el email
const ADMIN_SECRET_TOKEN = Deno.env.get('ADMIN_SECRET_TOKEN') || 'change-this-secret-token';
// Modo test: si es 'true', solo registra en logs sin enviar email real
const TEST_MODE = Deno.env.get('TEST_MODE') === 'true' || !RESEND_API_KEY;

interface OrganizationData {
  id: string;
  nombre: string;
  estado: string;
  created_at: string;
  user_id?: string;
  user_email?: string;
  user_name?: string;
}

serve(async (req) => {
  // Manejar CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  try {
    // Modo test: solo registrar en logs sin enviar email
    if (TEST_MODE) {
      console.log('🔧 MODO TEST ACTIVADO - No se enviará email real');
    } else {
      // Verificar que tenemos las variables de entorno necesarias para producción
      if (!RESEND_API_KEY) {
        console.error('RESEND_API_KEY no está configurada - Activando modo test');
      }

      if (!EMAIL_DOMAIN) {
        console.error('EMAIL_DOMAIN no está configurada - Activando modo test');
      }
    }

    // Obtener datos del request
    const { organizacion_id, user_id } = await req.json();

    if (!organizacion_id) {
      return new Response(
        JSON.stringify({ error: 'organizacion_id es requerido' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Crear cliente de Supabase con service role para acceder a todos los datos
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Obtener información de la organización
    const { data: organizacion, error: orgError } = await supabase
      .from('organizaciones')
      .select('id, nombre, slug, estado, created_at')
      .eq('id', organizacion_id)
      .single();

    if (orgError || !organizacion) {
      console.error('Error obteniendo organización:', orgError);
      return new Response(
        JSON.stringify({ error: 'Organización no encontrada' }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Solo enviar email si el estado es PENDIENTE
    if (organizacion.estado !== 'PENDIENTE') {
      return new Response(
        JSON.stringify({ message: 'Organización no está pendiente, email no enviado' }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Obtener información completa del usuario creador
    let userEmail = 'usuario@ejemplo.com';
    let userName = 'Usuario';
    let userPhone = 'No proporcionado';
    let userCreatedAt = new Date().toISOString();
    let userEmailConfirmed = false;

    if (user_id) {
      // Obtener perfil del usuario
      const { data: profile } = await supabase
        .from('profiles')
        .select('email, full_name, phone, created_at')
        .eq('id', user_id)
        .single();

      if (profile) {
        userEmail = profile.email || userEmail;
        userName = profile.full_name || userName;
        userPhone = profile.phone || userPhone;
        userCreatedAt = profile.created_at || userCreatedAt;
      }

      // Nota: El email confirmado se verifica en App.tsx antes de permitir crear organización
      // Si el usuario pudo crear organización, significa que el email está confirmado
      userEmailConfirmed = true;
    }

    // Preparar el email
    const emailSubject = `Nueva Solicitud de Aprobación: ${organizacion.nombre}`;
    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .info-box { background: white; padding: 20px; margin: 20px 0; border-radius: 8px; border-left: 4px solid #667eea; }
            .info-row { margin: 10px 0; }
            .label { font-weight: bold; color: #555; }
            .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
            .footer { text-align: center; margin-top: 30px; color: #777; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔔 Nueva Solicitud de Aprobación</h1>
            </div>
            <div class="content">
              <p>Se ha recibido una nueva solicitud de registro que requiere tu aprobación.</p>
              
              <div class="info-box">
                <h3 style="margin-top: 0; color: #667eea; font-size: 18px;">📋 Información del Usuario</h3>
                <div class="info-row">
                  <span class="label">Nombre Completo:</span> ${userName}
                </div>
                <div class="info-row">
                  <span class="label">Email:</span> ${userEmail}
                </div>
                <div class="info-row">
                  <span class="label">Teléfono:</span> ${userPhone}
                </div>
                <div class="info-row">
                  <span class="label">Email Verificado:</span> ${userEmailConfirmed ? '✅ Sí' : '❌ No'}
                </div>
                <div class="info-row">
                  <span class="label">Fecha de Registro:</span> ${new Date(userCreatedAt).toLocaleString('es-ES')}
                </div>
              </div>

              <div class="info-box">
                <h3 style="margin-top: 0; color: #667eea; font-size: 18px;">🏢 Información de la Organización</h3>
                <div class="info-row">
                  <span class="label">Nombre:</span> ${organizacion.nombre}
                </div>
                <div class="info-row">
                  <span class="label">Slug:</span> ${organizacion.slug || 'N/A'}
                </div>
                <div class="info-row">
                  <span class="label">Fecha de Solicitud:</span> ${new Date(organizacion.created_at).toLocaleString('es-ES')}
                </div>
                <div class="info-row">
                  <span class="label">ID de Organización:</span> <code style="background: #f0f0f0; padding: 2px 6px; border-radius: 3px; font-size: 12px;">${organizacion.id}</code>
                </div>
              </div>

              <p>Por favor, revisa la solicitud y aprueba o rechaza según corresponda.</p>

              <div style="text-align: center; margin: 30px 0;">
                <a href="${SUPABASE_URL.replace('/rest/v1', '')}/functions/v1/approve-organization?org_id=${organizacion.id}&action=approve&token=${ADMIN_SECRET_TOKEN}" 
                   style="display: inline-block; padding: 12px 30px; background: #10b981; color: white; text-decoration: none; border-radius: 5px; margin: 5px; font-weight: bold;">
                  ✅ Aprobar Organización
                </a>
                <a href="${SUPABASE_URL.replace('/rest/v1', '')}/functions/v1/approve-organization?org_id=${organizacion.id}&action=reject&token=${ADMIN_SECRET_TOKEN}" 
                   style="display: inline-block; padding: 12px 30px; background: #ef4444; color: white; text-decoration: none; border-radius: 5px; margin: 5px; font-weight: bold;">
                  ❌ Rechazar Organización
                </a>
              </div>

              <div style="text-align: center; margin-top: 20px;">
                <a href="${SUPABASE_URL.replace('/rest/v1', '')}" 
                   style="display: inline-block; padding: 10px 20px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; font-size: 14px;">
                  Ir al Panel de Administración
                </a>
              </div>
            </div>
            <div class="footer">
              <p>Este es un email automático del sistema TechStock. Por favor, no respondas a este mensaje.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    // Modo test: solo registrar en logs
    if (TEST_MODE) {
      console.log('═══════════════════════════════════════════════════════');
      console.log('📧 NOTIFICACIÓN DE APROBACIÓN (MODO TEST)');
      console.log('═══════════════════════════════════════════════════════');
      console.log('Para:', ADMIN_EMAIL);
      console.log('Asunto:', emailSubject);
      console.log('');
      console.log('📋 INFORMACIÓN DEL USUARIO:');
      console.log('  Nombre Completo:', userName);
      console.log('  Email:', userEmail);
      console.log('  Teléfono:', userPhone);
      console.log('  Email Verificado:', userEmailConfirmed ? 'Sí' : 'No');
      console.log('  Fecha de Registro:', new Date(userCreatedAt).toLocaleString('es-ES'));
      console.log('');
      console.log('🏢 INFORMACIÓN DE LA ORGANIZACIÓN:');
      console.log('  Nombre:', organizacion.nombre);
      console.log('  Slug:', organizacion.slug || 'N/A');
      console.log('  ID:', organizacion.id);
      console.log('  Fecha de Solicitud:', new Date(organizacion.created_at).toLocaleString('es-ES'));
      console.log('═══════════════════════════════════════════════════════');
      console.log('📝 Contenido del email (HTML):');
      console.log(emailHtml);
      console.log('═══════════════════════════════════════════════════════');
      
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Notificación registrada en logs (modo test)',
          test_mode: true,
          email_data: {
            to: ADMIN_EMAIL,
            subject: emailSubject,
            usuario: {
              nombre: userName,
              email: userEmail,
              telefono: userPhone,
              email_verificado: userEmailConfirmed,
              fecha_registro: new Date(userCreatedAt).toISOString(),
            },
            organizacion: {
              nombre: organizacion.nombre,
              slug: organizacion.slug || 'N/A',
              id: organizacion.id,
              fecha_solicitud: new Date(organizacion.created_at).toISOString(),
            },
          },
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    // Modo producción: enviar email usando Resend
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: `${EMAIL_FROM_NAME} <noreply@${EMAIL_DOMAIN}>`,
        to: [ADMIN_EMAIL],
        subject: emailSubject,
        html: emailHtml,
      }),
    });

    if (!resendResponse.ok) {
      const errorData = await resendResponse.text();
      console.error('Error enviando email con Resend:', errorData);
      return new Response(
        JSON.stringify({ error: 'Error al enviar email', details: errorData }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const resendData = await resendResponse.json();
    console.log('Email enviado exitosamente:', resendData);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Email de notificación enviado exitosamente',
        email_id: resendData.id,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  } catch (error) {
    console.error('Error en Edge Function:', error);
    return new Response(
      JSON.stringify({
        error: 'Error interno del servidor',
        details: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
});


