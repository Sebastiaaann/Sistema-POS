import React, { useState } from 'react';
import { createClient } from '../lib/supabase';
import { LogIn, Mail, Lock, UserPlus, Package } from 'lucide-react';

const Login: React.FC = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);

    const supabase = createClient();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setMessage(null);

        try {
            if (isLogin) {
                // Login
                const { data, error: signInError } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });

                if (signInError) throw signInError;

                // Recargar página para actualizar estado
                window.location.reload();
            } else {
                // Registro
                const { data, error: signUpError } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: {
                            full_name: fullName,
                        },
                    },
                });

                if (signUpError) throw signUpError;

                setMessage(
                    '✅ Cuenta creada exitosamente! Revisa tu email y haz clic en el enlace de verificación. Después de verificar tu email, podrás crear tu organización.'
                );
                setEmail('');
                setPassword('');
                setFullName('');
                setIsLogin(true);
            }
        } catch (err: any) {
            console.error('Error de autenticación:', err);
            setError(err.message || 'Error al autenticar');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center p-4">
            {/* Background Pattern */}
            <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>

            {/* Login Card */}
            <div className="relative w-full max-w-md">
                {/* Logo Section */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl shadow-lg shadow-blue-600/50 mb-4">
                        <Package className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900">TechStock</h1>
                    <p className="text-gray-500 mt-1">Sistema de Inventario SaaS</p>
                </div>

                {/* Auth Card */}
                <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                    {/* Tabs */}
                    <div className="flex border-b border-gray-100">
                        <button
                            onClick={() => {
                                setIsLogin(true);
                                setError(null);
                                setMessage(null);
                            }}
                            className={`flex-1 py-4 text-sm font-semibold transition-colors ${isLogin
                                    ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50'
                                    : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            <LogIn className="w-4 h-4 inline mr-2" />
                            Iniciar Sesión
                        </button>
                        <button
                            onClick={() => {
                                setIsLogin(false);
                                setError(null);
                                setMessage(null);
                            }}
                            className={`flex-1 py-4 text-sm font-semibold transition-colors ${!isLogin
                                    ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50'
                                    : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            <UserPlus className="w-4 h-4 inline mr-2" />
                            Registrarse
                        </button>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="p-8 space-y-5">
                        {/* Error Message */}
                        {error && (
                            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                                <p className="text-sm text-red-800">{error}</p>
                            </div>
                        )}

                        {/* Success Message */}
                        {message && (
                            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                                <p className="text-sm text-green-800">{message}</p>
                            </div>
                        )}

                        {/* Full Name (Solo en registro) */}
                        {!isLogin && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Nombre Completo
                                </label>
                                <input
                                    type="text"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                                    placeholder="Juan Pérez"
                                    required
                                />
                            </div>
                        )}

                        {/* Email */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Email
                            </label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                                    placeholder="tu@ejemplo.com"
                                    required
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Contraseña
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                                    placeholder="••••••••"
                                    required
                                    minLength={6}
                                />
                            </div>
                            {!isLogin && (
                                <p className="text-xs text-gray-500 mt-1">Mínimo 6 caracteres</p>
                            )}
                        </div>

                        {/* Forgot Password (Solo en login) */}
                        {isLogin && (
                            <div className="flex justify-end">
                                <button
                                    type="button"
                                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                                >
                                    ¿Olvidaste tu contraseña?
                                </button>
                            </div>
                        )}

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-600/30"
                        >
                            {loading ? (
                                <span className="flex items-center justify-center">
                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                                    Procesando...
                                </span>
                            ) : isLogin ? (
                                'Iniciar Sesión'
                            ) : (
                                'Crear Cuenta'
                            )}
                        </button>
                    </form>

                    {/* Footer */}
                    <div className="px-8 py-4 bg-gray-50 border-t border-gray-100">
                        <p className="text-xs text-center text-gray-500">
                            {isLogin ? '¿No tienes cuenta? ' : '¿Ya tienes cuenta? '}
                            <button
                                onClick={() => {
                                    setIsLogin(!isLogin);
                                    setError(null);
                                    setMessage(null);
                                }}
                                className="text-blue-600 hover:text-blue-700 font-semibold"
                            >
                                {isLogin ? 'Regístrate aquí' : 'Inicia sesión'}
                            </button>
                        </p>
                    </div>
                </div>

                {/* Bottom Text */}
                <p className="text-center text-xs text-gray-400 mt-8">
                    © 2025 TechStock. Sistema de gestión de inventario.
                </p>
            </div>
        </div>
    );
};

export default Login;
