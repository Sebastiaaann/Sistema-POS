export const BUSINESS_TEMPLATES = {
    PANADERIA: {
        id: 'PANADERIA',
        nombre: '🍞 Panadería',
        descripcion: 'Para negocios de panadería y pastelería con producción propia',
        icon: '🍞',
        configuracion: {
            tipo_negocio: 'PANADERIA',
            usa_vencimientos: true,
            usa_produccion: true,
            usa_lotes: true,
            usa_mermas: true,
            usa_terceros: false,
            usa_almacenes: false,
            unidades_medida: ['UNIDADES', 'KG', 'DOCENAS'],
            mostrar_valor_inventario: true,
            requiere_aprobacion_movimientos: false
        },
        categorias_sugeridas: [
            'Pan',
            'Pasteles',
            'Galletas',
            'Bollería',
            'Insumos',
            'Materias Primas'
        ]
    },

    FERRETERIA: {
        id: 'FERRETERIA',
        nombre: '🔧 Ferretería',
        descripcion: 'Para ferreterías y tiendas de construcción',
        icon: '🔧',
        configuracion: {
            tipo_negocio: 'FERRETERIA',
            usa_vencimientos: false,
            usa_produccion: false,
            usa_lotes: false,
            usa_mermas: true,
            usa_terceros: true,
            usa_almacenes: true,
            unidades_medida: ['UNIDADES', 'CAJAS', 'METROS', 'LITROS'],
            mostrar_valor_inventario: true,
            requiere_aprobacion_movimientos: false
        },
        categorias_sugeridas: [
            'Herramientas',
            'Tornillería',
            'Pintura',
            'Electricidad',
            'Plomería',
            'Construcción'
        ]
    },

    TIENDA_VINILOS: {
        id: 'TIENDA_VINILOS',
        nombre: '🎵 Tienda de Vinilos',
        descripcion: 'Para tiendas de discos y vinilos',
        icon: '🎵',
        configuracion: {
            tipo_negocio: 'TIENDA_VINILOS',
            usa_vencimientos: false,
            usa_produccion: false,
            usa_lotes: false,
            usa_mermas: true,
            usa_terceros: true,
            usa_almacenes: false,
            unidades_medida: ['UNIDADES'],
            mostrar_valor_inventario: true,
            requiere_aprobacion_movimientos: false
        },
        categorias_sugeridas: [
            'Rock',
            'Pop',
            'Jazz',
            'Clásica',
            'Electrónica',
            'Hip Hop',
            'Accesorios'
        ]
    },

    ABARROTES: {
        id: 'ABARROTES',
        nombre: '🛒 Tienda de Abarrotes',
        descripcion: 'Para tiendas de abarrotes y minimarkets',
        icon: '🛒',
        configuracion: {
            tipo_negocio: 'ABARROTES',
            usa_vencimientos: true,
            usa_produccion: false,
            usa_lotes: false,
            usa_mermas: true,
            usa_terceros: false,
            usa_almacenes: false,
            unidades_medida: ['UNIDADES', 'KG', 'LITROS'],
            mostrar_valor_inventario: true,
            requiere_aprobacion_movimientos: false
        },
        categorias_sugeridas: [
            'Bebidas',
            'Snacks',
            'Lácteos',
            'Enlatados',
            'Limpieza',
            'Higiene Personal'
        ]
    },

    RESTAURANTE: {
        id: 'RESTAURANTE',
        nombre: '🍽️ Restaurante',
        descripcion: 'Para restaurantes y servicios de comida',
        icon: '🍽️',
        configuracion: {
            tipo_negocio: 'RESTAURANTE',
            usa_vencimientos: true,
            usa_produccion: true,
            usa_lotes: false,
            usa_mermas: true,
            usa_terceros: true,
            usa_almacenes: false,
            unidades_medida: ['UNIDADES', 'KG', 'LITROS'],
            mostrar_valor_inventario: true,
            requiere_aprobacion_movimientos: false
        },
        categorias_sugeridas: [
            'Carnes',
            'Verduras',
            'Lácteos',
            'Bebidas',
            'Condimentos',
            'Desechables'
        ]
    },

    OTRO: {
        id: 'OTRO',
        nombre: '📦 Otro',
        descripcion: 'Configuración personalizada',
        icon: '📦',
        configuracion: {
            tipo_negocio: 'OTRO',
            usa_vencimientos: false,
            usa_produccion: false,
            usa_lotes: false,
            usa_mermas: true,
            usa_terceros: false,
            usa_almacenes: false,
            unidades_medida: ['UNIDADES'],
            mostrar_valor_inventario: true,
            requiere_aprobacion_movimientos: false
        },
        categorias_sugeridas: []
    }
};

export type BusinessTemplateId = keyof typeof BUSINESS_TEMPLATES;

export const getTemplateById = (id: BusinessTemplateId) => {
    return BUSINESS_TEMPLATES[id];
};

export const getAllTemplates = () => {
    return Object.values(BUSINESS_TEMPLATES);
};
