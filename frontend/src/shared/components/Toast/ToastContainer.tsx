'use client';

import React from 'react';
import { useToastStore } from '@/shared/lib/toastStore';
import { X, CheckCircle, AlertTriangle, Info, ShieldAlert } from 'lucide-react';
import styles from './Toast.module.css';

export function ToastContainer() {
    const { toasts, removeToast } = useToastStore();

    if (toasts.length === 0) return null;

    return (
        <div className={styles.toastContainer}>
            {toasts.map((toast) => {
                const getIcon = () => {
                    switch (toast.type) {
                        case 'success': return <CheckCircle size={20} />;
                        case 'error': return <ShieldAlert size={20} />;
                        case 'warning': return <AlertTriangle size={20} />;
                        case 'info': return <Info size={20} />;
                    }
                };

                return (
                    <div key={toast.id} className={`${styles.toast} ${styles[toast.type]}`}>
                        <div className={styles.icon}>{getIcon()}</div>
                        <div className={styles.message}>{toast.message}</div>
                        <button className={styles.closeBtn} onClick={() => removeToast(toast.id)}>
                            <X size={16} />
                        </button>
                    </div>
                );
            })}
        </div>
    );
}
