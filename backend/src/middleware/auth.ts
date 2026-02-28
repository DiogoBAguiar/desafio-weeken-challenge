import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { JWT_SECRET, ROLES } from '../utils/constants';

const prisma = new PrismaClient();

// Extend Express Request
declare global {
    namespace Express {
        interface Request {
            usuario?: {
                id: number;
                email: string;
                role: string;
                pseudonimo: string;
                pontuacao: number;
                nivel: string;
            };
        }
    }
}

/**
 * Middleware to verify JWT token and attach user to request
 */
export async function autenticar(req: Request, res: Response, next: NextFunction) {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Token de autenticação não fornecido' });
        }

        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET) as any;

        const usuario = await prisma.usuario.findUnique({
            where: { id: decoded.id },
            select: {
                id: true,
                email: true,
                role: true,
                pseudonimo: true,
                pontuacao: true,
                nivel: true,
                status: true,
            },
        });

        if (!usuario) {
            return res.status(401).json({ error: 'Usuário não encontrado' });
        }

        if (usuario.status === 'BANIDO' || usuario.status === 'SUSPENSO') {
            return res.status(403).json({ error: 'Conta suspensa ou banida' });
        }

        req.usuario = usuario;
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Token inválido ou expirado' });
    }
}

/**
 * Optional auth - doesn't fail if no token, just doesn't set user
 */
export async function autenticarOpcional(req: Request, res: Response, next: NextFunction) {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return next();
        }

        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET) as any;

        const usuario = await prisma.usuario.findUnique({
            where: { id: decoded.id },
            select: {
                id: true,
                email: true,
                role: true,
                pseudonimo: true,
                pontuacao: true,
                nivel: true,
                status: true,
            },
        });

        if (usuario && usuario.status === 'ATIVO') {
            req.usuario = usuario;
        }
    } catch (error) {
        // Ignore token errors for optional auth
    }
    next();
}

/**
 * Role-based access control middleware
 */
export function autorizar(...rolesPermitidos: string[]) {
    return (req: Request, res: Response, next: NextFunction) => {
        if (!req.usuario) {
            return res.status(401).json({ error: 'Não autenticado' });
        }

        if (!rolesPermitidos.includes(req.usuario.role)) {
            return res.status(403).json({ error: 'Sem permissão para acessar este recurso' });
        }

        next();
    };
}

/**
 * Middleware for minimum reputation level
 */
export function reputacaoMinima(nivelMinimo: string) {
    const niveis: { [key: string]: number } = {
        'Iniciante': 0,
        'Colaborador': 101,
        'Sentinela': 501,
        'Guardião da Comunidade': 1501,
    };

    return (req: Request, res: Response, next: NextFunction) => {
        if (!req.usuario) {
            return res.status(401).json({ error: 'Não autenticado' });
        }

        const pontuacaoNecessaria = niveis[nivelMinimo] || 0;
        if (req.usuario.pontuacao < pontuacaoNecessaria) {
            return res.status(403).json({
                error: `Reputação insuficiente. Necessário nível "${nivelMinimo}" (${pontuacaoNecessaria} pontos).`,
            });
        }

        next();
    };
}
