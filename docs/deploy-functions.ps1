# ============================================
# SCRIPT DE DESPLIEGUE: Edge Functions
# ============================================
# 
# Este script te ayuda a desplegar las Edge Functions
# paso a paso desde PowerShell
# ============================================

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  DESPLIEGUE DE EDGE FUNCTIONS" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verificar que estamos en el directorio correcto
$currentDir = Get-Location
Write-Host "Directorio actual: $currentDir" -ForegroundColor Yellow
Write-Host ""

# Paso 1: Verificar instalacion de Supabase CLI
Write-Host "PASO 1: Verificando Supabase CLI..." -ForegroundColor Green
try {
    $version = supabase --version 2>&1
    Write-Host "OK - Supabase CLI instalado: $version" -ForegroundColor Green
} catch {
    Write-Host "ERROR - Supabase CLI no esta instalado" -ForegroundColor Red
    Write-Host ""
    Write-Host "Instalalo con:" -ForegroundColor Yellow
    Write-Host "  npm install -g supabase" -ForegroundColor White
    exit 1
}
Write-Host ""

# Paso 2: Login
Write-Host "PASO 2: Iniciando sesion en Supabase..." -ForegroundColor Green
Write-Host "Abrira tu navegador para autenticarte" -ForegroundColor Yellow
supabase login
Write-Host ""

# Paso 3: Link del proyecto
Write-Host "PASO 3: Enlazando proyecto..." -ForegroundColor Green
Write-Host ""
Write-Host "Para encontrar tu Project Reference ID:" -ForegroundColor Yellow
Write-Host "  1. Ve a https://app.supabase.com" -ForegroundColor White
Write-Host "  2. Selecciona tu proyecto" -ForegroundColor White
Write-Host "  3. Settings > General > Reference ID" -ForegroundColor White
Write-Host ""
$projectRef = Read-Host "Ingresa tu Project Reference ID (ej: tfuqlbrxjzxepdbkdmqg)"

if ($projectRef) {
    Write-Host "Enlazando con proyecto: $projectRef" -ForegroundColor Cyan
    supabase link --project-ref $projectRef
} else {
    Write-Host "ERROR - Project Reference ID requerido" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Paso 4: Desplegar Edge Functions
Write-Host "PASO 4: Desplegando Edge Functions..." -ForegroundColor Green
Write-Host ""

Write-Host "Desplegando send-approval-notification..." -ForegroundColor Cyan
supabase functions deploy send-approval-notification
Write-Host ""

Write-Host "Desplegando approve-organization..." -ForegroundColor Cyan
supabase functions deploy approve-organization
Write-Host ""

# Resumen
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  OK - DESPLIEGUE COMPLETADO" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Proximos pasos:" -ForegroundColor Yellow
Write-Host "1. Ve a Supabase Dashboard > Edge Functions" -ForegroundColor White
Write-Host "2. Configura las variables de entorno" -ForegroundColor White
Write-Host "3. Ejecuta el SQL de aprobacion" -ForegroundColor White
Write-Host ""
Write-Host "Consulta GUIA_CONFIG_EMAIL.md para instrucciones detalladas" -ForegroundColor Cyan
Write-Host ""
