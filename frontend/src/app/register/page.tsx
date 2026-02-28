"use client";

import React, { useState } from 'react';
import { useAuth } from '@/features/auth/AuthContext';
import { useToast } from '@/shared/lib/toastStore';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Shield, User, Mail, Lock, Eye, EyeOff, FileCheck, ArrowRight } from 'lucide-react';

export default function RegisterPage() {
    const { register } = useAuth();
    const { showToast } = useToast();
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [form, setForm] = useState({
        nomeCompleto: '',
        pseudonimo: '',
        email: '',
        senha: '',
        confirmacaoSenha: '',
        aceitouTermos: false,
    });

    const updateField = (field: string, value: any) => {
        setForm(prev => ({ ...prev, [field]: value }));
    };

    const passwordStrength = () => {
        const s = form.senha;
        let score = 0;
        if (s.length >= 8) score++;
        if (/[A-Z]/.test(s)) score++;
        if (/[a-z]/.test(s)) score++;
        if (/[0-9]/.test(s)) score++;
        if (/[!@#$%^&*(),.?":{}|<>]/.test(s)) score++;
        return score;
    };

    const strengthColors = ['#ef4444', '#ef4444', '#f59e0b', '#f59e0b', '#10b981', '#10b981'];
    const strengthLabels = ['', 'Muito fraca', 'Fraca', 'Média', 'Forte', 'Excelente'];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (form.senha !== form.confirmacaoSenha) {
            showToast('As senhas não coincidem', 'error');
            return;
        }

        if (!form.aceitouTermos) {
            showToast('Você deve aceitar os Termos de Uso e Política de Privacidade', 'error');
            return;
        }

        setLoading(true);
        try {
            await register(form);
            showToast('Cadastro realizado com sucesso! Bem-vindo!', 'success');
            router.push('/');
        } catch (err: any) {
            showToast(err.message || 'Erro ao criar conta', 'error');
        } finally {
            setLoading(false);
        }
    };

    const strength = passwordStrength();

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
                maxWidth: 480,
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
                        background: 'linear-gradient(135deg, #10b981, #2563eb)',
                        borderRadius: 16,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}>
                        <Shield size={28} color="white" />
                    </div>
                    <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: 'var(--text-primary)' }}>
                        Criar Conta
                    </h1>
                    <p style={{ margin: '8px 0 0', fontSize: 14, color: 'var(--text-secondary)' }}>
                        Junte-se à comunidade e ajude a proteger sua vizinhança
                    </p>
                </div>

                <form onSubmit={handleSubmit} style={{ padding: 32, display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {/* Nome Completo */}
                    <div style={{ position: 'relative' }}>
                        <User size={18} style={{ position: 'absolute', left: 14, top: 14, color: 'var(--text-secondary)' }} />
                        <input
                            id="register-name"
                            type="text"
                            placeholder="Nome Completo"
                            value={form.nomeCompleto}
                            onChange={e => updateField('nomeCompleto', e.target.value)}
                            required
                            style={{
                                width: '100%', padding: '14px 14px 14px 44px',
                                background: 'var(--bg-primary)', border: '1px solid var(--glass-border)',
                                borderRadius: 12, color: 'var(--text-primary)', fontSize: 14, outline: 'none',
                            }}
                        />
                    </div>

                    {/* Pseudônimo */}
                    <div style={{ position: 'relative' }}>
                        <User size={18} style={{ position: 'absolute', left: 14, top: 14, color: 'var(--text-secondary)' }} />
                        <input
                            id="register-pseudo"
                            type="text"
                            placeholder="Pseudônimo (Nome Social)"
                            value={form.pseudonimo}
                            onChange={e => updateField('pseudonimo', e.target.value)}
                            required
                            maxLength={30}
                            style={{
                                width: '100%', padding: '14px 14px 14px 44px',
                                background: 'var(--bg-primary)', border: '1px solid var(--glass-border)',
                                borderRadius: 12, color: 'var(--text-primary)', fontSize: 14, outline: 'none',
                            }}
                        />
                    </div>

                    {/* Email */}
                    <div style={{ position: 'relative' }}>
                        <Mail size={18} style={{ position: 'absolute', left: 14, top: 14, color: 'var(--text-secondary)' }} />
                        <input
                            id="register-email"
                            type="email"
                            placeholder="E-mail"
                            value={form.email}
                            onChange={e => updateField('email', e.target.value)}
                            required
                            style={{
                                width: '100%', padding: '14px 14px 14px 44px',
                                background: 'var(--bg-primary)', border: '1px solid var(--glass-border)',
                                borderRadius: 12, color: 'var(--text-primary)', fontSize: 14, outline: 'none',
                            }}
                        />
                    </div>

                    {/* Senha */}
                    <div style={{ position: 'relative' }}>
                        <Lock size={18} style={{ position: 'absolute', left: 14, top: 14, color: 'var(--text-secondary)' }} />
                        <input
                            id="register-password"
                            type={showPassword ? 'text' : 'password'}
                            placeholder="Senha"
                            value={form.senha}
                            onChange={e => updateField('senha', e.target.value)}
                            required
                            minLength={8}
                            style={{
                                width: '100%', padding: '14px 44px 14px 44px',
                                background: 'var(--bg-primary)', border: '1px solid var(--glass-border)',
                                borderRadius: 12, color: 'var(--text-primary)', fontSize: 14, outline: 'none',
                            }}
                        />
                        <button type="button" onClick={() => setShowPassword(!showPassword)}
                            style={{ position: 'absolute', right: 14, top: 12, background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: 0 }}>
                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    </div>

                    {/* Password Strength Bar */}
                    {form.senha && (
                        <div>
                            <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
                                {[1, 2, 3, 4, 5].map(i => (
                                    <div key={i} style={{
                                        flex: 1, height: 4, borderRadius: 2,
                                        background: i <= strength ? strengthColors[strength] : 'var(--glass-border)',
                                        transition: 'background 0.3s',
                                    }} />
                                ))}
                            </div>
                            <span style={{ fontSize: 11, color: strengthColors[strength] }}>
                                {strengthLabels[strength]}
                            </span>
                        </div>
                    )}

                    {/* Confirmação */}
                    <div style={{ position: 'relative' }}>
                        <Lock size={18} style={{ position: 'absolute', left: 14, top: 14, color: 'var(--text-secondary)' }} />
                        <input
                            id="register-confirm"
                            type="password"
                            placeholder="Confirmar Senha"
                            value={form.confirmacaoSenha}
                            onChange={e => updateField('confirmacaoSenha', e.target.value)}
                            required
                            style={{
                                width: '100%', padding: '14px 14px 14px 44px',
                                background: 'var(--bg-primary)',
                                border: `1px solid ${form.confirmacaoSenha && form.confirmacaoSenha !== form.senha ? '#ef4444' : 'var(--glass-border)'}`,
                                borderRadius: 12, color: 'var(--text-primary)', fontSize: 14, outline: 'none',
                            }}
                        />
                    </div>

                    {/* Termos */}
                    <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', fontSize: 13, color: 'var(--text-secondary)' }}>
                        <input
                            id="register-terms"
                            type="checkbox"
                            checked={form.aceitouTermos}
                            onChange={e => updateField('aceitouTermos', e.target.checked)}
                            style={{ marginTop: 3, accentColor: 'var(--primary-color)' }}
                        />
                        <span>
                            Li e aceito os <strong style={{ color: 'var(--primary-color)' }}>Termos de Uso</strong> e a{' '}
                            <strong style={{ color: 'var(--primary-color)' }}>Política de Privacidade (LGPD)</strong>
                        </span>
                    </label>

                    <button
                        id="register-submit"
                        type="submit"
                        disabled={loading || !form.aceitouTermos}
                        style={{
                            width: '100%', padding: 14, marginTop: 8,
                            background: loading || !form.aceitouTermos ? 'var(--text-secondary)' : 'linear-gradient(135deg, #10b981, #2563eb)',
                            color: 'white', border: 'none', borderRadius: 12, fontSize: 16, fontWeight: 600,
                            cursor: loading || !form.aceitouTermos ? 'not-allowed' : 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                            opacity: loading || !form.aceitouTermos ? 0.7 : 1,
                        }}
                    >
                        {loading ? 'Criando conta...' : 'Criar Conta'}
                        {!loading && <ArrowRight size={18} />}
                    </button>

                    <div style={{ textAlign: 'center', fontSize: 14, color: 'var(--text-secondary)' }}>
                        Já tem conta?{' '}
                        <Link href="/login" style={{ color: 'var(--primary-color)', fontWeight: 600, textDecoration: 'none' }}>
                            Entrar
                        </Link>
                    </div>
                </form>
            </div>
        </div>
    );
}
