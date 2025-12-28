import React, { useState, useEffect } from 'react';
import { Plus, TrendingUp, TrendingDown, Package, Calendar, Filter, X } from 'lucide-react';
import { createClient } from '../lib/supabase';
import { useOrganizacion } from '../hooks/useOrganizacion';
import type { Database } from '../lib/database.types';

type TipoMovimiento = Database['public']['Enums']['TipoMovimiento'];

interface Producto {
    id: string;
    nombre: string;
    sku: string;
    stock_actual: number;
}

interface Movimiento {
    id: string;
    tipo: TipoMovimiento;
    cantidad: number;
    fecha: string;
    producto: {
        nombre: string;
        sku: string;
    };
    motivo: string | null;
}

const MovimientosList: React.FC = () => {
    const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
    const [productos, setProductos] = useState<Producto[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [tipoFilter, setTipoFilter] = useState<string>('TODOS');

    const supabase = createClient();
    const { configuracion } = useOrganizacion();

    // Form state
    const [formData, setFormData] = useState({
        producto_id: '',
        tipo: 'ENTRADA' as TipoMovimiento,
        cantidad: '',
        observaciones: ''
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        await Promise.all([loadMovimientos(), loadProductos()]);
    };

    const loadProductos = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: orgs } = await supabase
                .from('organizaciones')
                .select('id')
                .limit(1);

            if (!orgs || orgs.length === 0) return;

            const { data, error: prodError } = await supabase
                .from('productos')
                .select('id, nombre, sku, stock_actual')
                .eq('organizacion_id', orgs[0].id)
                .eq('is_active', true)
                .is('deleted_at', null)
                .order('nombre');

            if (prodError) throw prodError;
            setProductos(data || []);
        } catch (err: any) {
            console.error('Error cargando productos:', err);
        }
    };

    const loadMovimientos = async () => {
        try {
            setLoading(true);
            setError(null);

            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: orgs } = await supabase
                .from('organizaciones')
                .select('id')
                .limit(1);

            if (!orgs || orgs.length === 0) {
                setError('No tienes una organización asignada');
                return;
            }

            const { data, error: movError } = await supabase
                .from('movimientos_stock')
                .select(`
          id,
          tipo,
          cantidad,
          fecha,
          motivo,
          producto:productos(nombre, sku)
        `)
                .eq('organizacion_id', orgs[0].id)
                .order('fecha', { ascending: false })
                .limit(50);

            if (movError) throw movError;

            setMovimientos(data as any || []);
        } catch (err: any) {
            console.error('Error cargando movimientos:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            setSaving(true);
            setError(null);

            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('No hay sesión activa');

            const { data: orgs } = await supabase
                .from('organizaciones')
                .select('id')
                .limit(1);

            if (!orgs || orgs.length === 0) {
                throw new Error('No tienes una organización asignada');
            }

            const cantidad = parseInt(formData.cantidad);
            if (cantidad <= 0) {
                throw new Error('La cantidad debe ser mayor a 0');
            }

            // Crear movimiento
            const { error: movError } = await supabase
                .from('movimientos_stock')
                .insert({
                    organizacion_id: orgs[0].id,
                    producto_id: formData.producto_id,
                    tipo: formData.tipo,
                    cantidad: cantidad,
                    motivo: formData.observaciones || null,
                    creado_por_id: user.id,
                });

            if (movError) throw movError;

            // Recargar datos
            await loadData();

            // Cerrar modal y limpiar form
            setIsModalOpen(false);
            setFormData({
                producto_id: '',
                tipo: 'ENTRADA',
                cantidad: '',
                observaciones: ''
            });

        } catch (err: any) {
            console.error('Error guardando movimiento:', err);
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    const getTipoIcon = (tipo: TipoMovimiento) => {
        switch (tipo) {
            case 'ENTRADA':
                return <TrendingUp className="w-5 h-5 text-green-600" />;
            case 'SALIDA':
                return <TrendingDown className="w-5 h-5 text-red-600" />;
            default:
                return <Package className="w-5 h-5 text-blue-600" />;
        }
    };

    const getTipoBadge = (tipo: TipoMovimiento) => {
        const styles = {
            ENTRADA: 'bg-green-100 text-green-800',
            SALIDA: 'bg-red-100 text-red-800',
            AJUSTE_POSITIVO: 'bg-blue-100 text-blue-800',
            AJUSTE_NEGATIVO: 'bg-orange-100 text-orange-800',
            TRANSFERENCIA: 'bg-purple-100 text-purple-800',
        };
        return styles[tipo] || 'bg-gray-100 text-gray-800';
    };

    const filteredMovimientos = tipoFilter === 'TODOS'
        ? movimientos
        : movimientos.filter(m => m.tipo === tipoFilter);

    return (
        <>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                {/* Header */}
                <div className="p-6 border-b border-gray-200">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">Movimientos de Stock</h2>
                            <p className="text-sm text-gray-500 mt-1">Registra entradas, salidas y ajustes de inventario</p>
                        </div>
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                        >
                            <Plus size={20} />
                            Nuevo Movimiento
                        </button>
                    </div>

                    {/* Filters */}
                    <div className="mt-4 flex gap-2 flex-wrap">
                        {['TODOS', 'ENTRADA', 'SALIDA', 'AJUSTE_POSITIVO', 'AJUSTE_NEGATIVO'].map((tipo) => (
                            <button
                                key={tipo}
                                onClick={() => setTipoFilter(tipo)}
                                className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${tipoFilter === tipo
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                            >
                                {tipo === 'TODOS' ? 'Todos' : tipo.replace('_', ' ')}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                        <div className="flex-1">
                            <p className="text-sm font-medium text-red-800">Error</p>
                            <p className="text-xs text-red-600 mt-0.5">{error}</p>
                        </div>
                        <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">
                            <X size={16} />
                        </button>
                    </div>
                )}

                {/* Loading State */}
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="text-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                            <p className="text-sm text-gray-500 mt-4">Cargando movimientos...</p>
                        </div>
                    </div>
                ) : filteredMovimientos.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <Package className="w-16 h-16 text-gray-300 mb-4" />
                        <p className="text-gray-500">No hay movimientos registrados</p>
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="mt-4 text-blue-600 hover:text-blue-700 font-medium"
                        >
                            Crear tu primer movimiento
                        </button>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Fecha</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Producto</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Tipo</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Cantidad</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Observaciones</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {filteredMovimientos.map((mov) => (
                                    <tr key={mov.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {new Date(mov.fecha).toLocaleDateString('es-ES', {
                                                year: 'numeric',
                                                month: 'short',
                                                day: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm font-medium text-gray-900">{mov.producto.nombre}</div>
                                            <div className="text-xs text-gray-500">SKU: {mov.producto.sku}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-2">
                                                {getTipoIcon(mov.tipo)}
                                                <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${getTipoBadge(mov.tipo)}`}>
                                                    {mov.tipo.replace('_', ' ')}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`text-sm font-bold ${mov.tipo === 'ENTRADA' || mov.tipo === 'AJUSTE_POSITIVO'
                                                ? 'text-green-600'
                                                : 'text-red-600'
                                                }`}>
                                                {mov.tipo === 'ENTRADA' || mov.tipo === 'AJUSTE_POSITIVO' ? '+' : '-'}
                                                {mov.cantidad}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500">
                                            {mov.motivo || '-'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modal para nuevo movimiento */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
                    <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                            <div>
                                <h3 className="text-lg font-bold text-gray-900">Nuevo Movimiento</h3>
                                <p className="text-xs text-gray-500">Registra un movimiento de stock</p>
                            </div>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-full"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            {/* Tipo de Movimiento */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Tipo de Movimiento *
                                </label>
                                <select
                                    value={formData.tipo}
                                    onChange={(e) => setFormData({ ...formData, tipo: e.target.value as TipoMovimiento })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                    required
                                >
                                    <option value="ENTRADA">Entrada</option>
                                    <option value="SALIDA">Salida</option>
                                    <option value="AJUSTE_POSITIVO">Ajuste Positivo</option>
                                    <option value="AJUSTE_NEGATIVO">Ajuste Negativo</option>
                                </select>
                            </div>

                            {/* Producto */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Producto *
                                </label>
                                <select
                                    value={formData.producto_id}
                                    onChange={(e) => setFormData({ ...formData, producto_id: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                    required
                                >
                                    <option value="">Seleccionar producto...</option>
                                    {productos.map((prod) => (
                                        <option key={prod.id} value={prod.id}>
                                            {prod.nombre} (SKU: {prod.sku}) - Stock: {prod.stock_actual}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Cantidad */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Cantidad *
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    value={formData.cantidad}
                                    onChange={(e) => setFormData({ ...formData, cantidad: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                    placeholder="0"
                                    required
                                />
                            </div>

                            {/* Observaciones */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Observaciones
                                </label>
                                <textarea
                                    value={formData.observaciones}
                                    onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                    rows={3}
                                    placeholder="Opcional: notas, proveedor, motivo, etc."
                                />
                            </div>

                            {/* Buttons */}
                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="flex-1 px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                                >
                                    {saving ? 'Guardando...' : 'Guardar'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
};

export default MovimientosList;
