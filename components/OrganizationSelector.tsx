import React, { useState } from 'react';
import { Building2, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { createClient } from '../lib/supabase';

interface OrganizationSelectorProps {
  onOrganizationCreated: () => void;
}

const OrganizationSelector: React.FC<OrganizationSelectorProps> = ({ onOrganizationCreated }) => {
  const [nombre, setNombre] = useState('');
  const [slug, setSlug] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const supabase = createClient();

  // Generar slug automáticamente desde el nombre
  const generateSlug = (text: string) => {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Eliminar acentos
      .replace(/[^a-z0-9]+/g, '-') // Reemplazar caracteres especiales con guiones
      .replace(/(^-|-$)/g, '') // Eliminar guiones al inicio y final
      .substring(0, 50); // Limitar longitud
  };

  const handleNombreChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setNombre(value);
    // Generar slug automáticamente si está vacío
    if (!slug || slug === generateSlug(nombre)) {
      setSlug(generateSlug(value));
    }
  };

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Validar formato de slug
    const slugValue = value
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-+/g, '-')
      .replace(/(^-|-$)/g, '');
    setSlug(slugValue);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      // Validaciones
      if (!nombre.trim()) {
        throw new Error('El nombre de la organización es requerido');
      }

      if (!slug.trim()) {
        throw new Error('El slug es requerido');
      }

      if (slug.length < 3) {
        throw new Error('El slug debe tener al menos 3 caracteres');
      }

      // Obtener usuario actual
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('No estás autenticado');
      }

      // Verificar que el email esté verificado
      if (!user.email_confirmed_at) {
        throw new Error('Por favor, verifica tu email antes de crear una organización');
      }

      // Verificar si el slug ya existe
      const { data: existingOrg } = await supabase
        .from('organizaciones')
        .select('id')
        .eq('slug', slug)
        .single();

      if (existingOrg) {
        throw new Error('Este slug ya está en uso. Por favor, elige otro.');
      }

      // Crear organización con estado PENDIENTE
      const { data: newOrg, error: orgError } = await supabase
        .from('organizaciones')
        .insert({
          nombre: nombre.trim(),
          slug: slug.trim(),
          estado: 'PENDIENTE',
          // Agregar descripción si existe (necesitarías agregar esta columna a la tabla)
        })
        .select('id, estado')
        .single();

      if (orgError) {
        console.error('Error creando organización:', orgError);
        throw new Error(orgError.message || 'Error al crear la organización');
      }

      // Crear miembro como ADMIN
      const { error: miembroError } = await supabase
        .from('miembros')
        .insert({
          user_id: user.id,
          organizacion_id: newOrg.id,
          rol: 'ADMIN'
        });

      if (miembroError) {
        console.error('Error asignando miembro:', miembroError);
        // Si falla crear el miembro, eliminar la organización
        await supabase.from('organizaciones').delete().eq('id', newOrg.id);
        throw new Error('Error al asignar permisos. Por favor, intenta nuevamente.');
      }

      setSuccess(true);
      
      // Esperar un momento para que el usuario vea el mensaje de éxito
      setTimeout(() => {
        onOrganizationCreated();
      }, 1500);

    } catch (err: any) {
      console.error('Error:', err);
      setError(err.message || 'Error al crear la organización');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center">
            <Building2 className="w-10 h-10 text-blue-600" />
          </div>
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-gray-900 text-center mb-3">
          Crear tu Organización
        </h1>

        {/* Description */}
        <p className="text-gray-600 text-center mb-6">
          Crea tu organización para comenzar a gestionar tu inventario. 
          Tu solicitud será revisada por nuestro equipo.
        </p>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2">
                <XCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                <p className="text-sm text-red-800">{error}</p>
              </div>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                <p className="text-sm text-green-800">
                  Organización creada exitosamente. Serás redirigido...
                </p>
              </div>
            </div>
          )}

          {/* Nombre */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nombre de la Organización *
            </label>
            <input
              type="text"
              value={nombre}
              onChange={handleNombreChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
              placeholder="Mi Empresa S.A."
              required
              disabled={loading || success}
            />
          </div>

          {/* Slug */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Slug (URL única) *
            </label>
            <input
              type="text"
              value={slug}
              onChange={handleSlugChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors font-mono text-sm"
              placeholder="mi-empresa"
              required
              disabled={loading || success}
              pattern="[a-z0-9\-]+"
              minLength={3}
            />
            <p className="text-xs text-gray-500 mt-1">
              Solo letras minúsculas, números y guiones. Se genera automáticamente desde el nombre.
            </p>
          </div>

          {/* Descripción (Opcional) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Descripción (Opcional)
            </label>
            <textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors resize-none"
              placeholder="Breve descripción de tu negocio..."
              rows={3}
              disabled={loading || success}
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || success}
            className="w-full px-4 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Creando organización...
              </>
            ) : success ? (
              <>
                <CheckCircle className="w-5 h-5" />
                Organización creada
              </>
            ) : (
              'Crear Organización'
            )}
          </button>
        </form>

        {/* Info */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-xs text-gray-500 text-center">
            Al crear tu organización, recibirás un email cuando sea aprobada por nuestro equipo.
          </p>
        </div>
      </div>
    </div>
  );
};

export default OrganizationSelector;

