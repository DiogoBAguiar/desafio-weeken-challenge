import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { autenticar, autorizar } from '../middleware/auth';
import { ROLES, POINTS, SUSPENSION_THRESHOLD } from '../utils/constants';
import { sanitizar, calcularNivel } from '../utils/helpers';

const router = Router();
const prisma = new PrismaClient();

// ═══════════════════════════════════════════════════════════════
// 1.5.1 - Dashboard de Estatísticas Criminais
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/admin/dashboard/stats - Crime statistics
 * CA01: Only ADMIN or ORGAO_SEGURANCA
 */
router.get('/dashboard/stats', autenticar, autorizar(ROLES.ADMIN, ROLES.ORGAO_SEGURANCA), async (req: Request, res: Response) => {
    try {
        const { periodo = '7', bairro } = req.query;
        const diasAtras = new Date();
        diasAtras.setDate(diasAtras.getDate() - parseInt(periodo as string));

        // CA03: Aggregate crime density
        const incidentes = await prisma.incidente.findMany({
            where: {
                criadoEm: { gte: diasAtras },
                status: 'ativo',
                deletadoEm: null,
            },
            select: {
                id: true,
                categoria: true,
                severidade: true,
                latitude: true,
                longitude: true,
                criadoEm: true,
                // CA07: Anonymized - no user IDs or sensitive descriptions
            },
        });

        // CA08: Category distribution (Pie Chart data)
        const distribuicao: Record<string, number> = {};
        incidentes.forEach(inc => {
            distribuicao[inc.categoria] = (distribuicao[inc.categoria] || 0) + 1;
        });

        // CA04: Time series data (daily counts)
        const serieTemporal: Record<string, number> = {};
        incidentes.forEach(inc => {
            const dia = new Date(inc.criadoEm).toISOString().split('T')[0];
            serieTemporal[dia] = (serieTemporal[dia] || 0) + 1;
        });

        // Total stats
        const totalUsuarios = await prisma.usuario.count({ where: { status: 'ATIVO' } });
        const totalIncidentes = await prisma.incidente.count({ where: { status: 'ativo', deletadoEm: null } });
        const totalEventos = await prisma.evento.count({ where: { status: 'ativo', deletadoEm: null } });
        const pendentesModeracao = await prisma.incidente.count({ where: { status: 'moderacao' } });

        res.json({
            resumo: {
                totalUsuarios,
                totalIncidentes,
                totalEventos,
                pendentesModeracao,
                incidentesPeriodo: incidentes.length,
            },
            distribuicao,
            serieTemporal,
            pontos: incidentes.map(inc => ({
                lat: inc.latitude,
                lng: inc.longitude,
                categoria: inc.categoria,
                severidade: inc.severidade,
            })),
        });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao gerar estatísticas.' });
    }
});

/**
 * GET /api/admin/dashboard/export - Export data as JSON (CA12)
 */
router.get('/dashboard/export', autenticar, autorizar(ROLES.ADMIN, ROLES.ORGAO_SEGURANCA), async (req: Request, res: Response) => {
    try {
        const { formato = 'json', periodo = '30' } = req.query;
        const diasAtras = new Date();
        diasAtras.setDate(diasAtras.getDate() - parseInt(periodo as string));

        const dados = await prisma.incidente.findMany({
            where: {
                criadoEm: { gte: diasAtras },
                deletadoEm: null,
            },
            select: {
                id: true,
                categoria: true,
                severidade: true,
                latitude: true,
                longitude: true,
                criadoEm: true,
                scoreVeracidade: true,
                status: true,
            },
        });

        if (formato === 'csv') {
            const headers = 'id,categoria,severidade,latitude,longitude,criadoEm,scoreVeracidade,status\n';
            const csv = headers + dados.map(d =>
                `${d.id},${d.categoria},${d.severidade},${d.latitude},${d.longitude},${d.criadoEm.toISOString()},${d.scoreVeracidade},${d.status}`
            ).join('\n');
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename=dados_seguranca.csv');
            return res.send(csv);
        }

        res.json(dados);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao exportar dados.' });
    }
});

// ═══════════════════════════════════════════════════════════════
// 1.5.2 - Moderação de Conteúdo e Banimento
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/admin/moderacao - Moderation queue
 * CA02: Ordered by urgency and report count
 */
router.get('/moderacao', autenticar, autorizar(ROLES.ADMIN, ROLES.MODERADOR, ROLES.ORGAO_SEGURANCA), async (req: Request, res: Response) => {
    try {
        const denuncias = await prisma.denuncia.findMany({
            where: { status: 'PENDENTE' },
            include: {
                incidente: {
                    include: {
                        autor: { select: { id: true, pseudonimo: true, pontuacao: true, role: true } },
                        midias: { select: { url: true, tipoArquivo: true } },
                    },
                },
                denunciante: { select: { pseudonimo: true, nivel: true } },
            },
            orderBy: { criadoEm: 'asc' },
        });

        // Group by incident and count
        const agrupados: Record<number, any> = {};
        denuncias.forEach(d => {
            if (!agrupados[d.incidenteId]) {
                agrupados[d.incidenteId] = {
                    incidente: d.incidente,
                    denuncias: [],
                    totalDenuncias: 0,
                };
            }
            agrupados[d.incidenteId].denuncias.push(d);
            agrupados[d.incidenteId].totalDenuncias++;
        });

        // Sort by count (most reported first)
        const lista = Object.values(agrupados).sort((a: any, b: any) => b.totalDenuncias - a.totalDenuncias);

        // CA10: Average response time
        const moderacoes = await prisma.moderacao.findMany({
            select: { criadoEm: true },
            orderBy: { criadoEm: 'desc' },
            take: 100,
        });

        res.json({ fila: lista, totalPendentes: lista.length });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar fila de moderação.' });
    }
});

/**
 * POST /api/admin/moderacao/acao - Take moderation action
 * CA03: Requires justification (min 30 chars)
 */
router.post('/moderacao/acao', autenticar, autorizar(ROLES.ADMIN, ROLES.MODERADOR, ROLES.ORGAO_SEGURANCA), async (req: Request, res: Response) => {
    try {
        const { incidenteId, acao, justificativa } = req.body;

        // CA03: Justification required
        if (!justificativa || justificativa.length < 30) {
            return res.status(400).json({ error: 'A justificativa deve ter no mínimo 30 caracteres.' });
        }

        if (!['APROVAR', 'RECUSAR', 'QUARENTENA'].includes(acao)) {
            return res.status(400).json({ error: 'Ação inválida.' });
        }

        const incidente = await prisma.incidente.findUnique({
            where: { id: incidenteId },
            include: { autor: true },
        });

        if (!incidente) {
            return res.status(404).json({ error: 'Incidente não encontrado.' });
        }

        // CA08: Cannot moderate users with higher role
        if (req.usuario!.role === ROLES.MODERADOR && [ROLES.MODERADOR, ROLES.ADMIN].includes(incidente.autor.role)) {
            return res.status(403).json({ error: 'Sem permissão para moderar usuários do mesmo nível ou superior.' });
        }

        // Process action
        if (acao === 'RECUSAR') {
            // CA04: Fake news - penalize author
            await prisma.incidente.update({
                where: { id: incidenteId },
                data: { status: 'moderacao', deletadoEm: new Date() },
            });

            // Apply penalty to author
            const novaPontuacao = incidente.autor.pontuacao + POINTS.RELATO_FALSO;
            await prisma.usuario.update({
                where: { id: incidente.autorId },
                data: {
                    pontuacao: novaPontuacao,
                    nivel: calcularNivel(novaPontuacao),
                    // CA12 (1.4.2): Auto-suspend if below -50
                    status: novaPontuacao <= SUSPENSION_THRESHOLD ? 'SUSPENSO' : incidente.autor.status,
                },
            });

            await prisma.logReputacao.create({
                data: {
                    usuarioId: incidente.autorId,
                    pontos: POINTS.RELATO_FALSO,
                    motivo: 'RELATO_FALSO',
                    referenciaId: incidenteId,
                },
            });

            // Notify author
            await prisma.notificacao.create({
                data: {
                    usuarioId: incidente.autorId,
                    titulo: '⚠️ Relato Recusado pela Moderação',
                    corpo: `Seu relato "${incidente.titulo}" foi marcado como falso. -${Math.abs(POINTS.RELATO_FALSO)} pontos de reputação.`,
                    tipo: 'MODERACAO',
                    incidenteId,
                },
            });
        } else if (acao === 'APROVAR') {
            await prisma.incidente.update({
                where: { id: incidenteId },
                data: { status: 'ativo' },
            });
        } else if (acao === 'QUARENTENA') {
            // CA07: Quarantine
            await prisma.incidente.update({
                where: { id: incidenteId },
                data: { status: 'moderacao' },
            });
        }

        // Update denuncias
        await prisma.denuncia.updateMany({
            where: { incidenteId, status: 'PENDENTE' },
            data: { status: acao === 'RECUSAR' ? 'APROVADA' : 'REJEITADA' },
        });

        // Record moderation action
        await prisma.moderacao.create({
            data: {
                moderadorId: req.usuario!.id,
                acao,
                justificativa: sanitizar(justificativa),
                entidadeTipo: 'INCIDENTE',
                entidadeId: incidenteId,
            },
        });

        // Audit trail
        await prisma.logAuditoria.create({
            data: {
                usuarioId: req.usuario!.id,
                nomeUsuario: req.usuario!.pseudonimo,
                acao: `MODERACAO_${acao}`,
                modulo: 'MODERACAO',
                detalhes: JSON.stringify({ incidenteId, acao, justificativa }),
                ipOrigem: req.ip || req.socket.remoteAddress,
                userAgent: req.get('User-Agent'),
            },
        });

        res.json({ mensagem: `Ação "${acao}" realizada com sucesso.` });
    } catch (error) {
        console.error('Moderation error:', error);
        res.status(500).json({ error: 'Erro ao executar ação de moderação.' });
    }
});

/**
 * POST /api/admin/banir - Ban user
 * CA05: Hybrid ban (user ID + device fingerprint)
 * CA11: Support temporary or permanent ban
 */
router.post('/banir', autenticar, autorizar(ROLES.ADMIN), async (req: Request, res: Response) => {
    try {
        const { usuarioId, motivo, permanente, dataExpiracao } = req.body;

        if (!motivo || motivo.length < 30) {
            return res.status(400).json({ error: 'O motivo deve ter no mínimo 30 caracteres.' });
        }

        const usuario = await prisma.usuario.findUnique({ where: { id: usuarioId } });
        if (!usuario) {
            return res.status(404).json({ error: 'Usuário não encontrado.' });
        }

        // CA08: Cannot ban higher or equal role
        const hierarquia: Record<string, number> = {
            MEMBRO: 1, MODERADOR: 2, ORGAO_SEGURANCA: 3, ADMIN: 4,
        };
        if (hierarquia[usuario.role] >= hierarquia[req.usuario!.role]) {
            return res.status(403).json({ error: 'Sem permissão para banir usuários do mesmo nível ou superior.' });
        }

        await prisma.usuario.update({
            where: { id: usuarioId },
            data: {
                status: 'BANIDO',
                bloqueadoAte: permanente ? null : (dataExpiracao ? new Date(dataExpiracao) : null),
            },
        });

        // CA09: Remove all active markers from banned user
        await prisma.incidente.updateMany({
            where: { autorId: usuarioId, status: 'ativo' },
            data: { status: 'moderacao' },
        });

        // Invalidate sessions
        await prisma.sessao.updateMany({
            where: { usuarioId },
            data: { ativo: false },
        });

        // Notify user
        await prisma.notificacao.create({
            data: {
                usuarioId,
                titulo: '🚫 Conta Banida',
                corpo: `Sua conta foi ${permanente ? 'permanentemente banida' : 'temporariamente suspensa'}. Motivo: ${motivo}`,
                tipo: 'MODERACAO',
            },
        });

        // Audit
        await prisma.logAuditoria.create({
            data: {
                usuarioId: req.usuario!.id,
                nomeUsuario: req.usuario!.pseudonimo,
                acao: 'BANIR',
                modulo: 'MODERACAO',
                detalhes: JSON.stringify({ usuarioBanido: usuarioId, motivo, permanente }),
                ipOrigem: req.ip || req.socket.remoteAddress,
                userAgent: req.get('User-Agent'),
            },
        });

        res.json({ mensagem: `Usuário ${permanente ? 'banido permanentemente' : 'suspenso temporariamente'}.` });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao banir usuário.' });
    }
});

// ═══════════════════════════════════════════════════════════════
// 1.5.3 - Log de Auditoria
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/admin/auditoria - Audit trail (CA01: Admin only)
 */
router.get('/auditoria', autenticar, autorizar(ROLES.ADMIN), async (req: Request, res: Response) => {
    try {
        const { page = '1', usuario, acao, modulo, dataInicio, dataFim, busca } = req.query;
        const pageNum = parseInt(page as string);
        const take = 20;
        const skip = (pageNum - 1) * take;

        const where: any = {};
        if (usuario) where.nomeUsuario = { contains: usuario };
        if (acao) where.acao = acao;
        if (modulo) where.modulo = modulo;
        if (dataInicio) where.criadoEm = { ...where.criadoEm, gte: new Date(dataInicio as string) };
        if (dataFim) where.criadoEm = { ...where.criadoEm, lte: new Date(dataFim as string) };
        if (busca) where.detalhes = { contains: busca };

        const [logs, total] = await Promise.all([
            prisma.logAuditoria.findMany({
                where,
                orderBy: { criadoEm: 'desc' },
                take,
                skip,
            }),
            prisma.logAuditoria.count({ where }),
        ]);

        res.json({
            logs,
            total,
            pagina: pageNum,
            totalPaginas: Math.ceil(total / take),
        });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar logs de auditoria.' });
    }
});

/**
 * GET /api/admin/auditoria/export - Export audit trail (CA11)
 */
router.get('/auditoria/export', autenticar, autorizar(ROLES.ADMIN), async (req: Request, res: Response) => {
    try {
        const { formato = 'json', dataInicio, dataFim } = req.query;
        const where: any = {};
        if (dataInicio) where.criadoEm = { ...where.criadoEm, gte: new Date(dataInicio as string) };
        if (dataFim) where.criadoEm = { ...where.criadoEm, lte: new Date(dataFim as string) };

        const logs = await prisma.logAuditoria.findMany({ where, orderBy: { criadoEm: 'desc' } });

        if (formato === 'csv') {
            const headers = 'id,usuarioId,nomeUsuario,acao,modulo,detalhes,ipOrigem,userAgent,criadoEm\n';
            const csv = headers + logs.map(l =>
                `${l.id},${l.usuarioId || ''},${l.nomeUsuario || ''},${l.acao},${l.modulo},"${(l.detalhes || '').replace(/"/g, '""')}",${l.ipOrigem || ''},${l.userAgent || ''},${l.criadoEm.toISOString()}`
            ).join('\n');
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename=auditoria.csv');
            return res.send(csv);
        }

        res.json(logs);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao exportar auditoria.' });
    }
});

// ═══════════════════════════════════════════════════════════════
// 1.6.2 - Gestão de Perfis de Acesso
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/admin/usuarios - List users (CA04, CA07)
 */
router.get('/usuarios', autenticar, autorizar(ROLES.ADMIN), async (req: Request, res: Response) => {
    try {
        const { page = '1', status, role, busca } = req.query;
        const pageNum = parseInt(page as string);
        const take = 20;
        const skip = (pageNum - 1) * take;

        const where: any = { deletadoEm: null };
        if (status) where.status = status;
        if (role) where.role = role;
        if (busca) {
            where.OR = [
                { pseudonimo: { contains: busca } },
                { nomeCompleto: { contains: busca } },
                { email: { contains: busca } },
            ];
        }

        const [usuarios, total] = await Promise.all([
            prisma.usuario.findMany({
                where,
                select: {
                    id: true,
                    nomeCompleto: true,
                    pseudonimo: true,
                    email: true,
                    role: true,
                    pontuacao: true,
                    nivel: true,
                    status: true,
                    criadoEm: true,
                },
                orderBy: { criadoEm: 'desc' },
                take,
                skip,
            }),
            prisma.usuario.count({ where }),
        ]);

        res.json({ usuarios, total, pagina: pageNum, totalPaginas: Math.ceil(total / take) });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar usuários.' });
    }
});

/**
 * PUT /api/admin/usuarios/:id/role - Change user role (CA02: Admin only)
 * CA08: Requires password confirmation
 */
router.put('/usuarios/:id/role', autenticar, autorizar(ROLES.ADMIN), async (req: Request, res: Response) => {
    try {
        const { role, senhaConfirmacao } = req.body;
        const userId = parseInt(req.params.id as string);

        // CA08 (1.6.2): Require password confirmation for role changes
        if (!senhaConfirmacao) {
            return res.status(400).json({ error: 'Confirmação de senha é obrigatória para alterar perfis.' });
        }

        const admin = await prisma.usuario.findUnique({ where: { id: req.usuario!.id } });
        if (!admin) return res.status(404).json({ error: 'Admin não encontrado.' });

        const senhaValida = await bcrypt.compare(senhaConfirmacao, admin.senhaHash);
        if (!senhaValida) {
            return res.status(401).json({ error: 'Senha de confirmação incorreta.' });
        }

        // CA03: Cannot change own role
        if (userId === req.usuario!.id) {
            return res.status(403).json({ error: 'Você não pode alterar suas próprias permissões.' });
        }

        if (!Object.values(ROLES).includes(role)) {
            return res.status(400).json({ error: 'Perfil inválido.' });
        }

        const usuario = await prisma.usuario.update({
            where: { id: userId },
            data: { role },
        });

        // Audit
        await prisma.logAuditoria.create({
            data: {
                usuarioId: req.usuario!.id,
                nomeUsuario: req.usuario!.pseudonimo,
                acao: 'ALTERAR_ROLE',
                modulo: 'USUARIO',
                detalhes: JSON.stringify({ usuarioAlterado: userId, novoRole: role }),
                ipOrigem: req.ip || req.socket.remoteAddress,
                userAgent: req.get('User-Agent'),
            },
        });

        res.json({ mensagem: `Perfil alterado para "${role}".` });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao alterar perfil.' });
    }
});

/**
 * POST /api/admin/denunciar - Report an incident
 */
router.post('/denunciar', autenticar, async (req: Request, res: Response) => {
    try {
        const { incidenteId, motivo } = req.body;

        if (!motivo || motivo.length < 10) {
            return res.status(400).json({ error: 'O motivo deve ter no mínimo 10 caracteres.' });
        }

        // Check for existing report by this user
        const existente = await prisma.denuncia.findFirst({
            where: { incidenteId, denuncianteId: req.usuario!.id },
        });
        if (existente) {
            return res.status(409).json({ error: 'Você já denunciou este incidente.' });
        }

        await prisma.denuncia.create({
            data: {
                incidenteId,
                denuncianteId: req.usuario!.id,
                motivo: sanitizar(motivo),
            },
        });

        // CA07 (1.5.2): Auto-quarantine if 5+ reports from Sentinela+ users
        const denuncias = await prisma.denuncia.count({
            where: { incidenteId, status: 'PENDENTE' },
        });
        if (denuncias >= 5) {
            await prisma.incidente.update({
                where: { id: incidenteId },
                data: { status: 'moderacao' },
            });
        }

        res.json({ mensagem: 'Denúncia registrada. Obrigado por ajudar a manter a comunidade segura.' });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao registrar denúncia.' });
    }
});

export default router;
