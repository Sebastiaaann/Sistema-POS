import React, { useState, useEffect, useRef } from 'react';
import { Search, Filter, Plus, MoreVertical, Download, AlertCircle, CheckCircle2, XCircle, X, Save, Image as ImageIcon, Edit2, Trash2 } from 'lucide-react';
import { Product } from '../types';
import { createClient } from '../lib/supabase';
import type { Database } from '../lib/database.types';

interface InventoryListProps {
  products: Product[];
  onAddProduct: (product: Product) => void;
}

const InventoryList: React.FC<InventoryListProps> = ({ products: initialProducts, onAddProduct }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('Todos');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);

  const supabase = createClient();

  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    category: '',
    stock: '',
    minStock: '',
    price: '',
    image: ''
  });

  // Cargar productos desde Supabase al montar el componente
  useEffect(() => {
    loadProducts();
  }, []);

  // Cerrar menú al hacer click fuera
  useEffect(() => {
    const handleClickOutside = () => setOpenMenuId(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const loadProducts = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setError('No hay sesión activa. Por favor, inicia sesión.');
        setLoading(false);
        return;
      }

      const { data: orgs, error: orgsError } = await supabase
        .from('organizaciones')
        .select('id')
        .limit(1);

      if (orgsError) {
        console.error('Error obteniendo organizaciones:', orgsError);
        setError(`Error cargando organizaciones: ${orgsError.message}`);
        setProducts([]);
        setLoading(false);
        return;
      }

      if (!orgs || orgs.length === 0) {
        setError('No tienes una organización asignada.');
        setProducts([]);
        setLoading(false);
        return;
      }

      const orgId = orgs[0].id;

      const { data: productosData, error: productosError } = await supabase
        .from('productos')
        .select(`
          id,
          nombre,
          sku,
          stock_actual,
          precio_venta,
          imagen_url,
          categoria:categorias(nombre)
        `)
        .eq('organizacion_id', orgId)
        .is('deleted_at', null)
        .eq('is_active', true)
        .order('nombre');

      if (productosError) {
        console.error('Error cargando productos:', productosError);
        setError(`Error cargando productos: ${productosError.message}`);
        setProducts([]);
        setLoading(false);
        return;
      }

      const mappedProducts: Product[] = (productosData || []).map((p: any) => ({
        id: p.id,
        name: p.nombre,
        sku: p.sku,
        category: p.categoria?.nombre || 'General',
        stock: p.stock_actual,
        minStock: 10,
        price: parseFloat(p.precio_venta),
        status: p.stock_actual > 0 ? 'active' : 'inactive',
        image: p.imagen_url || `https://picsum.photos/64/64?random=${p.id}`
      }));

      setProducts(mappedProducts);
    } catch (err: any) {
      console.error('Error cargando productos:', err);
      setError(err.message || 'Error al cargar productos');
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      sku: product.sku,
      category: product.category,
      stock: product.stock.toString(),
      minStock: product.minStock.toString(),
      price: product.price.toString(),
      image: product.image || ''
    });
    setIsModalOpen(true);
    setOpenMenuId(null);
  };

  const handleDelete = async (product: Product) => {
    if (!confirm(`¿Estás seguro que deseas eliminar "${product.name}"?`)) {
      setOpenMenuId(null);
      return;
    }

    try {
      const { error: deleteError } = await supabase
        .from('productos')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', product.id);

      if (deleteError) throw deleteError;

      await loadProducts();
      setOpenMenuId(null);
    } catch (err: any) {
      console.error('Error eliminando producto:', err);
      setError(err.message);
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

      const orgId = orgs[0].id;

      let categoriaId = null;
      if (formData.category) {
        const { data: catData, error: catError } = await supabase
          .from('categorias')
          .select('id')
          .eq('organizacion_id', orgId)
          .eq('nombre', formData.category)
          .single();

        if (catError && catError.code !== 'PGRST116') {
          throw catError;
        }

        if (catData) {
          categoriaId = catData.id;
        } else {
          const { data: newCat, error: newCatError } = await supabase
            .from('categorias')
            .insert({
              organizacion_id: orgId,
              nombre: formData.category
            })
            .select('id')
            .single();

          if (newCatError) throw newCatError;
          categoriaId = newCat.id;
        }
      }

      if (editingProduct) {
        // Actualizar producto existente
        const { error: updateError } = await supabase
          .from('productos')
          .update({
            nombre: formData.name,
            sku: formData.sku,
            categoria_id: categoriaId,
            precio_venta: parseFloat(formData.price),
            imagen_url: formData.image || null
          })
          .eq('id', editingProduct.id);

        if (updateError) {
          if (updateError.code === '23505') {
            throw new Error('El SKU ya existe en esta organización');
          }
          throw updateError;
        }
      } else {
        // Crear producto nuevo
        const { error: productoError } = await supabase
          .from('productos')
          .insert({
            organizacion_id: orgId,
            nombre: formData.name,
            sku: formData.sku,
            categoria_id: categoriaId,
            precio_venta: parseFloat(formData.price),
            precio_costo: 0,
            stock_actual: parseInt(formData.stock) || 0,
            imagen_url: formData.image || null
          });

        if (productoError) {
          if (productoError.code === '23505') {
            throw new Error('El SKU ya existe en esta organización');
          }
          throw productoError;
        }
      }

      await loadProducts();
      setIsModalOpen(false);
      setEditingProduct(null);
      setFormData({
        name: '',
        sku: '',
        category: '',
        stock: '',
        minStock: '',
        price: '',
        image: ''
      });

    } catch (err: any) {
      console.error('Error guardando producto:', err);
      setError(err.message || 'Error al guardar el producto');
    } finally {
      setSaving(false);
    }
  };

  const getStockStatus = (stock: number, minStock: number) => {
    if (stock === 0) return { label: 'Sin Stock', color: 'bg-red-50 text-red-700 ring-red-600/20', icon: XCircle };
    if (stock <= minStock) return { label: 'Stock Bajo', color: 'bg-amber-50 text-amber-700 ring-amber-600/20', icon: AlertCircle };
    return { label: 'Normal', color: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20', icon: CheckCircle2 };
  };

  const categories = ['Todos', ...Array.from(new Set(products.map(p => p.category)))];
  const uniqueCategories = Array.from(new Set(products.map(p => p.category)));

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.sku.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'Todos' || product.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  return (
    <>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col h-full">
        {/* Header & Controls */}
        <div className="p-5 border-b border-gray-200 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h2 className="text-lg font-bold text-gray-900">Inventario de Productos</h2>
            <div className="flex gap-2">
              <button className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors">
                <Download size={16} />
                Exportar
              </button>
              <button
                onClick={() => {
                  setEditingProduct(null);
                  setFormData({
                    name: '',
                    sku: '',
                    category: '',
                    stock: '',
                    minStock: '',
                    price: '',
                    image: ''
                  });
                  setIsModalOpen(true);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
              >
                <Plus size={18} />
                Agregar Producto
              </button>
            </div>
          </div>

          {/* Search and Filter */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por nombre o SKU..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
            <div className="relative w-full sm:w-48">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full  pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mx-5 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-red-800">Error</p>
              <p className="text-xs text-red-600 mt-0.5">{error}</p>
            </div>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">
              <X size={16} />
            </button>
          </div>
        )}

        {/* Table */}
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-sm text-gray-500 mt-4">Cargando productos...</p>
              </div>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                <Search className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-gray-500 mb-2">No se encontraron productos</p>
              <p className="text-sm text-gray-400">Intenta ajustar los filtros o agrega un nuevo producto</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Producto</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Categoría</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Stock</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Precio</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Valor Inventario</th>
                    <th scope="col" className="relative px-6 py-3">
                      <span className="sr-only">Acciones</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredProducts.map((product) => {
                    const status = getStockStatus(product.stock, product.minStock);
                    const StatusIcon = status.icon;

                    return (
                      <tr key={product.id} className="hover:bg-gray-50 transition-colors group">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="h-10 w-10 flex-shrink-0">
                              <img className="h-10 w-10 rounded-lg object-cover border border-gray-200" src={product.image} alt="" />
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">{product.name}</div>
                              <div className="text-xs text-gray-500">SKU: {product.sku}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                            {product.category}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex flex-col gap-1">
                            <div className={`inline-flex items-center w-fit px-2 py-1 rounded-md text-xs font-medium ring-1 ring-inset ${status.color}`}>
                              <StatusIcon className="w-3.5 h-3.5 mr-1.5" />
                              {status.label}
                            </div>
                            <div className="text-xs text-gray-500 font-medium">
                              {product.stock} un. <span className="text-gray-400 font-normal">/ min {product.minStock}</span>
                            </div>
                            <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden mt-0.5">
                              <div
                                className={`h-full rounded-full ${product.stock === 0 ? 'bg-red-500' :
                                  product.stock <= product.minStock ? 'bg-amber-500' : 'bg-emerald-500'
                                  }`}
                                style={{ width: `${Math.min(100, (product.stock / (product.minStock * 2)) * 100)}%` }}
                              ></div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">${product.price.toFixed(2)}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">${(product.price * product.stock).toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="relative inline-block text-left">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenMenuId(openMenuId === product.id ? null : product.id);
                              }}
                              className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100"
                            >
                              <MoreVertical size={18} />
                            </button>

                            {openMenuId === product.id && (
                              <div className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10">
                                <div className="py-1">
                                  <button
                                    onClick={() => handleOpenEdit(product)}
                                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                                  >
                                    <Edit2 size={16} />
                                    Editar
                                  </button>
                                  <button
                                    onClick={() => handleDelete(product)}
                                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                                  >
                                    <Trash2 size={16} />
                                    Eliminar
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal para Agregar/Editar Producto */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white px-6 py-4 border-b border-gray-100 flex justify-between items-center z-10">
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  {editingProduct ? 'Editar Producto' : 'Nuevo Producto'}
                </h3>
                <p className="text-xs text-gray-500">
                  {editingProduct ? 'Modifica los datos del producto' : 'Completa la información del producto'}
                </p>
              </div>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingProduct(null);
                  setFormData({
                    name: '',
                    sku: '',
                    category: '',
                    stock: '',
                    minStock: '',
                    price: '',
                    image: ''
                  });
                }}
                className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-full"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nombre del Producto *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    placeholder="Ej: Laptop Dell XPS 15"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    SKU *
                  </label>
                  <input
                    type="text"
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    placeholder="Ej: DELL-XPS-15"
                    required
                    disabled={!!editingProduct}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Categoría
                  </label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    list="categories"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    placeholder="Ej: Electrónica"
                  />
                  <datalist id="categories">
                    {uniqueCategories.map(cat => (
                      <option key={cat} value={cat} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Precio de Venta *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      placeholder="0.00"
                      required
                    />
                  </div>
                </div>

                {!editingProduct && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Stock Inicial
                      </label>
                      <input
                        type="number"
                        value={formData.stock}
                        onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                        placeholder="0"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Stock Mínimo
                      </label>
                      <input
                        type="number"
                        value={formData.minStock}
                        onChange={(e) => setFormData({ ...formData, minStock: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                        placeholder="10"
                      />
                    </div>
                  </>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  URL de Imagen
                </label>
                <input
                  type="url"
                  value={formData.image}
                  onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  placeholder="https://ejemplo.com/imagen.jpg"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditingProduct(null);
                    setFormData({
                      name: '',
                      sku: '',
                      category: '',
                      stock: '',
                      minStock: '',
                      price: '',
                      image: ''
                    });
                  }}
                  className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Save size={18} />
                      {editingProduct ? 'Actualizar' : 'Guardar'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default InventoryList;