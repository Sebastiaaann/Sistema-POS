# Generación de Tipos de Supabase

## Instrucción

Para generar los tipos TypeScript desde tu proyecto de Supabase, necesitas ejecutar el siguiente comando en PowerShell:

```powershell
npx supabase gen types typescript --project-id TU_PROJECT_ID > lib/database.types.ts
```

## ¿Dónde encuentro mi Project ID?

**Opción 1**: En el Dashboard de Supabase
- Ve a: **Settings** → **General** → **Reference ID**

**Opción 2**: En la URL de tu proyecto
- Tu URL es algo como: `https://xxxxxxxxxxxxx.supabase.co`
- El `xxxxxxxxxxxxx` es tu Project ID

## ¿Qué hace este comando?

1. Se conecta a tu proyecto de Supabase
2. Lee el schema actual de tu base de datos
3. Genera tipos TypeScript que coinciden EXACTAMENTE con tu schema
4. Guarda los tipos en `lib/database.types.ts`

## Siguiente Paso

Una vez que ejecutes el comando y se generen los tipos, todos los errores de TypeScript en `examples/supabase-usage.ts` deberían desaparecer automáticamente.
