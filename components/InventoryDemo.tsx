import React, { useState } from 'react';
import { Search, Filter, Grid3x3, List, SlidersHorizontal } from 'lucide-react';
import ProductDetailView from './ProductDetailView';

interface DemoProduct {
  id: string;
  name: string;
  sku: string;
  category: string;
  price: number;
  stock: number;
  image: string;
}

// Productos de ejemplo hardcodeados basados en la imagen de referencia
const DEMO_PRODUCTS: DemoProduct[] = [
  { id: '1', name: 'Acoustic Bloc Screens', sku: 'FURN_6666', category: 'Muebles', price: 2950.00, stock: 16, image: 'https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=300&h=300&fit=crop' },
  { id: '2', name: 'Bacon Burger', sku: '', category: 'Alimentos', price: 7.50, stock: 0, image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=300&h=300&fit=crop' },
  { id: '3', name: 'Cable Management Box', sku: 'FURN_5555', category: 'Accesorios', price: 100.00, stock: 0, image: 'https://images.unsplash.com/photo-1625948525980-5d44b88f7e5f?w=300&h=300&fit=crop' },
  { id: '4', name: 'Chair Floor Protection', sku: '', category: 'Accesorios', price: 12.00, stock: 45, image: 'https://images.unsplash.com/photo-1503602642458-232111445657?w=300&h=300&fit=crop' },
  { id: '5', name: 'Chicken Curry Sandwich', sku: '', category: 'Alimentos', price: 3.00, stock: 120, image: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=300&h=300&fit=crop' },
  { id: '6', name: 'Club Sandwich', sku: '', category: 'Alimentos', price: 3.40, stock: 89, image: 'https://images.unsplash.com/photo-1528736235302-52922df5c122?w=300&h=300&fit=crop' },
  { id: '7', name: 'Corner Desk Left Sit', sku: 'FURN_1118', category: 'Muebles', price: 95.00, stock: 2, image: 'https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?w=300&h=300&fit=crop' },
  { id: '8', name: 'Corner Desk Right Sit', sku: 'E-COM06', category: 'Muebles', price: 147.00, stock: 0, image: 'https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?w=300&h=300&fit=crop' },
  { id: '9', name: 'Desk Organizer', sku: 'FURN_0001', category: 'Accesorios', price: 5.10, stock: 0, image: 'https://images.unsplash.com/photo-1600187982165-e93e89daa955?w=300&h=300&fit=crop' },
  { id: '10', name: 'Desk Pad', sku: 'FURN_0002', category: 'Accesorios', price: 1.98, stock: 0, image: 'https://images.unsplash.com/photo-1586075010923-2dd4570fb338?w=300&h=300&fit=crop' },
  { id: '11', name: 'Drawer', sku: 'FURN_8855', category: 'Muebles', price: 3645.00, stock: 174, image: 'https://images.unsplash.com/photo-1509203549978-c3b3e0fea20e?w=300&h=300&fit=crop' },
  { id: '12', name: 'Drawer Black', sku: 'FURN_8960', category: 'Muebles', price: 25.00, stock: 0, image: 'https://images.unsplash.com/photo-1599669454699-248893623440?w=300&h=300&fit=crop' },
  { id: '13', name: 'Bolt', sku: 'CONS_89957', category: 'Herramientas', price: 0.50, stock: 500, image: 'https://images.unsplash.com/photo-1530124566582-a618bc2615dc?w=300&h=300&fit=crop' },
  { id: '14', name: 'Chauffage', sku: '', category: 'Electrodomésticos', price: 1.00, stock: 234, image: 'https://images.unsplash.com/photo-1585338447937-7082f8fc763d?w=300&h=300&fit=crop' },
  { id: '15', name: 'Coca-Cola', sku: '', category: 'Bebidas', price: 2.20, stock: 456, image: 'https://images.unsplash.com/photo-1554866585-cd94860890b7?w=300&h=300&fit=crop' },
  { id: '16', name: 'Customizable Desk', sku: 'CONFIG', category: 'Muebles', price: 750.00, stock: 345, image: 'https://images.unsplash.com/photo-1595428774223-ef52624120d2?w=300&h=300&fit=crop' },
  { id: '17', name: 'Desk Combination', sku: 'FURN_7800', category: 'Muebles', price: 450.00, stock: 28, image: 'https://images.unsplash.com/photo-1593062096033-9a26b09da705?w=300&h=300&fit=crop' },
  { id: '18', name: 'Desk Stand with Screen', sku: 'FURN_7888', category: 'Muebles', price: 2100.00, stock: 0, image: 'https://images.unsplash.com/photo-1611269154421-4e27233ac5c7?w=300&h=300&fit=crop' },
  { id: '19', name: 'Drawer Black Premium', sku: 'FURN_2100', category: 'Muebles', price: 2250.00, stock: 45, image: 'https://images.unsplash.com/photo-1565375318868-e6a37d154a87?w=300&h=300&fit=crop' },
  { id: '20', name: 'Drawer Case Black', sku: 'FURN_5623', category: 'Muebles', price: 850.00, stock: 45, image: 'https://images.unsplash.com/photo-1595428773752-9e49d5142fec?w=300&h=300&fit=crop' },
  { id: '21', name: 'Cabinet with Doors', sku: 'E-COM11', category: 'Muebles', price: 14.00, stock: 32, image: 'https://images.unsplash.com/photo-1595428774471-f0e5d6c8d6b7?w=300&h=300&fit=crop' },
  { id: '22', name: 'Cheese Burger', sku: '', category: 'Alimentos', price: 7.00, stock: 156, image: 'https://images.unsplash.com/photo-1551782450-17144efb9c50?w=300&h=300&fit=crop' },
  { id: '23', name: 'Conference Chair', sku: 'CONFIG16', category: 'Muebles', price: 16.50, stock: 56, image: 'https://images.unsplash.com/photo-1581539250439-c96689b516dd?w=300&h=300&fit=crop' },
  { id: '24', name: 'Funghi Pizza', sku: '', category: 'Alimentos', price: 9.00, stock: 78, image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=300&h=300&fit=crop' },
];

type ViewMode = 'grid' | 'list';

const InventoryDemo: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('Todos');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [selectedProduct, setSelectedProduct] = useState<DemoProduct | null>(null);

  // Obtener categorías únicas
  const categories = ['Todos', ...Array.from(new Set(DEMO_PRODUCTS.map(p => p.category)))];

  // Filtrar productos
  const filteredProducts = DEMO_PRODUCTS.filter(product => {
    const matchesSearch =
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.sku.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'Todos' || product.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  // Funciones para navegación de producto
  const handleProductClick = (product: DemoProduct) => {
    setSelectedProduct(product);
  };

  const handleBackToList = () => {
    setSelectedProduct(null);
  };

  const handleNavigateProduct = (direction: 'prev' | 'next') => {
    if (!selectedProduct) return;

    const currentIndex = filteredProducts.findIndex(p => p.id === selectedProduct.id);
    if (currentIndex === -1) return;

    if (direction === 'prev' && currentIndex > 0) {
      setSelectedProduct(filteredProducts[currentIndex - 1]);
    } else if (direction === 'next' && currentIndex < filteredProducts.length - 1) {
      setSelectedProduct(filteredProducts[currentIndex + 1]);
    }
  };

  // Si hay un producto seleccionado, mostrar vista de detalle
  if (selectedProduct) {
    const currentIndex = filteredProducts.findIndex(p => p.id === selectedProduct.id);
    return (
      <ProductDetailView
        product={selectedProduct}
        onBack={handleBackToList}
        currentIndex={currentIndex}
        totalProducts={filteredProducts.length}
        onNavigate={handleNavigateProduct}
      />
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col h-full">
      {/* Header & Controls */}
      <div className="p-5 border-b border-gray-200 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Inventario de Productos</h2>
            <p className="text-sm text-gray-500 mt-0.5">Vista de demostración con productos de ejemplo</p>
          </div>

          {/* View Toggle */}
          <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded transition-colors ${viewMode === 'grid'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
                }`}
              title="Vista en cuadrícula"
            >
              <Grid3x3 size={18} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded transition-colors ${viewMode === 'list'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
                }`}
              title="Vista en lista"
            >
              <List size={18} />
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
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Results count */}
        <div className="flex items-center justify-between text-sm">
          <p className="text-gray-600">
            {filteredProducts.length} {filteredProducts.length === 1 ? 'producto' : 'productos'}
          </p>
          <button className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors">
            <SlidersHorizontal size={16} />
            <span>Filtros</span>
          </button>
        </div>
      </div>

      {/* Products Display */}
      <div className="flex-1 overflow-y-auto p-5">
        {filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <Search className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-500 mb-2">No se encontraron productos</p>
            <p className="text-sm text-gray-400">Intenta ajustar los filtros de búsqueda</p>
          </div>
        ) : viewMode === 'grid' ? (
          // Grid View
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredProducts.map(product => (
              <ProductCard
                key={product.id}
                product={product}
                onClick={() => handleProductClick(product)}
              />
            ))}
          </div>
        ) : (
          // List View
          <div className="space-y-3">
            {filteredProducts.map(product => (
              <ProductListItem
                key={product.id}
                product={product}
                onClick={() => handleProductClick(product)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// Componente para tarjeta de producto (vista grid)
const ProductCard: React.FC<{ product: DemoProduct; onClick: () => void }> = ({ product, onClick }) => {
  const isOutOfStock = product.stock === 0;

  return (
    <div
      onClick={onClick}
      className="bg-white border border-gray-200 rounded-lg hover:shadow-lg transition-all duration-200 overflow-hidden group cursor-pointer"
    >
      {/* Imagen */}
      <div className="relative h-40 bg-gray-100 overflow-hidden">
        <img
          src={product.image}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        {isOutOfStock && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <span className="bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full">
              Sin Stock
            </span>
          </div>
        )}
      </div>

      {/* Contenido */}
      <div className="p-4 space-y-2">
        <div>
          <h3 className="font-semibold text-gray-900 text-sm line-clamp-2 min-h-[2.5rem]">
            {product.name}
          </h3>
          {product.sku && (
            <p className="text-xs text-gray-500 mt-1">SKU: {product.sku}</p>
          )}
        </div>

        <div className="pt-2 border-t border-gray-100 space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500">Precio</p>
              <p className="text-lg font-bold text-gray-900">
                ${product.price.toFixed(2)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500">Stock</p>
              <p className={`text-sm font-semibold ${isOutOfStock ? 'text-red-600' : 'text-emerald-600'}`}>
                {product.stock} Un.
              </p>
            </div>
          </div>
          <div>
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
              {product.category}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

// Componente para item de lista (vista list)
const ProductListItem: React.FC<{ product: DemoProduct; onClick: () => void }> = ({ product, onClick }) => {
  const isOutOfStock = product.stock === 0;

  return (
    <div
      onClick={onClick}
      className="bg-white border border-gray-200 rounded-lg hover:shadow-md transition-all duration-200 p-4 flex items-center gap-4 cursor-pointer group"
    >
      {/* Imagen */}
      <div className="relative h-16 w-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
        <img
          src={product.image}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        {isOutOfStock && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded">
              Sin Stock
            </span>
          </div>
        )}
      </div>

      {/* Información */}
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-gray-900 text-sm truncate">
          {product.name}
        </h3>
        <div className="flex items-center gap-3 mt-1">
          {product.sku && (
            <p className="text-xs text-gray-600 font-mono">SKU: {product.sku}</p>
          )}
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
            {product.category}
          </span>
        </div>
      </div>

      {/* Precio y Stock */}
      <div className="flex items-center gap-8">
        <div className="text-right">
          <p className="text-xs text-gray-500 mb-1">Precio</p>
          <p className="text-lg font-bold text-gray-900">
            ${product.price.toFixed(2)}
          </p>
        </div>
        <div className="text-right min-w-[80px]">
          <p className="text-xs text-gray-500 mb-1">Stock</p>
          <p className={`text-sm font-semibold ${isOutOfStock ? 'text-red-600' : 'text-emerald-600'}`}>
            {product.stock} Un.
          </p>
        </div>
      </div>
    </div>
  );
};

export default InventoryDemo;
