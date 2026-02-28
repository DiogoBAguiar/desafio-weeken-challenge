import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { autenticar } from '../middleware/auth';
import { sanitizar } from '../utils/helpers';

const router = Router();
const prisma = new PrismaClient();

// ═══════════════════════════════════════════════════════════════
// 1.3.2 - Alertas de Zonas de Interesse
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/notificacoes - User notifications
 */
router.get('/', autenticar, async (req: Request, res: Response) => {
    try {
        const { page = '1', limit = '15' } = req.query;
        const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

        const [notificacoes, total] = await Promise.all([
            prisma.notificacao.findMany({
                where: { usuarioId: req.usuario!.id },
                orderBy: { criadoEm: 'desc' },
                take: parseInt(limit as string),
                skip,
            }),
            prisma.notificacao.count({ where: { usuarioId: req.usuario!.id } }),
        ]);

        const naoLidas = await prisma.notificacao.count({
            where: { usuarioId: req.usuario!.id, lida: false },
        });

        res.json({ notificacoes, total, naoLidas });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar notificações.' });
    }
});

/**
 * PUT /api/notificacoes/read-all - Mark all as read
 */
router.put('/read-all', autenticar, async (req: Request, res: Response) => {
    try {
        await prisma.notificacao.updateMany({
            where: { usuarioId: req.usuario!.id, lida: false },
            data: { lida: true },
        });
        res.json({ mensagem: 'Todas as notificações marcadas como lidas.' });
    } catch (error) {
        res.status(500).json({ error: 'Erro.' });
    }
});

/**
 * PUT /api/notificacoes/:id/read - Mark single as read
 */
router.put('/:id/read', autenticar, async (req: Request, res: Response) => {
    try {
        await prisma.notificacao.update({
            where: { id: parseInt(req.params.id) },
            data: { lida: true },
        });
        res.json({ mensagem: 'Notificação lida.' });
    } catch (error) {
        res.status(500).json({ error: 'Erro.' });
    }
});

// ═══════════════════════════════════════════════════════════════
// Zonas de Interesse (1.3.2)
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/notificacoes/zonas - List user zones
 */
router.get('/zonas', autenticar, async (req: Request, res: Response) => {
    try {
        const zonas = await prisma.zonaInteresse.findMany({
            where: { usuarioId: req.usuario!.id },
            orderBy: { criadoEm: 'desc' },
        });
        res.json(zonas);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar zonas.' });
    }
});

/**
 * POST /api/notificacoes/zonas - Create interest zone
 * CA01: Max 3 zones per user
 * CA05: Radius 500m-5000m
 * CA09: Name 3-20 chars, no special chars
 */
router.post('/zonas', autenticar, async (req: Request, res: Response) => {
    try {
        const { nome, latitude, longitude, raio } = req.body;

        // CA01: Max 3 zones
        const count = await prisma.zonaInteresse.count({ where: { usuarioId: req.usuario!.id } });
        if (count >= 3) {
            return res.status(400).json({ error: 'Limite de zonas atingido. Remova uma zona para adicionar uma nova.' });
        }

        // CA09: Name validation
        if (!nome || nome.length < 3 || nome.length > 20) {
            return res.status(400).json({ error: 'O nome da zona deve ter entre 3 e 20 caracteres.' });
        }
        if (/[^a-zA-ZÀ-ú0-9 ]/.test(nome)) {
            return res.status(400).json({ error: 'O nome da zona não pode conter caracteres especiais.' });
        }

        // CA05: Radius validation
        const raioNum = parseInt(raio) || 500;
        if (raioNum < 500 || raioNum > 5000) {
            return res.status(400).json({ error: 'O raio deve ser entre 500 e 5000 metros.' });
        }

        const zona = await prisma.zonaInteresse.create({
            data: {
                usuarioId: req.usuario!.id,
                nome: sanitizar(nome),
                latitude: parseFloat(latitude),
                longitude: parseFloat(longitude),
                raio: raioNum,
            },
        });

        res.status(201).json({ mensagem: 'Zona de interesse criada!', zona });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao criar zona.' });
    }
});

/**
 * PUT /api/notificacoes/zonas/:id - Toggle zone on/off
 */
router.put('/zonas/:id', autenticar, async (req: Request, res: Response) => {
    try {
        const zona = await prisma.zonaInteresse.findFirst({
            where: { id: parseInt(req.params.id), usuarioId: req.usuario!.id },
        });
        if (!zona) return res.status(404).json({ error: 'Zona não encontrada.' });

        const updated = await prisma.zonaInteresse.update({
            where: { id: zona.id },
            data: { ativo: !zona.ativo },
        });

        res.json(updated);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao atualizar zona.' });
    }
});

/**
 * DELETE /api/notificacoes/zonas/:id - Delete zone
 */
router.delete('/zonas/:id', autenticar, async (req: Request, res: Response) => {
    try {
        await prisma.zonaInteresse.deleteMany({
            where: { id: parseInt(req.params.id), usuarioId: req.usuario!.id },
        });
        res.json({ mensagem: 'Zona removida.' });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao remover zona.' });
    }
});

export default router;
