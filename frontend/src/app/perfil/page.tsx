"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { useRouter, useSearchParams } from 'next/navigation';
import api from '@/services/api';
import {
    User, Award, FileText, Trophy, Shield, Settings,
    ChevronRight, Calendar, TrendingUp, Star, Edit3, Save
} from 'lucide-react';

function ProfileContent() {
    const { usuario, isAuthenticated, updateUser } = useAuth();
    const { showToast } = useToast();
    const router = useRouter();
    const searchParams = useSearchParams();
    const tabParam = searchParams.get('tab');

    const [activeTab, setActiveTab] = useState(tabParam || 'perfil');
    const [reputation, setReputation] = useState<any>(null);
    const [ranking, setRanking] = useState<any[]>([]);
    const [extrato, setExtrato] = useState<any>(null);
    const [editing, setEditing] = useState(false);
    const [editForm, setEditForm] = useState({ pseudonimo: '', miniBio: '' });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!isAuthenticated) {
            router.push('/login');
            return;
        }
        loadData();
    }, [isAuthenticated, activeTab]);

    const loadData = async () => {
        setLoading(true);
        try {
            if (activeTab === 'perfil' || activeTab === 'reputacao') {
                const rep = await api.getReputation();
                setReputation(rep);
            }
            if (activeTab === 'ranking') {
                const rank = await api.getRanking();
                setRanking(rank);
            }
            if (activeTab === 'extrato') {
                const ext = await api.getExtract();
                setExtrato(ext);
            }
        } catch (err: any) {
            showToast(err.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleSaveProfile = async () => {
        try {
            const res = await api.updateProfile(editForm);
            updateUser(res.usuario);
            showToast('Perfil atualizado!', 'success');
            setEditing(false);
        } catch (err: any) {
            showToast(err.message, 'error');
        }
    };

    if (!isAuthenticated || !usuario) return null;

    const tabs = [
        { id: 'perfil', label: 'Perfil', icon: User },
        { id: 'reputacao', label: 'Reputação', icon: Award },
        { id: 'extrato', label: 'Extrato', icon: FileText },
        { id: 'ranking', label: 'Ranking', icon: Trophy },
    ];

    const containerStyle: React.CSSProperties = {
        minHeight: '100vh',
        background: 'var(--bg-primary)',
        padding: '80px 20px 40px',
    };

    const cardStyle: React.CSSProperties = {
        background: 'var(--bg-surface)',
        borderRadius: 16,
        border: '1px solid var(--glass-border)',
        padding: 24,
        boxShadow: 'var(--shadow-sm)',
    };

    return (
        <div style={containerStyle}>
            <div style={{ maxWidth: 800, margin: '0 auto' }}>
                {/* Profile Header Card */}
                <div style={{
                    ...cardStyle,
                    background: 'linear-gradient(135deg, rgba(37,99,235,0.08), rgba(139,92,246,0.08))',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 20,
                    marginBottom: 20,
                }}>
                    <div style={{
                        width: 72,
                        height: 72,
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontWeight: 700,
                        fontSize: 28,
                        flexShrink: 0,
                    }}>
                        {usuario.pseudonimo.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex: 1 }}>
                        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: 'var(--text-primary)' }}>
                            {usuario.pseudonimo}
                        </h1>
                        <p style={{ margin: '4px 0', fontSize: 14, color: 'var(--text-secondary)' }}>
                            {usuario.nomeCompleto} &middot; {usuario.email}
                        </p>
                        <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                            <span style={{
                                padding: '4px 12px',
                                borderRadius: 'var(--radius-full)',
                                fontSize: 12,
                                fontWeight: 600,
                                background: 'rgba(59,130,246,0.1)',
                                color: 'var(--primary-color)',
                            }}>
                                {usuario.nivel}
                            </span>
                            <span style={{
                                padding: '4px 12px',
                                borderRadius: 'var(--radius-full)',
                                fontSize: 12,
                                fontWeight: 600,
                                background: 'rgba(16,185,129,0.1)',
                                color: '#10b981',
                            }}>
                                {usuario.pontuacao} pontos
                            </span>
                            <span style={{
                                padding: '4px 12px',
                                borderRadius: 'var(--radius-full)',
                                fontSize: 12,
                                fontWeight: 600,
                                background: 'rgba(139,92,246,0.1)',
                                color: '#8b5cf6',
                            }}>
                                {usuario.role}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div style={{
                    display: 'flex',
                    gap: 4,
                    marginBottom: 20,
                    background: 'var(--bg-surface)',
                    borderRadius: 12,
                    padding: 4,
                    border: '1px solid var(--glass-border)',
                }}>
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            style={{
                                flex: 1,
                                padding: '10px 16px',
                                borderRadius: 10,
                                fontSize: 13,
                                fontWeight: activeTab === tab.id ? 600 : 400,
                                background: activeTab === tab.id ? 'var(--primary-color)' : 'transparent',
                                color: activeTab === tab.id ? 'white' : 'var(--text-secondary)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 6,
                                border: 'none',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                            }}
                        >
                            <tab.icon size={16} />
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Tab Content */}
                {activeTab === 'perfil' && (
                    <div style={cardStyle}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>Informações do Perfil</h2>
                            <button onClick={() => { setEditing(!editing); setEditForm({ pseudonimo: usuario.pseudonimo, miniBio: usuario.miniBio || '' }); }}
                                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, background: 'rgba(59,130,246,0.1)', color: 'var(--primary-color)', fontWeight: 500, fontSize: 13, border: 'none', cursor: 'pointer' }}>
                                <Edit3 size={14} /> {editing ? 'Cancelar' : 'Editar'}
                            </button>
                        </div>
                        {editing ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6, color: 'var(--text-secondary)' }}>Pseudônimo</label>
                                    <input value={editForm.pseudonimo} onChange={e => setEditForm(p => ({ ...p, pseudonimo: e.target.value }))}
                                        style={{ width: '100%', padding: 12, background: 'var(--bg-primary)', border: '1px solid var(--glass-border)', borderRadius: 8, color: 'var(--text-primary)', fontSize: 14, outline: 'none' }} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6, color: 'var(--text-secondary)' }}>Mini Bio ({editForm.miniBio.length}/160)</label>
                                    <textarea value={editForm.miniBio} onChange={e => setEditForm(p => ({ ...p, miniBio: e.target.value }))} maxLength={160}
                                        style={{ width: '100%', padding: 12, background: 'var(--bg-primary)', border: '1px solid var(--glass-border)', borderRadius: 8, color: 'var(--text-primary)', fontSize: 14, outline: 'none', resize: 'vertical', minHeight: 80, fontFamily: 'inherit' }} />
                                </div>
                                <button onClick={handleSaveProfile}
                                    style={{ padding: 12, background: 'var(--primary-color)', color: 'white', borderRadius: 8, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, border: 'none', cursor: 'pointer' }}>
                                    <Save size={16} /> Salvar
                                </button>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                {[
                                    { label: 'Nome Completo', value: usuario.nomeCompleto },
                                    { label: 'Pseudônimo', value: usuario.pseudonimo },
                                    { label: 'E-mail', value: usuario.email },
                                    { label: 'Mini Bio', value: usuario.miniBio || 'Não definida' },
                                    { label: 'Perfil de Acesso', value: usuario.role },
                                ].map(item => (
                                    <div key={item.label} style={{ borderBottom: '1px solid var(--glass-border)', paddingBottom: 12 }}>
                                        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>{item.label}</div>
                                        <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--text-primary)' }}>{item.value}</div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'reputacao' && reputation && (
                    <div style={cardStyle}>
                        <h2 style={{ margin: '0 0 20px', fontSize: 18, fontWeight: 600 }}>Reputação & Medalhas</h2>
                        {/* Progress Bar */}
                        <div style={{ marginBottom: 24 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{reputation.nivel}</span>
                                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{reputation.proximoNivel}</span>
                            </div>
                            <div style={{ height: 10, background: 'var(--bg-primary)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                                <div style={{
                                    width: `${reputation.progresso}%`,
                                    height: '100%',
                                    background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)',
                                    borderRadius: 'var(--radius-full)',
                                    transition: 'width 0.5s ease',
                                }} />
                            </div>
                            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 6 }}>
                                {reputation.pontuacao} pts &middot; Faltam {reputation.pontosParaProximo} pts para o próximo nível
                            </div>
                        </div>
                        {/* Medals */}
                        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>Medalhas Conquistadas</h3>
                        {reputation.medalhas.length > 0 ? (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
                                {reputation.medalhas.map((m: any) => (
                                    <div key={m.id} style={{
                                        padding: 16,
                                        background: 'rgba(59,130,246,0.05)',
                                        borderRadius: 12,
                                        border: '1px solid rgba(59,130,246,0.1)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 12,
                                    }}>
                                        <span style={{ fontSize: 28 }}>{m.medalha.icone}</span>
                                        <div>
                                            <div style={{ fontWeight: 600, fontSize: 14 }}>{m.medalha.nome}</div>
                                            <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{m.medalha.descricao}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Nenhuma medalha ainda. Continue contribuindo!</p>
                        )}
                        {/* Points breakdown */}
                        <h3 style={{ fontSize: 15, fontWeight: 600, margin: '24px 0 12px' }}>Como ganhar pontos</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {[
                                { acao: 'Relato Confirmado', pts: '+10', cor: '#10b981' },
                                { acao: 'Confirmação de Relato', pts: '+2', cor: '#3b82f6' },
                                { acao: 'Denúncia de Fake Procedente', pts: '+5', cor: '#10b981' },
                                { acao: 'Relato marcado como Falso', pts: '-20', cor: '#ef4444' },
                                { acao: 'Voto em relato Falso', pts: '-5', cor: '#ef4444' },
                            ].map(item => (
                                <div key={item.acao} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', borderRadius: 8, background: 'var(--bg-primary)' }}>
                                    <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>{item.acao}</span>
                                    <span style={{ fontWeight: 700, fontSize: 14, color: item.cor }}>{item.pts}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'extrato' && extrato && (
                    <div style={cardStyle}>
                        <h2 style={{ margin: '0 0 20px', fontSize: 18, fontWeight: 600 }}>Extrato de Atividades</h2>
                        {/* My Incidents */}
                        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>Meus Relatos</h3>
                        {extrato.incidentes.length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
                                {extrato.incidentes.map((inc: any) => (
                                    <div key={inc.id} style={{
                                        padding: 14,
                                        background: 'var(--bg-primary)',
                                        borderRadius: 10,
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        border: '1px solid var(--glass-border)',
                                    }}>
                                        <div>
                                            <div style={{ fontWeight: 600, fontSize: 14 }}>{inc.titulo}</div>
                                            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                                                {new Date(inc.criadoEm).toLocaleDateString('pt-BR')} &middot; Score: {inc.scoreVeracidade}
                                            </div>
                                        </div>
                                        <span style={{
                                            padding: '4px 10px',
                                            borderRadius: 'var(--radius-full)',
                                            fontSize: 11,
                                            fontWeight: 600,
                                            background: inc.status === 'ativo' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                                            color: inc.status === 'ativo' ? '#10b981' : '#ef4444',
                                        }}>
                                            {inc.status.charAt(0).toUpperCase() + inc.status.slice(1)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 24 }}>Nenhum relato ainda.</p>
                        )}
                        {/* Reputation Log */}
                        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>Histórico de Pontos</h3>
                        {extrato.registros.length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                {extrato.registros.map((r: any) => (
                                    <div key={r.id} style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        padding: '10px 14px',
                                        borderRadius: 8,
                                        background: 'var(--bg-primary)',
                                    }}>
                                        <div>
                                            <div style={{ fontSize: 13, fontWeight: 500 }}>{r.motivo.replace(/_/g, ' ')}</div>
                                            <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                                                {new Date(r.criadoEm).toLocaleString('pt-BR')}
                                            </div>
                                        </div>
                                        <span style={{
                                            fontWeight: 700,
                                            fontSize: 14,
                                            color: r.pontos > 0 ? '#10b981' : '#ef4444',
                                        }}>
                                            {r.pontos > 0 ? '+' : ''}{r.pontos}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Nenhum registro de reputação.</p>
                        )}
                    </div>
                )}

                {activeTab === 'ranking' && (
                    <div style={cardStyle}>
                        <h2 style={{ margin: '0 0 20px', fontSize: 18, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Trophy size={20} color="#f59e0b" /> Ranking Semanal
                        </h2>
                        {ranking.length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {ranking.map((u: any, i: number) => (
                                    <div key={u.id} style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 14,
                                        padding: 14,
                                        borderRadius: 12,
                                        background: i < 3 ? `rgba(${i === 0 ? '245,158,11' : i === 1 ? '148,163,184' : '180,83,9'},0.08)` : 'var(--bg-primary)',
                                        border: i < 3 ? `1px solid rgba(${i === 0 ? '245,158,11' : i === 1 ? '148,163,184' : '180,83,9'},0.2)` : '1px solid var(--glass-border)',
                                    }}>
                                        <span style={{
                                            width: 32,
                                            height: 32,
                                            borderRadius: '50%',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontWeight: 700,
                                            fontSize: i < 3 ? 18 : 14,
                                            background: i === 0 ? 'rgba(245,158,11,0.2)' : i < 3 ? 'rgba(148,163,184,0.2)' : 'var(--glass-border)',
                                            color: i === 0 ? '#f59e0b' : i === 1 ? '#94a3b8' : i === 2 ? '#b45309' : 'var(--text-secondary)',
                                        }}>
                                            {i < 3 ? ['🥇', '🥈', '🥉'][i] : i + 1}
                                        </span>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>{u.pseudonimo}</div>
                                            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{u.nivel}</div>
                                        </div>
                                        <span style={{
                                            fontWeight: 700,
                                            fontSize: 16,
                                            color: 'var(--primary-color)',
                                        }}>
                                            {u.pontuacao} pts
                                        </span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p style={{ color: 'var(--text-secondary)' }}>Nenhum ranking disponível ainda.</p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

export default function PerfilPage() {
    return (
        <Suspense fallback={<div style={{ minHeight: '100vh', background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>Carregando...</div>}>
            <ProfileContent />
        </Suspense>
    );
}
