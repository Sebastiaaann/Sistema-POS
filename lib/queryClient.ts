import { QueryClient } from '@tanstack/react-query';

/**
 * Configuración global del QueryClient para TanStack Query
 * 
 * Configuración optimizada para una aplicación SaaS de inventario
 */
export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            // Cache de datos por 5 minutos
            staleTime: 5 * 60 * 1000,

            // Mantener datos en cache por 10 minutos
            gcTime: 10 * 60 * 1000,

            // Reintentar solo una vez en caso de error
            retry: 1,

            // Refetch al volver a la ventana solo si los datos están stale
            refetchOnWindowFocus: true,

            // No refetch al montar si los datos están frescos
            refetchOnMount: false,

            // No refetch al reconectar si los datos están frescos
            refetchOnReconnect: true,
        },
        mutations: {
            // Reintentar mutaciones fallidas una vez
            retry: 1,
        },
    },
});

/**
 * Keys para queries - Centraliza todas las query keys para mejor mantenimiento
 */
export const queryKeys = {
    // Autenticación
    auth: {
        user: ['auth', 'user'] as const,
        session: ['auth', 'session'] as const,
    },

    // Organizaciones
    organizations: {
        all: ['organizations'] as const,
        detail: (id: string) => ['organizations', id] as const,
        config: (id: string) => ['organizations', id, 'config'] as const,
        members: (id: string) => ['organizations', id, 'members'] as const,
    },

    // Productos
    products: {
        all: (orgId: string) => ['products', orgId] as const,
        detail: (orgId: string, id: string) => ['products', orgId, id] as const,
        byCategory: (orgId: string, category: string) => ['products', orgId, 'category', category] as const,
    },

    // Categorías
    categories: {
        all: (orgId: string) => ['categories', orgId] as const,
    },

    // Movimientos
    movements: {
        all: (orgId: string) => ['movements', orgId] as const,
        detail: (orgId: string, id: string) => ['movements', orgId, id] as const,
        byProduct: (orgId: string, productId: string) => ['movements', orgId, 'product', productId] as const,
        stats: (orgId: string) => ['movements', orgId, 'stats'] as const,
    },

    // Admin
    admin: {
        pendingOrganizations: ['admin', 'pending-organizations'] as const,
        organizationStats: ['admin', 'stats'] as const,
    },
} as const;
