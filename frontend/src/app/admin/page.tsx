"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { useRouter } from 'next/navigation';
import api from '@/services/api';
import {
    BarChart3, Shield, FileSearch, Users, AlertTriangle,
    CheckCircle, XCircle, Download, Search, ChevronDown
} from 'lucide-react';

export default function AdminPage() {
    const { usuario, isAuthenticated } = useAuth();
    const { showToast } = useToast();
    const router = useRouter();
    const [tab, setTab] = useState('dashboard');
    const [stats, setStats] = useState<any>(null);
    const [moderacao, setModeracao] = useState<any>(null);
    const [auditoria, setAuditoria] = useState<any>(null);
    const [usuarios, setUsuarios] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [justificativa, setJustificativa] = useState('');
    const [periodo, setPeriodo] = useState(7);

    useEffect(() => {
        if (!isAuthenticated) { router.push('/login'); return; }
        if (usuario && !['ADMIN', 'MODERADOR', 'ORGAO_SEGURANCA'].includes(usuario.role)) {
            router.push('/');
            return;
        }
        loadData();
    }, [isAuthenticated, tab, periodo]);

    const loadData = async () => {
        setLoading(true);
        try {
            if (tab === 'dashboard') {
                const data = await api.getDashboardStats(periodo);
                setStats(data);
            } else if (tab === 'moderacao') {
                const data = await api.getModerationQueue();
                setModeracao(data);
            } else if (tab === 'auditoria') {
                const data = await api.getAuditLogs();
                setAuditoria(data);
            } else if (tab === 'usuarios') {
                const data = await api.getUsers();
                setUsuarios(data);
            }
        } catch (err: any) {
            if (err.message.includes('permissão')) {
                showToast('Sem permissão para acessar este recurso', 'error');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleModeration = async (incidenteId: number, acao: string) => {
        if (justificativa.length < 30) {
            showToast('A justificativa deve ter no mínimo 30 caracteres', 'error');
            return;
        }
        try {
            await api.moderateAction(incidenteId, acao, justificativa);
            showToast(`Ação "${acao}" realizada com sucesso`, 'success');
            setJustificativa('');
            loadData();
        } catch (err: any) {
            showToast(err.message, 'error');
        }
    };

    const handleRoleChange = async (userId: number, role: string) => {
        try {
            await api.changeUserRole(userId, role);
            showToast('Perfil alterado com sucesso', 'success');
            loadData();
        } catch (err: any) {
            showToast(err.message, 'error');
        }
    };

    const exportData = async (formato: string) => {
        try {
            const data = await api.exportDashboard(formato, periodo);
            if (formato === 'json') {
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url; a.download = 'dados_seguranca.json'; a.click();
            }
            showToast('Dados exportados!', 'success');
        } catch { }
    };

    if (!isAuthenticated || !usuario || !['ADMIN', 'MODERADOR', 'ORGAO_SEGURANCA'].includes(usuario.role)) return null;

    const containerStyle: React.CSSProperties = { minHeight: '100vh', background: 'var(--bg-primary)', padding: '80px 20px 40px' };
    const cardStyle: React.CSSProperties = { background: 'var(--bg-surface)', borderRadius: 16, border: '1px solid var(--glass-border)', padding: 24, boxShadow: 'var(--shadow-sm)' };

    const tabs = [
        { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
        { id: 'moderacao', label: 'Moderação', icon: Shield },
        { id: 'auditoria', label: 'Auditoria', icon: FileSearch, adminOnly: true },
        { id: 'usuarios', label: 'Usuários', icon: Users, adminOnly: true },
    ];

    const visibleTabs = tabs.filter(t => !t.adminOnly || usuario.role === 'ADMIN');

    return (
        <div style={containerStyle}>
            <div style={{ maxWidth: 1000, margin: '0 auto' }}>
                <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 20, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Shield size={24} color="var(--primary-color)" /> Painel Administrativo
                </h1>

                {/* Tabs */}
                <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: 'var(--bg-surface)', borderRadius: 12, padding: 4, border: '1px solid var(--glass-border)', overflowX: 'auto' }}>
                    {visibleTabs.map(t => (
                        <button key={t.id} onClick={() => setTab(t.id)}
                            style={{ flex: 1, padding: '10px 16px', borderRadius: 10, fontSize: 13, fontWeight: tab === t.id ? 600 : 400, background: tab === t.id ? 'var(--primary-color)' : 'transparent', color: tab === t.id ? 'white' : 'var(--text-secondary)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, whiteSpace: 'nowrap' }}>
                            <t.icon size={16} /> {t.label}
                        </button>
                    ))}
                </div>

                {/* Dashboard */}
                {tab === 'dashboard' && stats && (
                    <>
                        {/* Period selector */}
                        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                            {[7, 14, 30, 90].map(p => (
                                <button key={p} onClick={() => setPeriodo(p)}
                                    style={{ padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, background: periodo === p ? 'var(--primary-color)' : 'var(--bg-surface)', color: periodo === p ? 'white' : 'var(--text-secondary)', border: '1px solid var(--glass-border)', cursor: 'pointer' }}>
                                    {p}d
                                </button>
                            ))}
                            <button onClick={() => exportData('json')}
                                style={{ marginLeft: 'auto', padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 500, background: 'rgba(59,130,246,0.1)', color: 'var(--primary-color)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                                <Download size={14} /> Exportar
                            </button>
                        </div>

                        {/* Summary Cards */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 20 }}>
                            {[
                                { label: 'Usuários Ativos', value: stats.resumo.totalUsuarios, color: '#3b82f6', emoji: '👥' },
                                { label: 'Incidentes Ativos', value: stats.resumo.totalIncidentes, color: '#f59e0b', emoji: '📍' },
                                { label: 'No Período', value: stats.resumo.incidentesPeriodo, color: '#ef4444', emoji: '🔥' },
                                { label: 'Pendentes Moderação', value: stats.resumo.pendentesModeracao, color: '#8b5cf6', emoji: '⏳' },
                            ].map(s => (
                                <div key={s.label} style={{
                                    ...cardStyle, display: 'flex', alignItems: 'center', gap: 14,
                                }}>
                                    <span style={{ fontSize: 28 }}>{s.emoji}</span>
                                    <div>
                                        <div style={{ fontSize: 28, fontWeight: 700, color: s.color }}>{s.value}</div>
                                        <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{s.label}</div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Distribution */}
                        <div style={{ ...cardStyle, marginBottom: 20 }}>
                            <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 600 }}>Distribuição por Categoria</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {Object.entries(stats.distribuicao).map(([cat, count]: any) => {
                                    const total = Object.values(stats.distribuicao).reduce((a: any, b: any) => a + b, 0) as number;
                                    const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                                    return (
                                        <div key={cat}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                                <span style={{ fontSize: 13, fontWeight: 500 }}>{cat}</span>
                                                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{count} ({pct}%)</span>
                                            </div>
                                            <div style={{ height: 8, background: 'var(--bg-primary)', borderRadius: 4, overflow: 'hidden' }}>
                                                <div style={{
                                                    width: `${pct}%`,
                                                    height: '100%',
                                                    background: cat.includes('Assalto') ? '#ef4444' : cat.includes('Furto') ? '#f59e0b' : '#3b82f6',
                                                    borderRadius: 4,
                                                    transition: 'width 0.5s',
                                                }} />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Time Series */}
                        <div style={cardStyle}>
                            <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 600 }}>Série Temporal</h3>
                            <div style={{ display: 'flex', gap: 4, alignItems: 'flex-end', height: 120 }}>
                                {Object.entries(stats.serieTemporal).slice(-14).map(([dia, count]: any) => {
                                    const maxCount = Math.max(...Object.values(stats.serieTemporal) as number[], 1);
                                    const height = (count / maxCount) * 100;
                                    return (
                                        <div key={dia} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                                            <div style={{
                                                width: '100%',
                                                height: `${Math.max(height, 4)}%`,
                                                background: 'linear-gradient(180deg, #3b82f6, #8b5cf6)',
                                                borderRadius: '4px 4px 0 0',
                                                minHeight: 4,
                                                transition: 'height 0.3s',
                                            }} />
                                            <span style={{ fontSize: 9, color: 'var(--text-secondary)', transform: 'rotate(-45deg)', whiteSpace: 'nowrap' }}>
                                                {dia.slice(5)}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </>
                )}

                {/* Moderation */}
                {tab === 'moderacao' && moderacao && (
                    <div style={cardStyle}>
                        <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 600 }}>
                            Fila de Moderação ({moderacao.totalPendentes} pendentes)
                        </h3>
                        {moderacao.fila.length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                {moderacao.fila.map((item: any) => (
                                    <div key={item.incidente.id} style={{
                                        padding: 16, borderRadius: 12, background: 'var(--bg-primary)',
                                        border: '1px solid var(--glass-border)',
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                            <div>
                                                <span style={{ fontWeight: 600, fontSize: 15 }}>{item.incidente.titulo}</span>
                                                <span style={{ fontSize: 12, color: 'var(--text-secondary)', marginLeft: 8 }}>
                                                    por {item.incidente.autor.pseudonimo}
                                                </span>
                                            </div>
                                            <span style={{
                                                padding: '4px 10px', borderRadius: 'var(--radius-full)',
                                                fontSize: 11, fontWeight: 700,
                                                background: 'rgba(239,68,68,0.1)', color: '#ef4444'
                                            }}>
                                                {item.totalDenuncias} denúncias
                                            </span>
                                        </div>
                                        <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 12px' }}>
                                            {item.incidente.descricao}
                                        </p>
                                        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 12 }}>
                                            Categoria: {item.incidente.categoria} |
                                            Autor Rep: {item.incidente.autor.pontuacao} pts ({item.incidente.autor.role})
                                        </div>
                                        {/* Moderation Actions */}
                                        <textarea
                                            placeholder="Justificativa da ação (mín. 30 caracteres)..."
                                            value={justificativa}
                                            onChange={e => setJustificativa(e.target.value)}
                                            style={{ width: '100%', padding: 10, background: 'var(--bg-surface)', border: '1px solid var(--glass-border)', borderRadius: 8, color: 'var(--text-primary)', fontSize: 13, outline: 'none', resize: 'vertical', minHeight: 60, fontFamily: 'inherit', marginBottom: 8 }}
                                        />
                                        <div style={{ display: 'flex', gap: 8 }}>
                                            <button onClick={() => handleModeration(item.incidente.id, 'APROVAR')}
                                                style={{ flex: 1, padding: 10, borderRadius: 8, background: 'rgba(16,185,129,0.1)', color: '#10b981', fontWeight: 600, fontSize: 13, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                                                <CheckCircle size={14} /> Aprovar
                                            </button>
                                            <button onClick={() => handleModeration(item.incidente.id, 'QUARENTENA')}
                                                style={{ flex: 1, padding: 10, borderRadius: 8, background: 'rgba(245,158,11,0.1)', color: '#f59e0b', fontWeight: 600, fontSize: 13, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                                                <AlertTriangle size={14} /> Quarentena
                                            </button>
                                            <button onClick={() => handleModeration(item.incidente.id, 'RECUSAR')}
                                                style={{ flex: 1, padding: 10, borderRadius: 8, background: 'rgba(239,68,68,0.1)', color: '#ef4444', fontWeight: 600, fontSize: 13, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                                                <XCircle size={14} /> Rejeitar (Fake)
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-secondary)' }}>
                                <CheckCircle size={32} style={{ marginBottom: 12, opacity: 0.5 }} />
                                <p>Sem itens para moderação</p>
                            </div>
                        )}
                    </div>
                )}

                {/* Audit Logs */}
                {tab === 'auditoria' && auditoria && (
                    <div style={cardStyle}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>
                                Log de Auditoria ({auditoria.total} registros)
                            </h3>
                            <button onClick={() => exportData('json')}
                                style={{ padding: '6px 12px', borderRadius: 8, background: 'rgba(59,130,246,0.1)', color: 'var(--primary-color)', fontSize: 12, fontWeight: 500, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                                <Download size={14} /> Exportar
                            </button>
                        </div>
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                                <thead>
                                    <tr>
                                        {['Data', 'Usuário', 'Ação', 'Módulo', 'IP'].map(h => (
                                            <th key={h} style={{ textAlign: 'left', padding: '10px 12px', borderBottom: '2px solid var(--glass-border)', color: 'var(--text-secondary)', fontWeight: 600, fontSize: 11, textTransform: 'uppercase' }}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {auditoria.logs.map((log: any) => (
                                        <tr key={log.id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                                            <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>{new Date(log.criadoEm).toLocaleString('pt-BR')}</td>
                                            <td style={{ padding: '10px 12px' }}>{log.nomeUsuario || '-'}</td>
                                            <td style={{ padding: '10px 12px' }}>
                                                <span style={{
                                                    padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600,
                                                    background: log.acao.includes('FALHA') ? 'rgba(239,68,68,0.1)' : 'rgba(59,130,246,0.1)',
                                                    color: log.acao.includes('FALHA') ? '#ef4444' : 'var(--primary-color)',
                                                }}>{log.acao}</span>
                                            </td>
                                            <td style={{ padding: '10px 12px' }}>{log.modulo}</td>
                                            <td style={{ padding: '10px 12px', color: 'var(--text-secondary)' }}>{log.ipOrigem || '-'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Users Management */}
                {tab === 'usuarios' && usuarios && (
                    <div style={cardStyle}>
                        <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 600 }}>
                            Gestão de Usuários ({usuarios.total} registros)
                        </h3>
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                                <thead>
                                    <tr>
                                        {['Pseudônimo', 'E-mail', 'Nível', 'Pontos', 'Perfil', 'Status', 'Ações'].map(h => (
                                            <th key={h} style={{ textAlign: 'left', padding: '10px 12px', borderBottom: '2px solid var(--glass-border)', color: 'var(--text-secondary)', fontWeight: 600, fontSize: 11, textTransform: 'uppercase' }}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {usuarios.usuarios.map((u: any) => (
                                        <tr key={u.id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                                            <td style={{ padding: '10px 12px', fontWeight: 600 }}>{u.pseudonimo}</td>
                                            <td style={{ padding: '10px 12px', color: 'var(--text-secondary)' }}>{u.email}</td>
                                            <td style={{ padding: '10px 12px' }}>{u.nivel}</td>
                                            <td style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--primary-color)' }}>{u.pontuacao}</td>
                                            <td style={{ padding: '10px 12px' }}>
                                                {usuario.role === 'ADMIN' && u.id !== usuario.id ? (
                                                    <select value={u.role}
                                                        onChange={e => handleRoleChange(u.id, e.target.value)}
                                                        style={{ padding: '4px 8px', borderRadius: 6, background: 'var(--bg-primary)', border: '1px solid var(--glass-border)', color: 'var(--text-primary)', fontSize: 12, cursor: 'pointer' }}>
                                                        {['MEMBRO', 'MODERADOR', 'ADMIN', 'ORGAO_SEGURANCA'].map(r => (
                                                            <option key={r} value={r}>{r}</option>
                                                        ))}
                                                    </select>
                                                ) : (
                                                    <span style={{ fontSize: 12, padding: '2px 8px', borderRadius: 4, background: 'rgba(139,92,246,0.1)', color: '#8b5cf6' }}>{u.role}</span>
                                                )}
                                            </td>
                                            <td style={{ padding: '10px 12px' }}>
                                                <span style={{
                                                    padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600,
                                                    background: u.status === 'ATIVO' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                                                    color: u.status === 'ATIVO' ? '#10b981' : '#ef4444',
                                                }}>{u.status}</span>
                                            </td>
                                            <td style={{ padding: '10px 12px' }}>
                                                {u.id !== usuario.id && u.role !== 'ADMIN' && (
                                                    <button onClick={() => {
                                                        const motivo = prompt('Motivo do banimento (mín 30 caracteres):');
                                                        if (motivo && motivo.length >= 30) {
                                                            api.banUser(u.id, motivo, false).then(() => { showToast('Usuário banido', 'success'); loadData(); }).catch((e: any) => showToast(e.message, 'error'));
                                                        }
                                                    }}
                                                        style={{ padding: '4px 10px', borderRadius: 6, background: 'rgba(239,68,68,0.1)', color: '#ef4444', fontSize: 11, fontWeight: 600, border: 'none', cursor: 'pointer' }}>
                                                        Banir
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
