import React, { useState } from 'react';
import {
    Building2, Check, X, Clock, AlertCircle, RefreshCw,
    Search, Filter, Eye, FileText, Calendar, User, Mail, Phone
} from 'lucide-react';
import { useAdmin, type SolicitudPendiente } from '../hooks/useAdmin';

type FilterEstado = 'TODAS' | 'PENDIENTE' | 'APROBADA' | 'RECHAZADA';

const AdminPanel: React.FC = () => {
    const { solicitudes, loading, error, aprobar, rechazar, refetch } = useAdmin();
    const [filtroEstado, setFiltroEstado] = useState<FilterEstado>('TODAS');
    const [busqueda, setBusqueda] = useState('');
    const [procesando, setProcesando] = useState<string | null>(null);
    const [modalDetalle, setModalDetalle] = useState<SolicitudPendiente | null>(null);
    const [modalAccion, setModalAccion] = useState<{ tipo: 'aprobar' | 'rechazar', solicitud: SolicitudPendiente } | null>(null);
    const [notas, setNotas] = useState('');
    const [motivo, setMotivo] = useState('');

    // Filtrar solicitudes
    const solicitudesFiltradas = solicitudes.filter(sol => {
        // Filtro por estado
        if (filtroEstado !== 'TODAS' && sol.organizacion_estado !== filtroEstado) {
            return false;
        }

        // Filtro por búsqueda
        if (busqueda) {
            const searchLower = busqueda.toLowerCase();
            return (
                sol.organizacion_nombre.toLowerCase().includes(searchLower) ||
                sol.organizacion_slug.toLowerCase().includes(searchLower) ||
                sol.user_email?.toLowerCase().includes(searchLower) ||
                sol.user_full_name?.toLowerCase().includes(searchLower)
            );
        }

        return true;
    });

    // Estadísticas
    const stats = {
        pendientes: solicitudes.filter(s => s.organizacion_estado === 'PENDIENTE').length,
        aprobadas: solicitudes.filter(s => s.organizacion_estado === 'APROBADA').length,
        rechazadas: solicitudes.filter(s => s.organizacion_estado === 'RECHAZADA').length,
        total: solicitudes.length
    };

    const handleAprobar = async () => {
        if (!modalAccion) return;

        try {
            setProcesando(modalAccion.solicitud.organizacion_id);
            await aprobar(modalAccion.solicitud.organizacion_id, notas);
            setModalAccion(null);
            setNotas('');
        } catch (err: any) {
            alert('❌ Error: ' + err.message);
        } finally {
            setProcesando(null);
        }
    };

    const handleRechazar = async () => {
        if (!modalAccion || !motivo.trim()) {
            alert('⚠️ Debes proporcionar un motivo para el rechazo');
            return;
        }

        try {
            setProcesando(modalAccion.solicitud.organizacion_id);
            await rechazar(modalAccion.solicitud.organizacion_id, motivo);
            setModalAccion(null);
            setMotivo('');
        } catch (err: any) {
            alert('❌ Error: ' + err.message);
        } finally {
            setProcesando(null);
        }
    };

    const getEstadoBadge = (estado: string) => {
        const badges = {
            PENDIENTE: (
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium">
                    <Clock className="w-4 h-4" />
                    Pendiente
                </span>
            ),
            APROBADA: (
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                    <Check className="w-4 h-4" />
                    Aprobada
                </span>
            ),
            RECHAZADA: (
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium">
                    <X className="w-4 h-4" />
                    Rechazada
                </span>
            ),
        };

        return badges[estado as keyof typeof badges] || null;
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-4" />
                    <p className="text-gray-600">Cargando panel de administración...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 p-4 md:p-8">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center gap-3 mb-2">
                        <Building2 className="w-8 h-8 text-blue-600" />
                        <h1 className="text-3xl font-bold text-gray-900">Panel de Administración</h1>
                    </div>
                    <p className="text-gray-600">Gestiona las solicitudes de organizaciones</p>
                </div>

                {/* Estadísticas */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">Total</p>
                                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                            </div>
                            <Building2 className="w-8 h-8 text-gray-400" />
                        </div>
                    </div>
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">Pendientes</p>
                                <p className="text-2xl font-bold text-yellow-600">{stats.pendientes}</p>
                            </div>
                            <Clock className="w-8 h-8 text-yellow-400" />
                        </div>
                    </div>
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">Aprobadas</p>
                                <p className="text-2xl font-bold text-green-600">{stats.aprobadas}</p>
                            </div>
                            <Check className="w-8 h-8 text-green-400" />
                        </div>
                    </div>
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">Rechazadas</p>
                                <p className="text-2xl font-bold text-red-600">{stats.rechazadas}</p>
                            </div>
                            <X className="w-8 h-8 text-red-400" />
                        </div>
                    </div>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="font-semibold text-red-900">Error</p>
                            <p className="text-sm text-red-700">{error}</p>
                        </div>
                    </div>
                )}

                {/* Filtros y Búsqueda */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
                    <div className="flex flex-col md:flex-row gap-4">
                        {/* Búsqueda */}
                        <div className="flex-1">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Buscar por nombre, email o slug..."
                                    value={busqueda}
                                    onChange={(e) => setBusqueda(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>
                        </div>

                        {/* Filtros de estado */}
                        <div className="flex gap-2">
                            {(['TODAS', 'PENDIENTE', 'APROBADA', 'RECHAZADA'] as FilterEstado[]).map((estado) => (
                                <button
                                    key={estado}
                                    onClick={() => setFiltroEstado(estado)}
                                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${filtroEstado === estado
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        }`}
                                >
                                    {estado === 'TODAS' ? 'Todas' : estado.charAt(0) + estado.slice(1).toLowerCase()}
                                </button>
                            ))}
                        </div>

                        {/* Botón Actualizar */}
                        <button
                            onClick={refetch}
                            disabled={loading}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                        >
                            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                            Actualizar
                        </button>
                    </div>
                </div>

                {/* Tabla de Solicitudes */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    {solicitudesFiltradas.length === 0 ? (
                        <div className="p-12 text-center">
                            <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                            <p className="text-gray-600">
                                {busqueda || filtroEstado !== 'TODAS'
                                    ? 'No se encontraron solicitudes con los filtros aplicados'
                                    : 'No hay solicitudes para revisar'}
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Organización
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Solicitante
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Tipo de Negocio
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Fecha
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Estado
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Acciones
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {solicitudesFiltradas.map((sol) => (
                                        <tr key={sol.organizacion_id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div>
                                                    <p className="font-semibold text-gray-900">{sol.organizacion_nombre}</p>
                                                    <p className="text-sm text-gray-500 font-mono">{sol.organizacion_slug}</p>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div>
                                                    <p className="text-gray-900">{sol.user_full_name || 'Usuario desconocido'}</p>
                                                    <p className="text-sm text-gray-500">{sol.user_email}</p>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-sm text-gray-600">
                                                    {sol.organizacion_tipo_negocio || 'No especificado'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-600">
                                                {new Date(sol.organizacion_created_at).toLocaleString('es-ES', {
                                                    day: '2-digit',
                                                    month: '2-digit',
                                                    year: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}
                                            </td>
                                            <td className="px-6 py-4">
                                                {getEstadoBadge(sol.organizacion_estado)}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => setModalDetalle(sol)}
                                                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors text-sm font-medium"
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                        Ver
                                                    </button>
                                                    {sol.organizacion_estado === 'PENDIENTE' && (
                                                        <>
                                                            <button
                                                                onClick={() => setModalAccion({ tipo: 'aprobar', solicitud: sol })}
                                                                disabled={procesando === sol.organizacion_id}
                                                                className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 text-sm font-medium"
                                                            >
                                                                <Check className="w-4 h-4" />
                                                                Aprobar
                                                            </button>
                                                            <button
                                                                onClick={() => setModalAccion({ tipo: 'rechazar', solicitud: sol })}
                                                                disabled={procesando === sol.organizacion_id}
                                                                className="inline-flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 text-sm font-medium"
                                                            >
                                                                <X className="w-4 h-4" />
                                                                Rechazar
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Modal de Detalle */}
                {modalDetalle && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                        <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                            <div className="p-6 border-b border-gray-200">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-2xl font-bold text-gray-900">Detalles de la Solicitud</h2>
                                    <button
                                        onClick={() => setModalDetalle(null)}
                                        className="text-gray-400 hover:text-gray-600"
                                    >
                                        <X className="w-6 h-6" />
                                    </button>
                                </div>
                            </div>

                            <div className="p-6 space-y-6">
                                {/* Información de la Organización */}
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                        <Building2 className="w-5 h-5" />
                                        Información de la Organización
                                    </h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-sm text-gray-500">Nombre</p>
                                            <p className="font-medium text-gray-900">{modalDetalle.organizacion_nombre}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-500">Slug</p>
                                            <p className="font-mono text-sm text-gray-900">{modalDetalle.organizacion_slug}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-500">Tipo de Negocio</p>
                                            <p className="font-medium text-gray-900">{modalDetalle.organizacion_tipo_negocio || 'No especificado'}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-500">Estado</p>
                                            <div className="mt-1">{getEstadoBadge(modalDetalle.organizacion_estado)}</div>
                                        </div>
                                    </div>
                                    {modalDetalle.organizacion_descripcion && (
                                        <div className="mt-4">
                                            <p className="text-sm text-gray-500">Descripción</p>
                                            <p className="text-gray-900">{modalDetalle.organizacion_descripcion}</p>
                                        </div>
                                    )}
                                </div>

                                {/* Información de Contacto */}
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                        <User className="w-5 h-5" />
                                        Información del Solicitante
                                    </h3>
                                    <div className="grid grid-cols-1 gap-3">
                                        <div className="flex items-center gap-2">
                                            <User className="w-4 h-4 text-gray-400" />
                                            <span className="text-gray-900">{modalDetalle.user_full_name || 'No especificado'}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Mail className="w-4 h-4 text-gray-400" />
                                            <span className="text-gray-900">{modalDetalle.user_email || modalDetalle.organizacion_email_contacto || 'No especificado'}</span>
                                        </div>
                                        {modalDetalle.organizacion_telefono && (
                                            <div className="flex items-center gap-2">
                                                <Phone className="w-4 h-4 text-gray-400" />
                                                <span className="text-gray-900">{modalDetalle.organizacion_telefono}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Fechas */}
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                        <Calendar className="w-5 h-5" />
                                        Fechas
                                    </h3>
                                    <div className="grid grid-cols-1 gap-2">
                                        <div>
                                            <p className="text-sm text-gray-500">Fecha de Solicitud</p>
                                            <p className="text-gray-900">
                                                {new Date(modalDetalle.organizacion_created_at).toLocaleString('es-ES')}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
                                <button
                                    onClick={() => setModalDetalle(null)}
                                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                                >
                                    Cerrar
                                </button>
                                {modalDetalle.organizacion_estado === 'PENDIENTE' && (
                                    <>
                                        <button
                                            onClick={() => {
                                                setModalAccion({ tipo: 'aprobar', solicitud: modalDetalle });
                                                setModalDetalle(null);
                                            }}
                                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                                        >
                                            Aprobar
                                        </button>
                                        <button
                                            onClick={() => {
                                                setModalAccion({ tipo: 'rechazar', solicitud: modalDetalle });
                                                setModalDetalle(null);
                                            }}
                                            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                                        >
                                            Rechazar
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Modal de Acción (Aprobar/Rechazar) */}
                {modalAccion && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                        <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
                            <div className="p-6 border-b border-gray-200">
                                <h2 className="text-xl font-bold text-gray-900">
                                    {modalAccion.tipo === 'aprobar' ? '✅ Aprobar Organización' : '❌ Rechazar Organización'}
                                </h2>
                            </div>

                            <div className="p-6">
                                <p className="text-gray-600 mb-4">
                                    {modalAccion.tipo === 'aprobar'
                                        ? `¿Estás seguro de que deseas aprobar la organización "${modalAccion.solicitud.organizacion_nombre}"?`
                                        : `¿Estás seguro de que deseas rechazar la organización "${modalAccion.solicitud.organizacion_nombre}"?`
                                    }
                                </p>

                                {modalAccion.tipo === 'aprobar' ? (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Notas (opcional)
                                        </label>
                                        <textarea
                                            value={notas}
                                            onChange={(e) => setNotas(e.target.value)}
                                            placeholder="Agrega notas sobre esta aprobación..."
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                            rows={3}
                                        />
                                    </div>
                                ) : (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Motivo del rechazo <span className="text-red-500">*</span>
                                        </label>
                                        <textarea
                                            value={motivo}
                                            onChange={(e) => setMotivo(e.target.value)}
                                            placeholder="Explica el motivo del rechazo..."
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                                            rows={3}
                                            required
                                        />
                                    </div>
                                )}
                            </div>

                            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
                                <button
                                    onClick={() => {
                                        setModalAccion(null);
                                        setNotas('');
                                        setMotivo('');
                                    }}
                                    disabled={procesando !== null}
                                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={modalAccion.tipo === 'aprobar' ? handleAprobar : handleRechazar}
                                    disabled={procesando !== null || (modalAccion.tipo === 'rechazar' && !motivo.trim())}
                                    className={`px-4 py-2 text-white rounded-lg transition-colors disabled:opacity-50 ${modalAccion.tipo === 'aprobar'
                                        ? 'bg-green-600 hover:bg-green-700'
                                        : 'bg-red-600 hover:bg-red-700'
                                        }`}
                                >
                                    {procesando !== null ? 'Procesando...' : modalAccion.tipo === 'aprobar' ? 'Aprobar' : 'Rechazar'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminPanel;
