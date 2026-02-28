"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
    Map, LogIn, LogOut, User, Bell, Shield, BarChart3,
    Award, ChevronLeft, ChevronRight, Home, FileText,
    Settings, Menu, X
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import api from '@/services/api';

export default function Sidebar() {
    const { usuario, isAuthenticated, logout } = useAuth();
    const [collapsed, setCollapsed] = useState(true);
    const [unread, setUnread] = useState(0);
    const pathname = usePathname();

    useEffect(() => {
        if (isAuthenticated) {
            api.getNotifications().then(data => setUnread(data.naoLidas || 0)).catch(() => { });
        }
    }, [isAuthenticated, pathname]);

    const navItems = [
        { href: '/', icon: Map, label: 'Mapa', public: true },
        { href: '/login', icon: LogIn, label: 'Entrar', public: true, hideWhenAuth: true },
        { href: '/perfil', icon: User, label: 'Perfil', requireAuth: true },
        { href: '/notificacoes', icon: Bell, label: 'Alertas', requireAuth: true, badge: unread },
        { href: '/perfil?tab=extrato', icon: FileText, label: 'Extrato', requireAuth: true },
        { href: '/perfil?tab=ranking', icon: Award, label: 'Ranking', requireAuth: true },
        { href: '/admin', icon: BarChart3, label: 'Admin', requireRole: ['ADMIN', 'ORGAO_SEGURANCA', 'MODERADOR'] },
    ];

    const filteredItems = navItems.filter(item => {
        if (item.hideWhenAuth && isAuthenticated) return false;
        if (item.requireAuth && !isAuthenticated) return false;
        if (item.requireRole && (!usuario || !item.requireRole.includes(usuario.role))) return false;
        return true;
    });

    return (
        <>
            {/* Mobile toggle */}
            <button
                onClick={() => setCollapsed(!collapsed)}
                style={{
                    position: 'fixed',
                    top: 16,
                    left: 16,
                    zIndex: 2001,
                    background: 'var(--glass-bg)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid var(--glass-border)',
                    borderRadius: 'var(--radius-full)',
                    width: 44,
                    height: 44,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: 'var(--shadow-md)',
                    color: 'var(--text-primary)',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                }}
            >
                {collapsed ? <Menu size={20} /> : <X size={20} />}
            </button>

            {/* Overlay (mobile) */}
            {!collapsed && (
                <div
                    onClick={() => setCollapsed(true)}
                    style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(0,0,0,0.4)',
                        zIndex: 1999,
                        backdropFilter: 'blur(2px)',
                    }}
                />
            )}

            {/* Sidebar */}
            <nav style={{
                position: 'fixed',
                top: 0,
                left: collapsed ? -280 : 0,
                width: 280,
                height: '100vh',
                background: 'var(--bg-surface)',
                borderRight: '1px solid var(--glass-border)',
                zIndex: 2000,
                display: 'flex',
                flexDirection: 'column',
                transition: 'left 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: collapsed ? 'none' : '4px 0 24px rgba(0,0,0,0.15)',
            }}>
                {/* Header */}
                <div style={{
                    padding: '24px 20px',
                    borderBottom: '1px solid var(--glass-border)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                }}>
                    <div style={{
                        width: 36,
                        height: 36,
                        background: 'linear-gradient(135deg, var(--primary-color), #8b5cf6)',
                        borderRadius: 10,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}>
                        <Shield size={20} color="white" />
                    </div>
                    <div>
                        <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-primary)' }}>
                            Comunidade Segura
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                            Mapeamento colaborativo
                        </div>
                    </div>
                </div>

                {/* User Card (if authenticated) */}
                {isAuthenticated && usuario && (
                    <div style={{
                        padding: '16px 20px',
                        borderBottom: '1px solid var(--glass-border)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                    }}>
                        <div style={{
                            width: 40,
                            height: 40,
                            borderRadius: 'var(--radius-full)',
                            background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            fontWeight: 700,
                            fontSize: 16,
                        }}>
                            {usuario.pseudonimo.charAt(0).toUpperCase()}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {usuario.pseudonimo}
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                <span>{usuario.nivel}</span>
                                <span style={{
                                    background: 'rgba(59,130,246,0.1)',
                                    color: 'var(--primary-color)',
                                    padding: '1px 6px',
                                    borderRadius: 'var(--radius-full)',
                                    fontWeight: 600,
                                }}>
                                    {usuario.pontuacao} pts
                                </span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Navigation */}
                <div style={{ flex: 1, padding: '12px 8px', overflow: 'auto' }}>
                    {filteredItems.map(item => {
                        const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href.split('?')[0]));
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => setCollapsed(true)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 12,
                                    padding: '12px 16px',
                                    borderRadius: 'var(--radius-md)',
                                    color: isActive ? 'var(--primary-color)' : 'var(--text-primary)',
                                    background: isActive ? 'rgba(59,130,246,0.1)' : 'transparent',
                                    fontWeight: isActive ? 600 : 400,
                                    fontSize: 14,
                                    textDecoration: 'none',
                                    transition: 'all 0.15s ease',
                                    position: 'relative',
                                }}
                            >
                                <item.icon size={20} />
                                <span>{item.label}</span>
                                {item.badge !== undefined && item.badge > 0 && (
                                    <span style={{
                                        marginLeft: 'auto',
                                        background: 'var(--critical-color)',
                                        color: 'white',
                                        fontSize: 11,
                                        fontWeight: 700,
                                        padding: '2px 8px',
                                        borderRadius: 'var(--radius-full)',
                                        minWidth: 20,
                                        textAlign: 'center',
                                    }}>
                                        {item.badge}
                                    </span>
                                )}
                            </Link>
                        );
                    })}
                </div>

                {/* Logout */}
                {isAuthenticated && (
                    <div style={{ padding: '12px 8px', borderTop: '1px solid var(--glass-border)' }}>
                        <button
                            onClick={async () => {
                                await logout();
                                setCollapsed(true);
                                window.location.href = '/';
                            }}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 12,
                                padding: '12px 16px',
                                width: '100%',
                                borderRadius: 'var(--radius-md)',
                                color: 'var(--critical-color)',
                                fontSize: 14,
                                fontWeight: 500,
                                transition: 'all 0.15s ease',
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                            }}
                        >
                            <LogOut size={20} />
                            <span>Sair</span>
                        </button>
                    </div>
                )}
            </nav>
        </>
    );
}
