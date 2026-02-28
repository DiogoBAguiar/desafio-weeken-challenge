"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '@/services/api';

interface Usuario {
    id: number;
    nomeCompleto: string;
    pseudonimo: string;
    email: string;
    role: string;
    pontuacao: number;
    nivel: string;
    fotoPerfil?: string;
    miniBio?: string;
}

interface AuthContextType {
    usuario: Usuario | null;
    loading: boolean;
    isAuthenticated: boolean;
    login: (email: string, senha: string) => Promise<void>;
    register: (dados: any) => Promise<void>;
    logout: () => Promise<void>;
    updateUser: (data: Partial<Usuario>) => void;
}

const AuthContext = createContext<AuthContextType>({
    usuario: null,
    loading: true,
    isAuthenticated: false,
    login: async () => { },
    register: async () => { },
    logout: async () => { },
    updateUser: () => { },
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [usuario, setUsuario] = useState<Usuario | null>(null);
    const [loading, setLoading] = useState(true);

    const loadUser = useCallback(async () => {
        try {
            const token = typeof window !== 'undefined' ? localStorage.getItem('cs_token') : null;
            if (!token) {
                setLoading(false);
                return;
            }
            const user = await api.getMe();
            setUsuario(user);
        } catch {
            localStorage.removeItem('cs_token');
            api.setToken(null);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadUser();
    }, [loadUser]);

    const login = async (email: string, senha: string) => {
        const res = await api.login(email, senha);
        setUsuario(res.usuario);
    };

    const register = async (dados: any) => {
        const res = await api.register(dados);
        setUsuario(res.usuario);
    };

    const logout = async () => {
        await api.logout();
        setUsuario(null);
    };

    const updateUser = (data: Partial<Usuario>) => {
        if (usuario) {
            setUsuario({ ...usuario, ...data });
        }
    };

    return (
        <AuthContext.Provider value={{
            usuario,
            loading,
            isAuthenticated: !!usuario,
            login,
            register,
            logout,
            updateUser,
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
export default AuthContext;
