# AGENTS.md - AI Coding Assistant Guide

This document provides essential guidelines for AI coding agents working in the **TechStock** inventory management SaaS codebase.

---

## 📋 Project Overview

**TechStock** is a multi-tenant SaaS inventory management system built with:
- **Frontend**: React 19 + TypeScript 5.8 + Vite 6
- **Backend**: Supabase (PostgreSQL + Row Level Security)
- **State**: Zustand (UI) + TanStack Query (server data)
- **Forms**: React Hook Form + Zod validation
- **UI**: TailwindCSS (via CDN)

**Multi-tenancy**: All data is isolated by `organizacion_id` using PostgreSQL Row Level Security (RLS).

---

## 🛠️ Build, Test & Dev Commands

### Development
```bash
npm run dev              # Start dev server on port 3000
npm run build            # Production build
npm run preview          # Preview production build
npm run types:generate   # Generate Supabase types
```

### Testing
**Note**: No unit test framework is configured (Jest/Vitest). Only E2E tests exist.
- **E2E Tests**: Located in `testsprite_tests/` (Python-based)
- **Test Pattern**: `TC001_*.py`, `TC002_*.py`, etc.
- **Running single test**: `python testsprite_tests/TC001_login_test.py` (example)

### Linting
**Note**: No ESLint or Prettier configured. Follow code patterns from existing files.

---

## 📁 Project Structure

```
saas/
├── components/          # React components
│   ├── inventory/      # Inventory-specific components
│   ├── products/       # Product forms and views
│   │   └── forms/     # Adaptive forms per business type
│   ├── suppliers/      # Supplier management
│   └── categories/     # Category management
├── lib/                # Core library
│   ├── queries/        # TanStack Query hooks (useProducts, useMovements, etc.)
│   ├── schemas/        # Zod validation schemas
│   ├── stores/         # Zustand stores (authStore, appStore, inventoryStore)
│   ├── utils/          # Utility functions (dates.ts, etc.)
│   ├── validations/    # Reusable Zod validators
│   └── supabase.ts     # Supabase client singleton
├── hooks/              # Custom React hooks
├── docs/               # Documentation (PRD.md, state-management.md, etc.)
├── supabase/           # SQL migrations and seed files
└── testsprite_tests/   # E2E test suite
```

---

## 🎨 Code Style Guidelines

### Import Organization

1. **Order**:
   - React & React ecosystem
   - Third-party libraries (Zod, React Hook Form, etc.)
   - Internal components
   - Lib utilities (queries, stores, schemas)
   - Types
   - Icons (Lucide React)

2. **Paths**:
   - **Preferred**: Absolute with `@/` alias → `import { useAuthStore } from '@/lib/stores'`
   - **Alternative**: Relative → `import { Login } from './components/Login'`
   - **Barrel exports**: Use `lib/stores/index.ts` to export all stores

3. **Example**:
```typescript
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ProductCard } from '@/components/products/ProductCard';
import { useProducts } from '@/lib/queries/useProducts';
import { useAuthStore } from '@/lib/stores';
import { loginSchema } from '@/lib/schemas/authSchemas';
import type { Product } from '@/lib/database.types';
import { Search, Plus } from 'lucide-react';
```

---

### Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| **Files** | PascalCase (components), camelCase (utils) | `Login.tsx`, `useAdmin.ts`, `dates.ts` |
| **Components** | PascalCase | `ProductCard`, `InventoryList` |
| **Variables/Functions** | camelCase | `handleSubmit`, `fetchProducts` |
| **Booleans** | `is`, `has`, `needs` prefix | `isAdmin`, `hasPermission`, `needsOnboarding` |
| **Event Handlers** | `handle` prefix | `handleClick`, `handleSubmit`, `handleDelete` |
| **Custom Hooks** | `use` prefix | `useProducts()`, `useAdmin()` |
| **Constants** | SCREAMING_SNAKE_CASE | `MAX_RETRIES`, `BUSINESS_TEMPLATES` |
| **Types/Interfaces** | PascalCase | `interface Product`, `type LoginFormData` |

---

### Component Structure Pattern

```typescript
// 1. Imports (see Import Organization above)

// 2. Type definitions (if inline)
interface ComponentProps {
  onSubmit: () => void;
}

// 3. Component definition
const Component: React.FC<ComponentProps> = ({ onSubmit }) => {
  // 4. Zustand stores (UI state)
  const { user, organizacionId } = useAuthStore();
  
  // 5. TanStack Query hooks (server state)
  const { data: products, isLoading } = useProducts();
  const createProduct = useCreateProduct();
  
  // 6. Local state
  const [isOpen, setIsOpen] = useState(false);
  
  // 7. Form hooks
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
  });
  
  // 8. Effects
  useEffect(() => { /* ... */ }, []);
  
  // 9. Event handlers
  const handleClick = async () => { /* ... */ };
  
  // 10. Conditional renders (loading, errors)
  if (isLoading) return <div>Cargando...</div>;
  if (!products) return <div>Sin datos</div>;
  
  // 11. Main render
  return <div>...</div>;
};

// 12. Export
export default Component;
```

---

### TypeScript & Types

- **Always use TypeScript** - no `.js` or `.jsx` files
- **Infer types from Zod schemas**: `type FormData = z.infer<typeof schema>`
- **Import DB types**: `import type { Database } from '@/lib/database.types'`
- **Explicit return types**: Only for complex functions; let inference work elsewhere
- **Avoid `any`**: Use `unknown` and type guards instead

---

### State Management

#### When to use Zustand vs TanStack Query

| Zustand (UI State) | TanStack Query (Server State) |
|--------------------|-------------------------------|
| Navigation state (`currentView`) | Products, categories, movements |
| Modal open/close state | User data, organization data |
| Filters, search terms | Inventory data |
| View modes (grid/list) | Supplier data |
| Sidebar open/close | Any data from Supabase |

#### Available Zustand Stores

1. **`useAuthStore`** (`@/lib/stores/authStore`)
   - `user`, `organizacionId`, `isAdmin`, `loading`, `isPending`, `needsOnboarding`
   - Persisted: `organizacionId` (sessionStorage)

2. **`useAppStore`** (`@/lib/stores/appStore`)
   - `currentView`, `sidebarOpen`, `setCurrentView()`, `toggleSidebar()`
   - Persisted: `currentView` (localStorage)

3. **`useInventoryStore`** (`@/lib/stores/inventoryStore`)
   - `searchTerm`, `categoryFilter`, `viewMode`, `selectedProduct`, `isModalOpen`
   - `setSearchTerm()`, `setCategoryFilter()`, `openModal()`, `closeModal()`
   - Persisted: `viewMode`, `categoryFilter` (localStorage)

**See `docs/state-management.md` for detailed usage examples.**

---

### Form Validation Pattern

Always use **React Hook Form + Zod**:

```typescript
// 1. Define/import Zod schema
import { loginSchema } from '@/lib/schemas/authSchemas';
type LoginFormData = z.infer<typeof loginSchema>;

// 2. Setup form
const { register, handleSubmit, formState: { errors } } = useForm<LoginFormData>({
  resolver: zodResolver(loginSchema),
  defaultValues: { email: '', password: '' },
});

// 3. Submit handler
const onSubmit = async (data: LoginFormData) => {
  try {
    await createMutation.mutateAsync(data);
    setSuccessMessage('Éxito');
  } catch (err: any) {
    setErrorMessage(err.message || 'Error');
  }
};

// 4. JSX
<form onSubmit={handleSubmit(onSubmit)}>
  <input {...register('email')} />
  {errors.email && <span className="text-red-600">{errors.email.message}</span>}
  <button type="submit">Enviar</button>
</form>
```

**Reusable validators**: Use from `lib/validations/index.ts`
- `emailValidation`, `passwordValidation`, `skuValidation`, `priceValidation()`, `textValidation()`

---

### Error Handling

**Always use try-catch with user-friendly Spanish messages:**

```typescript
// ✅ Good
const handleSubmit = async (data: FormData) => {
  try {
    await createProduct.mutateAsync(data);
    setSuccessMessage('Producto creado exitosamente');
  } catch (err: any) {
    console.error('Error creando producto:', err);
    setErrorMessage(err.message || 'Error al crear producto');
    setTimeout(() => setErrorMessage(''), 5000); // Auto-clear after 5s
  }
};

// ❌ Avoid .then() chains - use async/await
```

**Supabase error handling:**
```typescript
const { data, error } = await supabase.from('productos').select('*');
if (error) {
  throw new Error(`Error cargando productos: ${error.message}`);
}
```

---

### Database Queries (Supabase)

**Multi-tenant RLS pattern** (always filter by `organizacion_id`):

```typescript
// 1. Get authenticated user
const { data: { user } } = await supabase.auth.getUser();
if (!user) throw new Error('No hay sesión activa');

// 2. Get user's organization
const { data: membresiaData } = await supabase
  .from('miembros')
  .select('organizacion_id')
  .eq('user_id', user.id)
  .single();

// 3. Query with organization filter
const { data, error } = await supabase
  .from('productos')
  .select('*, categoria:categorias(*)')
  .eq('organizacion_id', membresiaData.organizacion_id)
  .is('deleted_at', null); // Soft delete filter

if (error) throw new Error(error.message);
return data;
```

**Soft delete**: Always filter `.is('deleted_at', null)` and delete via `UPDATE SET deleted_at = NOW()`

---

### Date Formatting

**Use Spanish formatters** from `lib/utils/dates.ts`:

```typescript
import { formatDateTime, formatRelative, formatDate } from '@/lib/utils/dates';

// "29 de diciembre de 2025"
formatDate(product.created_at);

// "29/12/2025 14:30"
formatDateTime(product.updated_at);

// "hace 3 horas"
formatRelative(product.updated_at);
```

---

## 🚨 Critical Rules

1. **Never bypass RLS**: Always filter by `organizacion_id`
2. **Always soft delete**: Use `deleted_at` column, never hard delete
3. **Spanish UX**: All user-facing messages, errors, and dates in Spanish
4. **Type safety**: Use Zod schemas + `z.infer<>` for all form data
5. **State separation**: Zustand for UI, TanStack Query for server data
6. **No `any` types**: Use `unknown` and type guards
7. **Error messages**: User-friendly Spanish with 5s auto-clear timeout

---

## 📚 Documentation References

- **Architecture**: `docs/PRD.md` - Comprehensive product requirements
- **State Management**: `docs/state-management.md` - Zustand stores guide
- **Quick Start**: `docs/QUICKSTART.md`
- **Supabase Examples**: `examples/README.md`

---

## 🔄 Git Commit Messages

Follow **conventional commits**:
- `feat:` - New features
- `fix:` - Bug fixes
- `refactor:` - Code refactoring
- `docs:` - Documentation changes
- Clear, descriptive messages in English

**Example**: `feat: add supplier management with metadata hooks`

---

## 🧪 Testing Notes

- **No unit tests configured** - consider adding Vitest if writing testable logic
- **E2E tests exist** in `testsprite_tests/` (Python)
- **Manual testing required** for new features

---

**Last Updated**: January 2026  
**Version**: 1.0
