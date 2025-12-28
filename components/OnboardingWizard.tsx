import React, { useState } from 'react';
import { Check, ArrowRight, ArrowLeft } from 'lucide-react';
import { BUSINESS_TEMPLATES, BusinessTemplateId, getAllTemplates } from '../constants/businessTemplates';
import { createClient } from '../lib/supabase';

interface OnboardingWizardProps {
    organizacionId: string;
    onComplete: () => void;
}

const OnboardingWizard: React.FC<OnboardingWizardProps> = ({ organizacionId, onComplete }) => {
    const [step, setStep] = useState(1);
    const [selectedTemplate, setSelectedTemplate] = useState<BusinessTemplateId>('RETAIL_GENERAL');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const supabase = createClient();
    const templates = getAllTemplates();
    const currentTemplate = BUSINESS_TEMPLATES[selectedTemplate];

    const handleComplete = async () => {
        try {
            setLoading(true);
            setError(null);

            const template = BUSINESS_TEMPLATES[selectedTemplate];

            // Actualizar configuración de la organización
            const { error: updateError } = await supabase
                .from('configuracion_organizacion')
                .update(template.configuracion)
                .eq('organizacion_id', organizacionId);

            if (updateError) throw updateError;

            // Crear categorías sugeridas si existen
            if (template.categorias_sugeridas && template.categorias_sugeridas.length > 0) {
                const categoriasToInsert = template.categorias_sugeridas.map(nombre => ({
                    organizacion_id: organizacionId,
                    nombre: nombre
                }));

                const { error: catError } = await supabase
                    .from('categorias')
                    .insert(categoriasToInsert);

                if (catError) console.error('Error creando categorías:', catError);
            }

            onComplete();
        } catch (err: any) {
            console.error('Error guardando configuración:', err);
            setError(err.message || 'Error al guardar configuración');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/80 backdrop-blur-sm">
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">

                {/* Header */}
                <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-6 text-white">
                    <h2 className="text-2xl font-bold">¡Bienvenido a TechStock!</h2>
                    <p className="text-blue-100 mt-1">Configura tu sistema en 2 simples pasos</p>

                    {/* Progress Bar */}
                    <div className="mt-4 flex gap-2">
                        <div className={`flex-1 h-1.5 rounded-full ${step >= 1 ? 'bg-white' : 'bg-blue-400/30'}`}></div>
                        <div className={`flex-1 h-1.5 rounded-full ${step >= 2 ? 'bg-white' : 'bg-blue-400/30'}`}></div>
                    </div>
                </div>

                {/* Content */}
                <div className="p-8">

                    {/* Step 1: Seleccionar Tipo de Negocio */}
                    {step === 1 && (
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-xl font-bold text-gray-900">¿Qué tipo de negocio tienes?</h3>
                                <p className="text-sm text-gray-500 mt-1">Selecciona la opción que mejor describa tu negocio</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {templates.map((template) => (
                                    <button
                                        key={template.id}
                                        onClick={() => setSelectedTemplate(template.id as BusinessTemplateId)}
                                        className={`relative p-6 rounded-xl border-2 transition-all text-left ${selectedTemplate === template.id
                                                ? 'border-blue-600 bg-blue-50 shadow-md'
                                                : 'border-gray-200 hover:border-blue-300 hover:shadow-sm'
                                            }`}
                                    >
                                        {selectedTemplate === template.id && (
                                            <div className="absolute top-3 right-3 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                                                <Check className="w-4 h-4 text-white" />
                                            </div>
                                        )}

                                        <div className="text-4xl mb-3">{template.icon}</div>
                                        <h4 className="font-bold text-gray-900 mb-1">{template.nombre}</h4>
                                        <p className="text-xs text-gray-500">{template.descripcion}</p>
                                    </button>
                                ))}
                            </div>

                            <div className="flex justify-end pt-4">
                                <button
                                    onClick={() => setStep(2)}
                                    className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
                                >
                                    Continuar
                                    <ArrowRight size={20} />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Step 2: Confirmar Configuración */}
                    {step === 2 && (
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-xl font-bold text-gray-900">Confirma tu configuración</h3>
                                <p className="text-sm text-gray-500 mt-1">Revisa las funcionalidades que se habilitarán</p>
                            </div>

                            {/* Template Selected */}
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center gap-4">
                                <div className="text-4xl">{currentTemplate.icon}</div>
                                <div>
                                    <h4 className="font-bold text-gray-900">{currentTemplate.nombre}</h4>
                                    <p className="text-sm text-gray-600">{currentTemplate.descripcion}</p>
                                </div>
                            </div>

                            {/* Features */}
                            <div>
                                <h4 className="font-semibold text-gray-900 mb-3">Funcionalidades habilitadas:</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {currentTemplate.configuracion.usa_vencimientos && (
                                        <div className="flex items-center gap-2 text-sm text-gray-700">
                                            <Check className="w-4 h-4 text-green-600" />
                                            <span>Control de vencimientos</span>
                                        </div>
                                    )}
                                    {currentTemplate.configuracion.usa_produccion && (
                                        <div className="flex items-center gap-2 text-sm text-gray-700">
                                            <Check className="w-4 h-4 text-green-600" />
                                            <span>Registro de producción</span>
                                        </div>
                                    )}
                                    {currentTemplate.configuracion.usa_lotes && (
                                        <div className="flex items-center gap-2 text-sm text-gray-700">
                                            <Check className="w-4 h-4 text-green-600" />
                                            <span>Gestión de lotes</span>
                                        </div>
                                    )}
                                    {currentTemplate.configuracion.usa_mermas && (
                                        <div className="flex items-center gap-2 text-sm text-gray-700">
                                            <Check className="w-4 h-4 text-green-600" />
                                            <span>Registro de mermas</span>
                                        </div>
                                    )}
                                    {currentTemplate.configuracion.usa_terceros && (
                                        <div className="flex items-center gap-2 text-sm text-gray-700">
                                            <Check className="w-4 h-4 text-green-600" />
                                            <span>Gestión de proveedores/clientes</span>
                                        </div>
                                    )}
                                    {currentTemplate.configuracion.usa_almacenes && (
                                        <div className="flex items-center gap-2 text-sm text-gray-700">
                                            <Check className="w-4 h-4 text-green-600" />
                                            <span>Múltiples almacenes</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Unidades de Medida */}
                            <div>
                                <h4 className="font-semibold text-gray-900 mb-2">Unidades de medida:</h4>
                                <div className="flex flex-wrap gap-2">
                                    {currentTemplate.configuracion.unidades_medida.map((unidad) => (
                                        <span
                                            key={unidad}
                                            className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full"
                                        >
                                            {unidad}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            {/* Categorías Sugeridas */}
                            {currentTemplate.categorias_sugeridas && currentTemplate.categorias_sugeridas.length > 0 && (
                                <div>
                                    <h4 className="font-semibold text-gray-900 mb-2">Categorías que se crearán:</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {currentTemplate.categorias_sugeridas.map((cat) => (
                                            <span
                                                key={cat}
                                                className="px-3 py-1 bg-blue-100 text-blue-700 text-sm rounded-full"
                                            >
                                                {cat}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Error */}
                            {error && (
                                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                                    {error}
                                </div>
                            )}

                            {/* Actions */}
                            <div className="flex justify-between pt-4">
                                <button
                                    onClick={() => setStep(1)}
                                    disabled={loading}
                                    className="flex items-center gap-2 px-6 py-3 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
                                >
                                    <ArrowLeft size={20} />
                                    Atrás
                                </button>
                                <button
                                    onClick={handleComplete}
                                    disabled={loading}
                                    className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                                >
                                    {loading ? (
                                        <>
                                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                            Configurando...
                                        </>
                                    ) : (
                                        <>
                                            <Check size={20} />
                                            Completar Configuración
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
};

export default OnboardingWizard;
