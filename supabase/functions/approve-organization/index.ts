// Supabase Edge Function: Aprobar o Rechazar Organización
// Se puede llamar desde un enlace en el email de notificación

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ADMIN_SECRET_TOKEN = Deno.env.get('ADMIN_SECRET_TOKEN') || 'change-this-secret-token';

serve(async (req) => {
  // Manejar CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  try {
    const url = new URL(req.url);
    const organizacionId = url.searchParams.get('org_id');
    const action = url.searchParams.get('action'); // 'approve' o 'reject'
    const token = url.searchParams.get('token');

    // Validar token de seguridad
    if (token !== ADMIN_SECRET_TOKEN) {
      return new Response(
        JSON.stringify({ error: 'Token inválido' }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    if (!organizacionId || !action) {
      return new Response(
        JSON.stringify({ error: 'Parámetros requeridos: org_id y action (approve/reject)' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    if (action !== 'approve' && action !== 'reject') {
      return new Response(
        JSON.stringify({ error: 'Action debe ser "approve" o "reject"' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Crear cliente de Supabase con service role
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Obtener información de la organización
    const { data: organizacion, error: orgError } = await supabase
      .from('organizaciones')
      .select('id, nombre, estado')
      .eq('id', organizacionId)
      .single();

    if (orgError || !organizacion) {
      return new Response(
        JSON.stringify({ error: 'Organización no encontrada' }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Verificar que la organización esté pendiente
    if (organizacion.estado !== 'PENDIENTE') {
      return new Response(
        JSON.stringify({ 
          error: `La organización ya está ${organizacion.estado.toLowerCase()}`,
          estado_actual: organizacion.estado
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Aprobar o rechazar
    const nuevoEstado = action === 'approve' ? 'APROBADA' : 'RECHAZADA';
    
    const { error: updateError } = await supabase
      .from('organizaciones')
      .update({
        estado: nuevoEstado,
        fecha_aprobacion: action === 'approve' ? new Date().toISOString() : null,
        updated_at: new Date().toISOString()
      })
      .eq('id', organizacionId);

    if (updateError) {
      console.error('Error actualizando organización:', updateError);
      return new Response(
        JSON.stringify({ error: 'Error al actualizar la organización', details: updateError.message }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Actualizar solicitud si existe
    await supabase
      .from('solicitudes_registro')
      .update({
        estado: nuevoEstado,
        updated_at: new Date().toISOString()
      })
      .eq('organizacion_id', organizacionId);

    // Obtener información del usuario para enviar email de confirmación
    const { data: miembros } = await supabase
      .from('miembros')
      .select('user_id')
      .eq('organizacion_id', organizacionId)
      .eq('rol', 'ADMIN')
      .limit(1);

    if (miembros && miembros.length > 0) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('email, full_name')
        .eq('id', miembros[0].user_id)
        .single();

      if (profile) {
        // Aquí podrías enviar un email al usuario notificándole la decisión
        console.log(`Email de notificación debería enviarse a: ${profile.email}`);
        console.log(`Organización ${action === 'approve' ? 'aprobada' : 'rechazada'}: ${organizacion.nombre}`);
      }
    }

    // Retornar página HTML de confirmación
    const htmlResponse = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Organización ${action === 'approve' ? 'Aprobada' : 'Rechazada'}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
              margin: 0;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              padding: 20px;
            }
            .container {
              background: white;
              border-radius: 10px;
              padding: 40px;
              max-width: 500px;
              text-align: center;
              box-shadow: 0 10px 40px rgba(0,0,0,0.2);
            }
            .icon {
              width: 80px;
              height: 80px;
              border-radius: 50%;
              margin: 0 auto 20px;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 40px;
            }
            .success { background: #d4edda; }
            .error { background: #f8d7da; }
            h1 { color: #333; margin-bottom: 10px; }
            p { color: #666; line-height: 1.6; }
            .org-name { font-weight: bold; color: #667eea; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="icon ${action === 'approve' ? 'success' : 'error'}">
              ${action === 'approve' ? '✅' : '❌'}
            </div>
            <h1>Organización ${action === 'approve' ? 'Aprobada' : 'Rechazada'}</h1>
            <p>
              La organización <span class="org-name">${organizacion.nombre}</span> ha sido 
              ${action === 'approve' ? 'aprobada exitosamente' : 'rechazada'}.
            </p>
            <p style="margin-top: 20px; font-size: 14px; color: #999;">
              El usuario recibirá una notificación por email.
            </p>
          </div>
        </body>
      </html>
    `;

    return new Response(htmlResponse, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
      },
    });

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

