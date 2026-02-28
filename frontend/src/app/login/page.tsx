"use client";

import React, { useState } from 'react';
import { useAuth } from '@/features/auth/AuthContext';
import { usarNotificacao } from '@/shared/lib/toastStore';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Shield, Eye, EyeOff, Mail, Lock, ArrowRight } from 'lucide-react';

export default function LoginPage() {
    const { login } = useAuth();
    const { apresentarNotificacao } = usarNotificacao();
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [senha, setSenha] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [showForgot, setShowForgot] = useState(false);
    const [forgotEmail, setForgotEmail] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || !senha) {
            apresentarNotificacao('Preencha todos os campos', 'error');
            return;
        }
        setLoading(true);
        try {
            await login(email, senha);
            apresentarNotificacao('Login realizado com sucesso!', 'success');
            router.push('/');
        } catch (err: any) {
            apresentarNotificacao(err.message || 'Erro ao fazer login', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleForgot = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const { default: api } = await import('@/shared/lib/api');
            await api.forgotPassword(forgotEmail);
            apresentarNotificacao('Se o e-mail estiver cadastrado, você receberá as instruções.', 'info');
            setShowForgot(false);
        } catch {
            apresentarNotificacao('Erro ao processar recuperação.', 'error');
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
            padding: 20,
        }}>
            <div style={{
                width: '100%',
                maxWidth: 440,
                background: 'var(--bg-surface)',
                borderRadius: 20,
                overflow: 'hidden',
                boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
                border: '1px solid var(--glass-border)',
            }}>
                {/* Header */}
                <div style={{
                    padding: '32px 32px 24px',
                    textAlign: 'center',
                    background: 'linear-gradient(135deg, rgba(37,99,235,0.08), rgba(139,92,246,0.08))',
                    borderBottom: '1px solid var(--glass-border)',
                }}>
                    <div style={{
                        width: 56,
                        height: 56,
                        margin: '0 auto 16px',
                        background: 'linear-gradient(135deg, #2563eb, #8b5cf6)',
                        borderRadius: 16,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}>
                        <Shield size={28} color="white" />
                    </div>
                    <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: 'var(--text-primary)' }}>
                        {showForgot ? 'Recuperar Senha' : 'Bem-vindo de volta'}
                    </h1>
                    <p style={{ margin: '8px 0 0', fontSize: 14, color: 'var(--text-secondary)' }}>
                        {showForgot ? 'Insira seu e-mail cadastrado' : 'Acesse sua conta na Comunidade Segura'}
                    </p>
                </div>

                {/* Form */}
                <div style={{ padding: 32 }}>
                    {showForgot ? (
                        <form onSubmit={handleForgot} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            <div style={{ position: 'relative' }}>
                                <Mail size={18} style={{ position: 'absolute', left: 14, top: 14, color: 'var(--text-secondary)' }} />
                                <input
                                    type="email"
                                    placeholder="E-mail cadastrado"
                                    value={forgotEmail}
                                    onChange={e => setForgotEmail(e.target.value)}
                                    required
                                    style={{
                                        width: '100%',
                                        padding: '14px 14px 14px 44px',
                                        background: 'var(--bg-primary)',
                                        border: '1px solid var(--glass-border)',
                                        borderRadius: 12,
                                        color: 'var(--text-primary)',
                                        fontSize: 14,
                                        outline: 'none',
                                        transition: 'border-color 0.2s',
                                    }}
                                />
                            </div>
                            <button type="submit" style={{
                                width: '100%',
                                padding: 14,
                                background: 'linear-gradient(135deg, #2563eb, #8b5cf6)',
                                color: 'white',
                                border: 'none',
                                borderRadius: 12,
                                fontSize: 16,
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 8,
                            }}>
                                Enviar e-mail de recuperação
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowForgot(false)}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: 'var(--primary-color)',
                                    cursor: 'pointer',
                                    fontSize: 14,
                                    textAlign: 'center',
                                }}
                            >
                                Voltar ao login
                            </button>
                        </form>
                    ) : (
                        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            <div style={{ position: 'relative' }}>
                                <Mail size={18} style={{ position: 'absolute', left: 14, top: 14, color: 'var(--text-secondary)' }} />
                                <input
                                    id="login-email"
                                    type="email"
                                    placeholder="E-mail"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    required
                                    style={{
                                        width: '100%',
                                        padding: '14px 14px 14px 44px',
                                        background: 'var(--bg-primary)',
                                        border: '1px solid var(--glass-border)',
                                        borderRadius: 12,
                                        color: 'var(--text-primary)',
                                        fontSize: 14,
                                        outline: 'none',
                                    }}
                                />
                            </div>
                            <div style={{ position: 'relative' }}>
                                <Lock size={18} style={{ position: 'absolute', left: 14, top: 14, color: 'var(--text-secondary)' }} />
                                <input
                                    id="login-password"
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="Senha"
                                    value={senha}
                                    onChange={e => setSenha(e.target.value)}
                                    required
                                    style={{
                                        width: '100%',
                                        padding: '14px 44px 14px 44px',
                                        background: 'var(--bg-primary)',
                                        border: '1px solid var(--glass-border)',
                                        borderRadius: 12,
                                        color: 'var(--text-primary)',
                                        fontSize: 14,
                                        outline: 'none',
                                    }}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    style={{
                                        position: 'absolute',
                                        right: 14,
                                        top: 12,
                                        background: 'none',
                                        border: 'none',
                                        color: 'var(--text-secondary)',
                                        cursor: 'pointer',
                                        padding: 0,
                                    }}
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>

                            <div style={{ textAlign: 'right' }}>
                                <button
                                    type="button"
                                    onClick={() => setShowForgot(true)}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        color: 'var(--primary-color)',
                                        cursor: 'pointer',
                                        fontSize: 13,
                                    }}
                                >
                                    Esqueci minha senha
                                </button>
                            </div>

                            <button
                                id="login-submit"
                                type="submit"
                                disabled={loading}
                                style={{
                                    width: '100%',
                                    padding: 14,
                                    background: loading ? 'var(--text-secondary)' : 'linear-gradient(135deg, #2563eb, #8b5cf6)',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: 12,
                                    fontSize: 16,
                                    fontWeight: 600,
                                    cursor: loading ? 'not-allowed' : 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 8,
                                    opacity: loading ? 0.7 : 1,
                                    transition: 'all 0.2s',
                                }}
                            >
                                {loading ? 'Entrando...' : 'Entrar'}
                                {!loading && <ArrowRight size={18} />}
                            </button>

                            <div style={{
                                textAlign: 'center',
                                fontSize: 14,
                                color: 'var(--text-secondary)',
                                marginTop: 8,
                            }}>
                                Não tem conta?{' '}
                                <Link href="/register" style={{
                                    color: 'var(--primary-color)',
                                    fontWeight: 600,
                                    textDecoration: 'none',
                                }}>
                                    Cadastre-se
                                </Link>
                            </div>

                            {/* Demo credentials */}
                            <div style={{
                                marginTop: 16,
                                padding: 16,
                                background: 'rgba(59,130,246,0.05)',
                                borderRadius: 12,
                                border: '1px solid rgba(59,130,246,0.1)',
                            }}>
                                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8, fontWeight: 600 }}>
                                    🔑 Contas de demonstração:
                                </div>
                                <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                                    <div><b>Admin:</b> admin@comunidadesegura.com / Admin@123</div>
                                    <div><b>Membro:</b> joao@email.com / User@1234</div>
                                </div>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
