"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { useRouter } from 'next/navigation';
import api from '@/services/api';
import {
    Bell, BellOff, CheckCheck, MapPin, Trash2, Plus,
    ToggleLeft, ToggleRight, Navigation
} from 'lucide-react';

export default function NotificacoesPage() {
    const { isAuthenticated } = useAuth();
    const { showToast } = useToast();
    const router = useRouter();
    const [tab, setTab] = useState<'alertas' | 'zonas'>('alertas');
    const [notificacoes, setNotificacoes] = useState<any[]>([]);
    const [naoLidas, setNaoLidas] = useState(0);
    const [zonas, setZonas] = useState<any[]>([]);
    const [showAddZone, setShowAddZone] = useState(false);
    const [newZone, setNewZone] = useState({ nome: '', latitude: '-7.11532', longitude: '-34.86105', raio: '500' });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!isAuthenticated) { router.push('/login'); return; }
        loadData();
    }, [isAuthenticated, tab]);

    const loadData = async () => {
        setLoading(true);
        try {
            if (tab === 'alertas') {
                const data = await api.getNotifications();
                setNotificacoes(data.notificacoes);
                setNaoLidas(data.naoLidas);
            } else {
                const data = await api.getZones();
                setZonas(data);
            }
        } catch (err: any) {
            showToast(err.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const markAllRead = async () => {
        try {
            await api.markAllRead();
            setNotificacoes(prev => prev.map(n => ({ ...n, lida: true })));
            setNaoLidas(0);
            showToast('Todas marcadas como lidas', 'success');
        } catch { }
    };

    const addZone = async () => {
        try {
            await api.createZone(newZone);
            showToast('Zona de interesse criada!', 'success');
            setShowAddZone(false);
            setNewZone({ nome: '', latitude: '-7.11532', longitude: '-34.86105', raio: '500' });
            loadData();
        } catch (err: any) {
            showToast(err.message, 'error');
        }
    };

    const toggleZone = async (id: number) => {
        try {
            await api.toggleZone(id);
            loadData();
        } catch { }
    };

    const deleteZone = async (id: number) => {
        try {
            await api.deleteZone(id);
            showToast('Zona removida', 'info');
            loadData();
        } catch { }
    };

    const containerStyle: React.CSSProperties = {
        minHeight: '100vh', background: 'var(--bg-primary)', padding: '80px 20px 40px',
    };
    const cardStyle: React.CSSProperties = {
        background: 'var(--bg-surface)', borderRadius: 16, border: '1px solid var(--glass-border)', padding: 24, boxShadow: 'var(--shadow-sm)',
    };

    return (
        <div style={containerStyle}>
            <div style={{ maxWidth: 700, margin: '0 auto' }}>
                <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 20, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Bell size={24} color="var(--primary-color)" /> Alertas e Notificações
                </h1>

                {/* Tabs */}
                <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: 'var(--bg-surface)', borderRadius: 12, padding: 4, border: '1px solid var(--glass-border)' }}>
                    <button onClick={() => setTab('alertas')}
                        style={{ flex: 1, padding: '10px', borderRadius: 10, fontSize: 14, fontWeight: tab === 'alertas' ? 600 : 400, background: tab === 'alertas' ? 'var(--primary-color)' : 'transparent', color: tab === 'alertas' ? 'white' : 'var(--text-secondary)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                        <Bell size={16} /> Alertas {naoLidas > 0 && <span style={{ background: 'white', color: 'var(--primary-color)', padding: '1px 6px', borderRadius: 10, fontSize: 11, fontWeight: 700 }}>{naoLidas}</span>}
                    </button>
                    <button onClick={() => setTab('zonas')}
                        style={{ flex: 1, padding: '10px', borderRadius: 10, fontSize: 14, fontWeight: tab === 'zonas' ? 600 : 400, background: tab === 'zonas' ? 'var(--primary-color)' : 'transparent', color: tab === 'zonas' ? 'white' : 'var(--text-secondary)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                        <Navigation size={16} /> Zonas Monitoradas ({zonas.length}/3)
                    </button>
                </div>

                {tab === 'alertas' && (
                    <div style={cardStyle}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Notificações Recentes</h2>
                            {naoLidas > 0 && (
                                <button onClick={markAllRead}
                                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, background: 'rgba(59,130,246,0.1)', color: 'var(--primary-color)', fontSize: 12, fontWeight: 500, border: 'none', cursor: 'pointer' }}>
                                    <CheckCheck size={14} /> Marcar todas como lidas
                                </button>
                            )}
                        </div>
                        {notificacoes.length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                {notificacoes.map(n => (
                                    <div key={n.id} style={{
                                        padding: 14, borderRadius: 10,
                                        background: n.lida ? 'var(--bg-primary)' : 'rgba(59,130,246,0.05)',
                                        borderLeft: n.lida ? 'none' : '3px solid var(--primary-color)',
                                        display: 'flex', flexDirection: 'column', gap: 4,
                                        opacity: n.lida ? 0.7 : 1,
                                    }}>
                                        <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>{n.titulo}</div>
                                        <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{n.corpo}</div>
                                        <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                                            {new Date(n.criadoEm).toLocaleString('pt-BR')}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-secondary)' }}>
                                <BellOff size={32} style={{ marginBottom: 12, opacity: 0.5 }} />
                                <p>Nenhuma notificação</p>
                            </div>
                        )}
                    </div>
                )}

                {tab === 'zonas' && (
                    <div style={cardStyle}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Zonas de Interesse</h2>
                            {zonas.length < 3 && (
                                <button onClick={() => setShowAddZone(!showAddZone)}
                                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, background: 'var(--primary-color)', color: 'white', fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer' }}>
                                    <Plus size={14} /> Nova Zona
                                </button>
                            )}
                        </div>
                        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
                            Registre até 3 áreas fixas (Casa, Trabalho, Escola) para receber alertas de segurança.
                        </p>

                        {showAddZone && (
                            <div style={{ padding: 16, background: 'var(--bg-primary)', borderRadius: 12, marginBottom: 16, border: '1px solid var(--glass-border)' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 10 }}>
                                    <input placeholder="Nome da Zona (ex: Minha Casa)" value={newZone.nome}
                                        onChange={e => setNewZone(p => ({ ...p, nome: e.target.value }))} maxLength={20}
                                        style={{ padding: 10, background: 'var(--bg-surface)', border: '1px solid var(--glass-border)', borderRadius: 8, color: 'var(--text-primary)', fontSize: 13, outline: 'none' }} />
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                        <input placeholder="Latitude" value={newZone.latitude}
                                            onChange={e => setNewZone(p => ({ ...p, latitude: e.target.value }))}
                                            style={{ padding: 10, background: 'var(--bg-surface)', border: '1px solid var(--glass-border)', borderRadius: 8, color: 'var(--text-primary)', fontSize: 13, outline: 'none' }} />
                                        <input placeholder="Longitude" value={newZone.longitude}
                                            onChange={e => setNewZone(p => ({ ...p, longitude: e.target.value }))}
                                            style={{ padding: 10, background: 'var(--bg-surface)', border: '1px solid var(--glass-border)', borderRadius: 8, color: 'var(--text-primary)', fontSize: 13, outline: 'none' }} />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Raio: {newZone.raio}m</label>
                                        <input type="range" min="500" max="5000" step="100" value={newZone.raio}
                                            onChange={e => setNewZone(p => ({ ...p, raio: e.target.value }))}
                                            style={{ width: '100%', accentColor: 'var(--primary-color)' }} />
                                    </div>
                                    <button onClick={addZone}
                                        style={{ padding: 10, background: 'var(--primary-color)', color: 'white', borderRadius: 8, fontWeight: 600, border: 'none', cursor: 'pointer' }}>
                                        Criar Zona
                                    </button>
                                </div>
                            </div>
                        )}

                        {zonas.length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {zonas.map((z: any) => (
                                    <div key={z.id} style={{
                                        padding: 14, borderRadius: 10, background: 'var(--bg-primary)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                        border: '1px solid var(--glass-border)',
                                        opacity: z.ativo ? 1 : 0.5,
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                            <MapPin size={20} color="var(--primary-color)" />
                                            <div>
                                                <div style={{ fontWeight: 600, fontSize: 14 }}>{z.nome}</div>
                                                <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Raio: {z.raio}m</div>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <button onClick={() => toggleZone(z.id)}
                                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: z.ativo ? 'var(--success-color)' : 'var(--text-secondary)' }}>
                                                {z.ativo ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
                                            </button>
                                            <button onClick={() => deleteZone(z.id)}
                                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--critical-color)' }}>
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div style={{ textAlign: 'center', padding: 30, color: 'var(--text-secondary)' }}>
                                <MapPin size={32} style={{ marginBottom: 12, opacity: 0.5 }} />
                                <p>Nenhuma zona cadastrada</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
