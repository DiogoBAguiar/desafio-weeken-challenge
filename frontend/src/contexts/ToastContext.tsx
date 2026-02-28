"use client";

import React, { createContext, useContext, useState, useCallback } from 'react';

interface Toast {
    id: string;
    message: string;
    type: 'success' | 'error' | 'info' | 'warning';
    points?: number;
}

interface ToastContextType {
    toasts: Toast[];
    showToast: (message: string, type?: Toast['type'], points?: number) => void;
    removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType>({
    toasts: [],
    showToast: () => { },
    removeToast: () => { },
});

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const showToast = useCallback((message: string, type: Toast['type'] = 'info', points?: number) => {
        const id = Math.random().toString(36).substring(7);
        setToasts(prev => [...prev, { id, message, type, points }]);
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 4000);
    }, []);

    const removeToast = useCallback((id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    return (
        <ToastContext.Provider value={{ toasts, showToast, removeToast }}>
            {children}
            {/* Toast Container */}
            <div style={{
                position: 'fixed',
                top: 20,
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 10000,
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                pointerEvents: 'none',
            }}>
                {toasts.map(toast => (
                    <div
                        key={toast.id}
                        onClick={() => removeToast(toast.id)}
                        style={{
                            pointerEvents: 'auto',
                            padding: '12px 20px',
                            borderRadius: 12,
                            fontFamily: 'var(--font-sans)',
                            fontSize: 14,
                            fontWeight: 500,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                            backdropFilter: 'blur(10px)',
                            cursor: 'pointer',
                            animation: 'slideDown 0.3s ease-out',
                            background: toast.type === 'success' ? 'rgba(16,185,129,0.95)' :
                                toast.type === 'error' ? 'rgba(239,68,68,0.95)' :
                                    toast.type === 'warning' ? 'rgba(245,158,11,0.95)' :
                                        'rgba(59,130,246,0.95)',
                            color: 'white',
                        }}
                    >
                        <span>{toast.type === 'success' ? '✅' : toast.type === 'error' ? '❌' : toast.type === 'warning' ? '⚠️' : 'ℹ️'}</span>
                        <span>{toast.message}</span>
                        {toast.points !== undefined && (
                            <span style={{
                                background: 'rgba(255,255,255,0.2)',
                                padding: '2px 8px',
                                borderRadius: 6,
                                fontSize: 12,
                                fontWeight: 700,
                            }}>
                                {toast.points > 0 ? '+' : ''}{toast.points} pts
                            </span>
                        )}
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}

export const useToast = () => useContext(ToastContext);
