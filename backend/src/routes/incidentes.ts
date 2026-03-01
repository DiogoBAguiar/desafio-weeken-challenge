import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { autenticar, autenticarOpcional } from '../middleware/auth';
import { sanitizar, calcularDistanciaKm, aplicarJitter, calcularNivel } from '../utils/helpers';
import {
    MAX_INCIDENTS_PER_HOUR, VERACITY_HIDE_THRESHOLD, VERACITY_VERIFIED_THRESHOLD,
    POINTS, SECURITY_CATEGORIES, CRITICAL_CATEGORIES, VOTE_RADIUS_KM,
    HEATMAP_DAYS, JITTER_RANGE
} from '../utils/constants';

const router = Router();
const prisma = new PrismaClient();

// ═══════════════════════════════════════════════════════════════
// 1.1.1 - Visualização de Marcadores em Tempo Real (Public)
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/incidentes/mapa - Public map data with bounding box
 * CA06: Only return points in current bounding box
 */
router.get('/mapa', autenticarOpcional, async (req: Request, res: Response) => {
    try {
        const { minLat, maxLat, minLng, maxLng, categorias } = req.query;

        if (!minLat || !maxLat || !minLng || !maxLng) {
            return res.status(400).json({ error: 'Bounding box query params são obrigatórios.' });
        }

        const where: any = {
            latitude: { gte: parseFloat(minLat as string), lte: parseFloat(maxLat as string) },
            longitude: { gte: parseFloat(minLng as string), lte: parseFloat(maxLng as string) },
            status: 'ativo',
            deletadoEm: null,
            // CA08 (1.1.1): Hide incidents with veracity <= -5
            scoreVeracidade: { gte: VERACITY_HIDE_THRESHOLD },
        };

        if (categorias) {
            where.categoria = { in: (categorias as string).split(',') };
        }

        const incidentes = await prisma.incidente.findMany({
            where,
            select: {
                id: true,
                titulo: true,
                descricao: true,
                categoria: true,
                tipo: true,
                severidade: true,
                latitude: true,
                longitude: true,
                scoreVeracidade: true,
                verificado: true,
                criadoEm: true,
                autor: {
                    select: {
                        // CA11 (1.1.1): Only show pseudonym, never email/phone
                        pseudonimo: true,
                        nivel: true,
                    },
                },
                _count: {
                    select: { votos: true },
                },
            },
            orderBy: { criadoEm: 'desc' },
            take: 200,
        });

        // CA04 (1.1.1): Mark incidents less than 30 min old as pulsing
        const agora = new Date();
        const resultado = incidentes.map((inc: any) => ({
            ...inc,
            pulsando: CRITICAL_CATEGORIES.includes(inc.categoria) &&
                (agora.getTime() - new Date(inc.criadoEm).getTime()) < 30 * 60 * 1000,
            descricao: inc.descricao ? inc.descricao.substring(0, 100) : '', // CA03: limit to 100 chars
        }));

        res.json(resultado);
    } catch (error) {
        console.error('Map data error:', error);
        res.status(500).json({ error: 'Erro ao buscar dados do mapa.' });
    }
});

// ═══════════════════════════════════════════════════════════════
// 1.1.2 - Mapa de Calor por Densidade (Public)
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/incidentes/heatmap - Heatmap data
 * CA02: Only security categories
 * CA04: Last 30 days
 * CA07: Exclude false/moderation reports
 * CA08: Apply jitter for privacy
 */
router.get('/heatmap', async (req: Request, res: Response) => {
    try {
        const { minLat, maxLat, minLng, maxLng } = req.query;

        if (!minLat || !maxLat || !minLng || !maxLng) {
            return res.status(400).json({ error: 'Bounding box query params são obrigatórios.' });
        }

        const limiteDias = new Date();
        limiteDias.setDate(limiteDias.getDate() - HEATMAP_DAYS);

        const incidentes = await prisma.incidente.findMany({
            where: {
                latitude: { gte: parseFloat(minLat as string), lte: parseFloat(maxLat as string) },
                longitude: { gte: parseFloat(minLng as string), lte: parseFloat(maxLng as string) },
                categoria: { in: SECURITY_CATEGORIES },
                criadoEm: { gte: limiteDias },
                status: 'ativo',
                deletadoEm: null,
                scoreVeracidade: { gte: VERACITY_HIDE_THRESHOLD },
            },
            select: { latitude: true, longitude: true, severidade: true },
        });

        // CA08: Apply jitter to protect privacy
        const heatPoints = incidentes.map((inc: any) => {
            const [lat, lng] = aplicarJitter(inc.latitude, inc.longitude);
            const intensity = inc.severidade === 'CRITICA' || inc.severidade === 'ALTA' ? 1.0 : 0.5;
            return [lat, lng, intensity];
        });

        res.json(heatPoints);
    } catch (error) {
        console.error('Heatmap error:', error);
        res.status(500).json({ error: 'Erro ao gerar mapa de calor.' });
    }
});

// ═══════════════════════════════════════════════════════════════
// 1.2.1 - Registro de Ocorrências (Authenticated)
// ═══════════════════════════════════════════════════════════════

/**
 * POST /api/incidentes - Create new incident
 */
router.post('/', autenticar, async (req: Request, res: Response) => {
    try {
        const { titulo, descricao, categoria, tipo, severidade, latitude, longitude } = req.body;

        // Validate required fields (CA02)
        if (!titulo || !descricao || !categoria || !latitude || !longitude) {
            return res.status(400).json({ error: 'Campos obrigatórios: título, descrição, categoria, latitude, longitude.' });
        }

        // CA04: Description length 20-500
        if (descricao.length < 20 || descricao.length > 500) {
            return res.status(400).json({ error: 'A descrição deve ter entre 20 e 500 caracteres.' });
        }

        // CA08: Anti-spam - max 3 per hour
        const umaHoraAtras = new Date(Date.now() - 60 * 60 * 1000);
        const recentCount = await prisma.incidente.count({
            where: {
                autorId: req.usuario!.id,
                criadoEm: { gte: umaHoraAtras },
            },
        });
        if (recentCount >= MAX_INCIDENTS_PER_HOUR) {
            return res.status(429).json({ error: 'Limite de relatos por hora atingido (máximo 3). Tente novamente mais tarde.' });
        }

        // CA09: Sanitize inputs
        const tituloSeguro = sanitizar(titulo);
        const descricaoSegura = sanitizar(descricao);

        const tipoFinal = tipo || (CRITICAL_CATEGORIES.includes(categoria) ? 'CRITICAL' : 'WARNING');
        const severidadeFinal = severidade || (CRITICAL_CATEGORIES.includes(categoria) ? 'CRITICA' : 'MEDIA');

        // Create incident
        const incidente = await prisma.incidente.create({
            data: {
                titulo: tituloSeguro,
                descricao: descricaoSegura,
                categoria,
                tipo: tipoFinal,
                severidade: severidadeFinal,
                latitude: parseFloat(latitude),
                longitude: parseFloat(longitude),
                autorId: req.usuario!.id,
                ipOrigem: req.ip || req.socket.remoteAddress,
                deviceInfo: req.get('User-Agent'),
            },
            include: {
                autor: { select: { pseudonimo: true, nivel: true } },
            },
        });

        // CA09 (1.2.1): Award reputation points (+10)
        await prisma.usuario.update({
            where: { id: req.usuario!.id },
            data: {
                pontuacao: { increment: POINTS.RELATO_CRIADO },
                nivel: calcularNivel(req.usuario!.pontuacao + POINTS.RELATO_CRIADO),
            },
        });

        // Log reputation change
        await prisma.logReputacao.create({
            data: {
                usuarioId: req.usuario!.id,
                pontos: POINTS.RELATO_CRIADO,
                motivo: 'RELATO_CRIADO',
                referenciaId: incidente.id,
            },
        });

        // CA12: Audit trail
        await prisma.logAuditoria.create({
            data: {
                usuarioId: req.usuario!.id,
                nomeUsuario: req.usuario!.pseudonimo,
                acao: 'CRIAR',
                modulo: 'INCIDENTE',
                detalhes: JSON.stringify({
                    incidenteId: incidente.id,
                    categoria,
                    latitude,
                    longitude,
                }),
                ipOrigem: req.ip || req.socket.remoteAddress,
                userAgent: req.get('User-Agent'),
            },
        });

        // Check if critical - notify nearby users (CA03 of 1.2.1)
        if (CRITICAL_CATEGORIES.includes(categoria)) {
            // Find users with zones or recent positions nearby (simplified for this implementation)
            const zonas = await prisma.zonaInteresse.findMany({
                where: { ativo: true },
                include: { usuario: { select: { id: true } } },
            });

            for (const zona of zonas) {
                const distancia = calcularDistanciaKm(
                    zona.latitude, zona.longitude,
                    parseFloat(latitude), parseFloat(longitude)
                );
                if (distancia <= zona.raio / 1000) {
                    await prisma.notificacao.create({
                        data: {
                            usuarioId: zona.usuario.id,
                            titulo: `⚠️ ALERTA: ${categoria}`,
                            corpo: `Ocorrência a ${Math.round(distancia * 1000)}m da sua zona "${zona.nome}".`,
                            tipo: 'ZONA_INTERESSE',
                            incidenteId: incidente.id,
                        },
                    });
                }
            }
        }

        // CA10: Success message
        res.status(201).json({
            mensagem: 'Relato registrado com sucesso! A comunidade agradece sua colaboração.',
            incidente,
            pontosGanhos: POINTS.RELATO_CRIADO,
        });
    } catch (error) {
        console.error('Create incident error:', error);
        res.status(500).json({ error: 'Erro ao registrar ocorrência.' });
    }
});

/**
 * GET /api/incidentes/:id - Get single incident details
 */
router.get('/:id', autenticarOpcional, async (req: Request, res: Response) => {
    try {
        const incidente = await prisma.incidente.findUnique({
            where: { id: parseInt(req.params.id as string) },
            include: {
                autor: { select: { pseudonimo: true, nivel: true, fotoPerfil: true } },
                votos: {
                    select: { tipo: true, usuarioId: true },
                },
                midias: {
                    where: { deletadoEm: null },
                    select: { id: true, url: true, tipoArquivo: true, thumbnailUrl: true },
                },
                _count: { select: { denuncias: true } },
            },
        });

        if (!incidente || incidente.deletadoEm) {
            return res.status(404).json({ error: 'Incidente não encontrado.' });
        }

        // Calculate vote breakdown
        const confirmacoes = incidente.votos.filter(v => v.tipo === 'CONFIRMAR').length;
        const negacoes = incidente.votos.filter(v => v.tipo === 'NAO_PROCEDE').length;
        const usuarioVotou = req.usuario
            ? incidente.votos.find(v => v.usuarioId === req.usuario!.id)?.tipo || null
            : null;

        res.json({
            ...incidente,
            confirmacoes,
            negacoes,
            usuarioVotou,
            votos: undefined, // Remove raw votes from response
        });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar incidente.' });
    }
});

/**
 * PUT /api/incidentes/:id - Edit incident (CA03-04 of 1.4.3)
 * Only within 15 minutes of creation
 */
router.put('/:id', autenticar, async (req: Request, res: Response) => {
    try {
        const incidente = await prisma.incidente.findUnique({ where: { id: parseInt(req.params.id as string) } });

        if (!incidente) {
            return res.status(404).json({ error: 'Incidente não encontrado.' });
        }

        if (incidente.autorId !== req.usuario!.id) {
            return res.status(403).json({ error: 'Você só pode editar seus próprios relatos.' });
        }

        if (incidente.status !== 'ativo') {
            return res.status(400).json({ error: 'Não é possível editar um relato que não está ativo.' });
        }

        // CA04 (1.4.3): 15-minute edit window
        const minutosDesdeCreacao = (Date.now() - new Date(incidente.criadoEm).getTime()) / 60000;
        if (minutosDesdeCreacao > 15) {
            return res.status(400).json({ error: 'O tempo limite para edição deste relato expirou (15 minutos).' });
        }

        const { titulo, descricao } = req.body;
        const antes = { titulo: incidente.titulo, descricao: incidente.descricao };

        const updated = await prisma.incidente.update({
            where: { id: incidente.id },
            data: {
                titulo: titulo ? sanitizar(titulo) : incidente.titulo,
                descricao: descricao ? sanitizar(descricao) : incidente.descricao,
            },
        });

        // Audit log with before/after
        await prisma.logAuditoria.create({
            data: {
                usuarioId: req.usuario!.id,
                nomeUsuario: req.usuario!.pseudonimo,
                acao: 'EDITAR',
                modulo: 'INCIDENTE',
                detalhes: JSON.stringify({ antes, depois: { titulo: updated.titulo, descricao: updated.descricao } }),
                ipOrigem: req.ip || req.socket.remoteAddress,
                userAgent: req.get('User-Agent'),
            },
        });

        res.json({ mensagem: 'Relato atualizado.', incidente: updated });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao editar relato.' });
    }
});

/**
 * DELETE /api/incidentes/:id - Soft delete / archive (CA06 of 1.4.3)
 */
router.delete('/:id', autenticar, async (req: Request, res: Response) => {
    try {
        const incidente = await prisma.incidente.findUnique({ where: { id: parseInt(req.params.id as string) } });

        if (!incidente) {
            return res.status(404).json({ error: 'Incidente não encontrado.' });
        }

        // Author can archive own, moderators/admins can delete any
        if (incidente.autorId !== req.usuario!.id && !['MODERADOR', 'ADMIN'].includes(req.usuario!.role)) {
            return res.status(403).json({ error: 'Sem permissão.' });
        }

        // Soft delete (CA10 of 1.4.3)
        await prisma.incidente.update({
            where: { id: incidente.id },
            data: {
                deletadoEm: new Date(),
                status: 'arquivado',
            },
        });

        await prisma.logAuditoria.create({
            data: {
                usuarioId: req.usuario!.id,
                nomeUsuario: req.usuario!.pseudonimo,
                acao: 'DELETAR',
                modulo: 'INCIDENTE',
                detalhes: JSON.stringify({ incidenteId: incidente.id }),
                ipOrigem: req.ip || req.socket.remoteAddress,
                userAgent: req.get('User-Agent'),
            },
        });

        res.json({ mensagem: 'Relato arquivado com sucesso.' });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao arquivar relato.' });
    }
});

// ═══════════════════════════════════════════════════════════════
// 1.2.3 - Sistema de Veracidade
// ═══════════════════════════════════════════════════════════════

/**
 * POST /api/incidentes/:id/votar - Vote on incident veracity
 */
router.post('/:id/votar', autenticar, async (req: Request, res: Response) => {
    try {
        const incidenteId = parseInt(req.params.id as string);
        const { tipo, latitude, longitude } = req.body;

        if (!['CONFIRMAR', 'NAO_PROCEDE'].includes(tipo)) {
            return res.status(400).json({ error: 'Tipo de voto inválido.' });
        }

        const incidente = await prisma.incidente.findUnique({ where: { id: incidenteId } });
        if (!incidente) {
            return res.status(404).json({ error: 'Incidente não encontrado.' });
        }

        // CA09: Cannot vote on own report
        if (incidente.autorId === req.usuario!.id) {
            return res.status(403).json({ error: 'Você não pode votar no seu próprio relato.' });
        }

        // CA04: Cannot vote twice
        const votoExistente = await prisma.voto.findUnique({
            where: { incidenteId_usuarioId: { incidenteId, usuarioId: req.usuario!.id } },
        });
        if (votoExistente) {
            return res.status(409).json({ error: 'Você já votou neste incidente.' });
        }

        // CA03: Check proximity (1km radius)
        if (latitude && longitude) {
            const distancia = calcularDistanciaKm(
                incidente.latitude, incidente.longitude,
                parseFloat(latitude), parseFloat(longitude)
            );
            if (distancia > VOTE_RADIUS_KM) {
                return res.status(403).json({ error: `Você precisa estar a menos de ${VOTE_RADIUS_KM}km do local para votar.` });
            }
        }

        // CA09 (1.4.2): Anti-farming check
        const vinteQuatroHAtras = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const votosParaMesmoAutor = await prisma.voto.count({
            where: {
                usuarioId: req.usuario!.id,
                criadoEm: { gte: vinteQuatroHAtras },
                incidente: { autorId: incidente.autorId },
            },
        });
        if (votosParaMesmoAutor >= 2) {
            return res.status(429).json({ error: 'Limite de votos para o mesmo autor atingido nas últimas 24h.' });
        }

        // Create vote
        await prisma.voto.create({
            data: {
                incidenteId,
                usuarioId: req.usuario!.id,
                tipo,
                latitude: latitude ? parseFloat(latitude) : null,
                longitude: longitude ? parseFloat(longitude) : null,
            },
        });

        // Update incident score
        const incremento = tipo === 'CONFIRMAR' ? 1 : -1;
        const updated = await prisma.incidente.update({
            where: { id: incidenteId },
            data: {
                scoreVeracidade: { increment: incremento },
                verificado: tipo === 'CONFIRMAR' && incidente.scoreVeracidade + 1 >= VERACITY_VERIFIED_THRESHOLD,
            },
        });

        // CA10 (1.2.3): Auto-hide if score <= -5
        if (updated.scoreVeracidade <= VERACITY_HIDE_THRESHOLD) {
            await prisma.incidente.update({
                where: { id: incidenteId },
                data: { status: 'moderacao' },
            });
        }

        // CA01-CA02 (1.4.2): Award/penalize reputation for voter
        if (tipo === 'CONFIRMAR') {
            await prisma.usuario.update({
                where: { id: req.usuario!.id },
                data: { pontuacao: { increment: POINTS.CONFIRMACAO_RELATO } },
            });
            await prisma.logReputacao.create({
                data: {
                    usuarioId: req.usuario!.id,
                    pontos: POINTS.CONFIRMACAO_RELATO,
                    motivo: 'CONFIRMACAO_RELATO',
                    referenciaId: incidenteId,
                },
            });
        }

        // Audit trail (CA12)
        await prisma.logAuditoria.create({
            data: {
                usuarioId: req.usuario!.id,
                nomeUsuario: req.usuario!.pseudonimo,
                acao: 'VOTAR',
                modulo: 'VERACIDADE',
                detalhes: JSON.stringify({ incidenteId, tipo, latitude, longitude }),
                ipOrigem: req.ip || req.socket.remoteAddress,
                userAgent: req.get('User-Agent'),
            },
        });

        // CA11 (1.2.3): Confirmation toast message
        res.json({
            mensagem: 'Obrigado! Seu voto ajuda a manter a vizinhança segura.',
            scoreAtual: updated.scoreVeracidade,
            verificado: updated.verificado,
        });
    } catch (error) {
        console.error('Vote error:', error);
        res.status(500).json({ error: 'Erro ao registrar voto.' });
    }
});

export default router;
