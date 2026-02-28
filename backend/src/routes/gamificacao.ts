import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { autenticar } from '../middleware/auth';
import { calcularNivel } from '../utils/helpers';
import { NIVEIS } from '../utils/constants';

const router = Router();
const prisma = new PrismaClient();

// ═══════════════════════════════════════════════════════════════
// 1.4.2 - Sistema de Reputação e Medalhas
// 1.4.3 - Histórico Pessoal (Extrato)
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/gamificacao/reputacao - Current user reputation details
 */
router.get('/reputacao', autenticar, async (req: Request, res: Response) => {
    try {
        const usuario = await prisma.usuario.findUnique({
            where: { id: req.usuario!.id },
            select: {
                pontuacao: true,
                nivel: true,
                medalhas: {
                    include: { medalha: true },
                    orderBy: { criadoEm: 'desc' },
                },
            },
        });

        if (!usuario) return res.status(404).json({ error: 'Usuário não encontrado.' });

        // CA04: Progress bar to next level
        const nivelAtual = usuario.nivel;
        let proximoNivel = '';
        let pontosParaProximo = 0;
        let progresso = 0;

        if (usuario.pontuacao < NIVEIS.COLABORADOR.min) {
            proximoNivel = NIVEIS.COLABORADOR.nome;
            pontosParaProximo = NIVEIS.COLABORADOR.min - usuario.pontuacao;
            progresso = (usuario.pontuacao / NIVEIS.COLABORADOR.min) * 100;
        } else if (usuario.pontuacao < NIVEIS.SENTINELA.min) {
            proximoNivel = NIVEIS.SENTINELA.nome;
            pontosParaProximo = NIVEIS.SENTINELA.min - usuario.pontuacao;
            progresso = ((usuario.pontuacao - NIVEIS.COLABORADOR.min) / (NIVEIS.SENTINELA.min - NIVEIS.COLABORADOR.min)) * 100;
        } else if (usuario.pontuacao < NIVEIS.GUARDIAO.min) {
            proximoNivel = NIVEIS.GUARDIAO.nome;
            pontosParaProximo = NIVEIS.GUARDIAO.min - usuario.pontuacao;
            progresso = ((usuario.pontuacao - NIVEIS.SENTINELA.min) / (NIVEIS.GUARDIAO.min - NIVEIS.SENTINELA.min)) * 100;
        } else {
            proximoNivel = 'Nível Máximo';
            pontosParaProximo = 0;
            progresso = 100;
        }

        res.json({
            pontuacao: usuario.pontuacao,
            nivel: nivelAtual,
            proximoNivel,
            pontosParaProximo,
            progresso: Math.round(progresso),
            medalhas: usuario.medalhas,
        });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar reputação.' });
    }
});

/**
 * GET /api/gamificacao/ranking - Weekly leaderboard (CA11)
 */
router.get('/ranking', async (req: Request, res: Response) => {
    try {
        const umaSemanaAtras = new Date();
        umaSemanaAtras.setDate(umaSemanaAtras.getDate() - 7);

        // Get top 10 users by reputation score
        const ranking = await prisma.usuario.findMany({
            where: { status: 'ATIVO', deletadoEm: null },
            select: {
                id: true,
                pseudonimo: true,
                pontuacao: true,
                nivel: true,
                fotoPerfil: true,
            },
            orderBy: { pontuacao: 'desc' },
            take: 10,
        });

        res.json(ranking);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar ranking.' });
    }
});

/**
 * GET /api/gamificacao/extrato - Activity history (Feature 1.4.3)
 * CA01: Chronological list of all contributions
 * CA07: Paginated (15 per page)
 */
router.get('/extrato', autenticar, async (req: Request, res: Response) => {
    try {
        const { page = '1', tipo, dataInicio, dataFim } = req.query;
        const pageNum = parseInt(page as string);
        const take = 15;
        const skip = (pageNum - 1) * take;

        // Build filters (CA08)
        const where: any = { usuarioId: req.usuario!.id };

        if (tipo) {
            where.motivo = tipo;
        }
        if (dataInicio) {
            where.criadoEm = { ...where.criadoEm, gte: new Date(dataInicio as string) };
        }
        if (dataFim) {
            where.criadoEm = { ...where.criadoEm, lte: new Date(dataFim as string) };
        }

        const [registros, total] = await Promise.all([
            prisma.logReputacao.findMany({
                where,
                orderBy: { criadoEm: 'desc' },
                take,
                skip,
            }),
            prisma.logReputacao.count({ where }),
        ]);

        // Also get user's incidents for status display (CA05)
        const incidentes = await prisma.incidente.findMany({
            where: { autorId: req.usuario!.id, deletadoEm: null },
            select: { id: true, titulo: true, status: true, criadoEm: true, scoreVeracidade: true },
            orderBy: { criadoEm: 'desc' },
            take,
            skip,
        });

        res.json({
            registros,
            incidentes,
            total,
            pagina: pageNum,
            totalPaginas: Math.ceil(total / take),
        });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar extrato.' });
    }
});

export default router;
