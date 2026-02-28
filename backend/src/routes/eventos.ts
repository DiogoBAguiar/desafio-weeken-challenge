import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { autenticar, reputacaoMinima } from '../middleware/auth';
import { sanitizar } from '../utils/helpers';
import { EVENT_CATEGORIES } from '../utils/constants';

const router = Router();
const prisma = new PrismaClient();

// ═══════════════════════════════════════════════════════════════
// 1.2.2 - Registro de Eventos e Ações Comunitárias
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/eventos - List events (public)
 */
router.get('/', async (req: Request, res: Response) => {
    try {
        const { minLat, maxLat, minLng, maxLng } = req.query;

        const where: any = {
            status: 'ativo',
            deletadoEm: null,
        };

        if (minLat && maxLat && minLng && maxLng) {
            where.latitude = { gte: parseFloat(minLat as string), lte: parseFloat(maxLat as string) };
            where.longitude = { gte: parseFloat(minLng as string), lte: parseFloat(maxLng as string) };
        }

        const eventos = await prisma.evento.findMany({
            where,
            include: {
                autor: { select: { pseudonimo: true, nivel: true } },
                _count: { select: { rsvps: true } },
            },
            orderBy: { dataEvento: 'asc' },
        });

        res.json(eventos);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar eventos.' });
    }
});

/**
 * POST /api/eventos - Create event
 * CA01: Requires "Colaborador" level (100+ points)
 */
router.post('/', autenticar, reputacaoMinima('Colaborador'), async (req: Request, res: Response) => {
    try {
        const {
            titulo, descricao, categoriaEvento, latitude, longitude,
            dataEvento, horaInicio, horaFim, necessitaVoluntarios,
            capacidadeMax, linkExterno,
        } = req.body;

        // Validate required fields
        if (!titulo || !descricao || !categoriaEvento || !latitude || !longitude || !dataEvento || !horaInicio || !horaFim) {
            return res.status(400).json({ error: 'Todos os campos obrigatórios devem ser preenchidos.' });
        }

        // CA06: Description 100-1000 chars
        if (descricao.length < 100 || descricao.length > 1000) {
            return res.status(400).json({ error: 'A descrição do evento deve ter entre 100 e 1000 caracteres.' });
        }

        // CA03: Only future dates
        const dataEventoParsed = new Date(dataEvento);
        if (dataEventoParsed < new Date()) {
            return res.status(400).json({ error: 'Não é possível criar eventos com data no passado.' });
        }

        // CA08: Validate category
        if (!EVENT_CATEGORIES.includes(categoriaEvento)) {
            return res.status(400).json({ error: 'Categoria de evento inválida.' });
        }

        // CA11: Check for duplicate event
        const duplicado = await prisma.evento.findFirst({
            where: {
                titulo: sanitizar(titulo),
                latitude: parseFloat(latitude),
                longitude: parseFloat(longitude),
                dataEvento: dataEventoParsed,
                deletadoEm: null,
            },
        });
        if (duplicado) {
            return res.status(409).json({ error: 'Já existe um evento com o mesmo nome, local e data.' });
        }

        const evento = await prisma.evento.create({
            data: {
                titulo: sanitizar(titulo),
                descricao: sanitizar(descricao),
                categoriaEvento,
                latitude: parseFloat(latitude),
                longitude: parseFloat(longitude),
                dataEvento: dataEventoParsed,
                horaInicio,
                horaFim,
                necessitaVoluntarios: necessitaVoluntarios || false,
                capacidadeMax: capacidadeMax ? parseInt(capacidadeMax) : null,
                linkExterno,
                autorId: req.usuario!.id,
            },
            include: {
                autor: { select: { pseudonimo: true } },
            },
        });

        // Audit log
        await prisma.logAuditoria.create({
            data: {
                usuarioId: req.usuario!.id,
                nomeUsuario: req.usuario!.pseudonimo,
                acao: 'CRIAR',
                modulo: 'EVENTO',
                detalhes: JSON.stringify({ eventoId: evento.id, titulo }),
                ipOrigem: req.ip || req.socket.remoteAddress,
                userAgent: req.get('User-Agent'),
            },
        });

        res.status(201).json({ mensagem: 'Evento criado com sucesso!', evento });
    } catch (error) {
        console.error('Create event error:', error);
        res.status(500).json({ error: 'Erro ao criar evento.' });
    }
});

/**
 * POST /api/eventos/:id/rsvp - RSVP to event
 * CA04: "Eu vou" / "Quero ajudar"
 */
router.post('/:id/rsvp', autenticar, async (req: Request, res: Response) => {
    try {
        const eventoId = parseInt(req.params.id);
        const { tipo } = req.body;

        const evento = await prisma.evento.findUnique({
            where: { id: eventoId },
            include: { _count: { select: { rsvps: true } } },
        });

        if (!evento || evento.status !== 'ativo') {
            return res.status(404).json({ error: 'Evento não encontrado ou encerrado.' });
        }

        // CA12: Check capacity
        if (evento.capacidadeMax && evento._count.rsvps >= evento.capacidadeMax) {
            return res.status(400).json({ error: 'Capacidade máxima atingida.' });
        }

        // Check if already RSVP'd
        const existente = await prisma.rsvp.findUnique({
            where: { eventoId_usuarioId: { eventoId, usuarioId: req.usuario!.id } },
        });
        if (existente) {
            return res.status(409).json({ error: 'Você já confirmou presença neste evento.' });
        }

        await prisma.rsvp.create({
            data: {
                eventoId,
                usuarioId: req.usuario!.id,
                tipo: tipo || 'EU_VOU',
            },
        });

        res.json({ mensagem: 'Presença confirmada!' });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao confirmar presença.' });
    }
});

/**
 * PUT /api/eventos/:id - Edit event (author only)
 * CA10: Author can edit/cancel, notifying RSVP'd users
 */
router.put('/:id', autenticar, async (req: Request, res: Response) => {
    try {
        const evento = await prisma.evento.findUnique({ where: { id: parseInt(req.params.id) } });

        if (!evento || evento.autorId !== req.usuario!.id) {
            return res.status(403).json({ error: 'Sem permissão para editar este evento.' });
        }

        const { titulo, descricao, status } = req.body;
        const updated = await prisma.evento.update({
            where: { id: evento.id },
            data: {
                titulo: titulo ? sanitizar(titulo) : evento.titulo,
                descricao: descricao ? sanitizar(descricao) : evento.descricao,
                status: status || evento.status,
            },
        });

        // If cancelled, notify RSVP'd users
        if (status === 'cancelado') {
            const rsvps = await prisma.rsvp.findMany({ where: { eventoId: evento.id } });
            for (const rsvp of rsvps) {
                await prisma.notificacao.create({
                    data: {
                        usuarioId: rsvp.usuarioId,
                        titulo: '❌ Evento Cancelado',
                        corpo: `O evento "${evento.titulo}" foi cancelado pelo organizador.`,
                        tipo: 'SISTEMA',
                    },
                });
            }
        }

        res.json({ mensagem: 'Evento atualizado.', evento: updated });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao atualizar evento.' });
    }
});

export default router;
