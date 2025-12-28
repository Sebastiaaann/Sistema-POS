import React, { useState } from 'react';
import {
    ChevronLeft,
    ChevronRight,
    Package
} from 'lucide-react';

interface DemoProduct {
    id: string;
    name: string;
    sku: string;
    category: string;
    price: number;
    stock: number;
    image: string;
}

interface ProductDetailViewProps {
    product: DemoProduct;
    onBack: () => void;
    currentIndex: number;
    totalProducts: number;
    onNavigate: (direction: 'prev' | 'next') => void;
}

const ProductDetailView: React.FC<ProductDetailViewProps> = ({
    product,
    onBack,
    currentIndex,
    totalProducts,
    onNavigate
}) => {
    // Calcular precio de costo (65% del precio de venta como ejemplo)
    const costPrice = product.price * 0.65;
    const margin = product.price - costPrice;
    const marginPercentage = (margin / product.price) * 100;

    // Stock mínimo de ejemplo (en el futuro vendría de la BD)
    const minStock = 10;
    const isLowStock = product.stock <= minStock;
    const isOutOfStock = product.stock === 0;

    return (
        <div className="bg-white h-full flex flex-col">
            {/* Breadcrumb y navegación */}
            <div className="border-b border-gray-200 bg-gray-50 px-6 py-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm">
                        <button
                            onClick={onBack}
                            className="text-teal-600 hover:text-teal-700 font-medium"
                        >
                            ← Volver a Productos
                        </button>
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600">{currentIndex + 1} / {totalProducts}</span>
                        <button
                            onClick={() => onNavigate('prev')}
                            disabled={currentIndex === 0}
                            className="p-1 hover:bg-gray-200 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <ChevronLeft size={18} />
                        </button>
                        <button
                            onClick={() => onNavigate('next')}
                            disabled={currentIndex === totalProducts - 1}
                            className="p-1 hover:bg-gray-200 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <ChevronRight size={18} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-y-auto px-6 py-6">
                <div className="max-w-4xl mx-auto">
                    {/* Header con imagen y datos principales */}
                    <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
                        <div className="flex gap-6">
                            {/* Imagen del Producto */}
                            <div className="w-48 h-48 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0 border border-gray-200">
                                <img
                                    src={product.image}
                                    alt={product.name}
                                    className="w-full h-full object-cover"
                                />
                            </div>

                            {/* Información Principal */}
                            <div className="flex-1 space-y-4">
                                <div>
                                    <h1 className="text-2xl font-bold text-gray-900 mb-2">{product.name}</h1>
                                    <div className="flex items-center gap-3">
                                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-50 text-blue-700">
                                            {product.category}
                                        </span>
                                        {isOutOfStock ? (
                                            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-50 text-red-700">
                                                Sin Stock
                                            </span>
                                        ) : isLowStock ? (
                                            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-amber-50 text-amber-700">
                                                Stock Bajo
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-emerald-50 text-emerald-700">
                                                Stock Normal
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Grid de información clave */}
                                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
                                    <InfoField label="SKU / Código" value={product.sku || 'N/A'} />
                                    <InfoField label="Código de Barras" value="7501234567890" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Sección de Precios y Márgenes */}
                    <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">Precios y Márgenes</h2>
                        <div className="grid grid-cols-4 gap-4">
                            <div className="bg-blue-50 rounded-lg p-4">
                                <p className="text-xs text-blue-600 font-medium mb-1">Precio de Venta</p>
                                <p className="text-2xl font-bold text-blue-900">${product.price.toFixed(2)}</p>
                            </div>
                            <div className="bg-gray-50 rounded-lg p-4">
                                <p className="text-xs text-gray-600 font-medium mb-1">Precio de Costo</p>
                                <p className="text-2xl font-bold text-gray-900">${costPrice.toFixed(2)}</p>
                                <p className="text-xs text-gray-500 mt-1">(Ejemplo: 65% del precio)</p>
                            </div>
                            <div className="bg-emerald-50 rounded-lg p-4">
                                <p className="text-xs text-emerald-600 font-medium mb-1">Margen</p>
                                <p className="text-2xl font-bold text-emerald-900">${margin.toFixed(2)}</p>
                            </div>
                            <div className="bg-emerald-50 rounded-lg p-4">
                                <p className="text-xs text-emerald-600 font-medium mb-1">% Margen</p>
                                <p className="text-2xl font-bold text-emerald-900">{marginPercentage.toFixed(1)}%</p>
                            </div>
                        </div>
                    </div>

                    {/* Sección de Stock */}
                    <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">Control de Stock</h2>
                        <div className="grid grid-cols-3 gap-4">
                            <div className="bg-gray-50 rounded-lg p-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <Package className="w-5 h-5 text-gray-600" />
                                    <p className="text-sm font-medium text-gray-600">Stock Actual</p>
                                </div>
                                <p className={`text-3xl font-bold ${isOutOfStock ? 'text-red-600' : isLowStock ? 'text-amber-600' : 'text-emerald-600'}`}>
                                    {product.stock}
                                </p>
                                <p className="text-xs text-gray-500 mt-1">unidades disponibles</p>
                            </div>

                            <div className="bg-gray-50 rounded-lg p-4">
                                <p className="text-sm font-medium text-gray-600 mb-2">Stock Mínimo</p>
                                <p className="text-3xl font-bold text-gray-900">{minStock}</p>
                                <p className="text-xs text-gray-500 mt-1">nivel de alerta</p>
                            </div>

                            <div className="bg-gray-50 rounded-lg p-4">
                                <p className="text-sm font-medium text-gray-600 mb-2">Valor en Stock</p>
                                <p className="text-3xl font-bold text-gray-900">${(product.stock * product.price).toFixed(0)}</p>
                                <p className="text-xs text-gray-500 mt-1">precio de venta</p>
                            </div>
                        </div>

                        {/* Barra de progreso de stock */}
                        <div className="mt-4">
                            <div className="flex justify-between text-xs text-gray-600 mb-1">
                                <span>Nivel de stock</span>
                                <span>{product.stock} / {minStock * 3} unidades</span>
                            </div>
                            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                    className={`h-full rounded-full transition-all ${isOutOfStock ? 'bg-red-500' :
                                            isLowStock ? 'bg-amber-500' : 'bg-emerald-500'
                                        }`}
                                    style={{ width: `${Math.min(100, (product.stock / (minStock * 3)) * 100)}%` }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Sección de Proveedor y Última Compra */}
                    <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">Información de Compra</h2>
                        <div className="grid grid-cols-2 gap-6">
                            <FormField label="Proveedor Principal" value="Proveedor S.A." placeholder="Sin proveedor asignado" />
                            <FormField label="Última Fecha de Compra" value="15/12/2024" placeholder="Sin compras registradas" />
                        </div>
                    </div>

                    {/* Notas */}
                    <div className="bg-white border border-gray-200 rounded-lg p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-3">Notas del Producto</h2>
                        <textarea
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm resize-none"
                            rows={3}
                            placeholder="Agregar notas sobre ubicación en tienda, promociones, etc..."
                            readOnly
                        ></textarea>
                        <p className="text-xs text-gray-500 mt-2">💡 Funcionalidad de edición disponible próximamente</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Componente para campo de información
const InfoField: React.FC<{ label: string; value: string }> = ({ label, value }) => {
    return (
        <div>
            <p className="text-xs font-medium text-gray-500 mb-1">{label}</p>
            <p className="text-sm font-semibold text-gray-900">{value}</p>
        </div>
    );
};

// Componente para campos de formulario
const FormField: React.FC<{
    label: string;
    value: string;
    placeholder?: string;
}> = ({ label, value, placeholder }) => {
    return (
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
            <input
                type="text"
                value={value}
                readOnly
                placeholder={placeholder}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm bg-gray-50"
            />
        </div>
    );
};

export default ProductDetailView;
