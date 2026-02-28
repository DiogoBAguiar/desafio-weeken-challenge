import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { autenticar } from '../middleware/auth';
import {
    JWT_SECRET, JWT_EXPIRES_IN, BCRYPT_ROUNDS,
    MAX_LOGIN_ATTEMPTS, LOGIN_BLOCK_MINUTES
} from '../utils/constants';
import { validarEmail, validarSenha, sanitizar, contemPalavrasProibidas } from '../utils/helpers';

const router = Router();
const prisma = new PrismaClient();

// ═══════════════════════════════════════════════════════════════
// 1.6.1 - Autenticação (Login/Logout) e Recuperação de Senha
// 1.4.1 - Cadastro e Perfil de Usuário
// ═══════════════════════════════════════════════════════════════

/**
 * POST /api/auth/register - Cadastro de usuário
 * CA01-CA12 of Feature 1.4.1
 */
router.post('/register', async (req: Request, res: Response) => {
    try {
        const { nomeCompleto, pseudonimo, email, senha, confirmacaoSenha, aceitouTermos } = req.body;

        // CA01: Must accept terms
        if (!aceitouTermos) {
            return res.status(400).json({ error: 'Você deve aceitar os Termos de Uso e a Política de Privacidade (LGPD).' });
        }

        // Validate required fields
        if (!nomeCompleto || !pseudonimo || !email || !senha || !confirmacaoSenha) {
            return res.status(400).json({ error: 'Todos os campos são obrigatórios.' });
        }

        // Password confirmation
        if (senha !== confirmacaoSenha) {
            return res.status(400).json({ error: 'As senhas não coincidem.' });
        }

        // CA03: Validate email RFC 5322
        if (!validarEmail(email)) {
            return res.status(400).json({ error: 'Formato de e-mail inválido.' });
        }

        // CA04: Password policy
        const senhaValidacao = validarSenha(senha);
        if (!senhaValidacao.valido) {
            return res.status(400).json({ error: senhaValidacao.mensagem });
        }

        // CA10: Profanity filter on pseudonym
        if (contemPalavrasProibidas(pseudonimo)) {
            return res.status(400).json({ error: 'O pseudônimo contém palavras impróprias.' });
        }

        // CA03: Unique email
        const existingEmail = await prisma.usuario.findUnique({ where: { email } });
        if (existingEmail) {
            return res.status(409).json({ error: 'Este e-mail já está cadastrado.' });
        }

        // Unique pseudonym
        const existingPseudo = await prisma.usuario.findUnique({ where: { pseudonimo } });
        if (existingPseudo) {
            return res.status(409).json({ error: 'Este pseudônimo já está em uso.' });
        }

        // CA09: Sanitize inputs
        const nomeSeguro = sanitizar(nomeCompleto);
        const pseudonimoSeguro = sanitizar(pseudonimo);

        // CA03 (1.6.1): BCrypt hash with cost factor 12
        const senhaHash = await bcrypt.hash(senha, BCRYPT_ROUNDS);

        // CA07: Initialize reputation at zero, level "Iniciante"
        const usuario = await prisma.usuario.create({
            data: {
                nomeCompleto: nomeSeguro,
                pseudonimo: pseudonimoSeguro,
                email: email.toLowerCase().trim(),
                senhaHash,
                aceitouTermos: true,
                pontuacao: 0,
                nivel: 'Iniciante',
                role: 'MEMBRO',
                senhasAnteriores: JSON.stringify([senhaHash]),
            },
        });

        // CA12: Audit log
        await prisma.logAuditoria.create({
            data: {
                usuarioId: usuario.id,
                nomeUsuario: usuario.pseudonimo,
                acao: 'CADASTRO',
                modulo: 'AUTH',
                detalhes: JSON.stringify({ email: usuario.email }),
                ipOrigem: req.ip || req.socket.remoteAddress,
                userAgent: req.get('User-Agent'),
            },
        });

        // Generate JWT
        const token = jwt.sign(
            { id: usuario.id, email: usuario.email, role: usuario.role },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN }
        );

        // Create session
        await prisma.sessao.create({
            data: {
                usuarioId: usuario.id,
                token,
                deviceInfo: req.get('User-Agent'),
                ipOrigem: req.ip || req.socket.remoteAddress,
                expiraEm: new Date(Date.now() + 24 * 60 * 60 * 1000),
            },
        });

        res.status(201).json({
            mensagem: 'Cadastro realizado com sucesso!',
            token,
            usuario: {
                id: usuario.id,
                nomeCompleto: usuario.nomeCompleto,
                pseudonimo: usuario.pseudonimo,
                email: usuario.email,
                role: usuario.role,
                pontuacao: usuario.pontuacao,
                nivel: usuario.nivel,
            },
        });
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ error: 'Erro interno ao criar conta.' });
    }
});

/**
 * POST /api/auth/login - Login
 * CA01-CA12 of Feature 1.6.1
 */
router.post('/login', async (req: Request, res: Response) => {
    try {
        const { email, senha } = req.body;

        if (!email || !senha) {
            return res.status(400).json({ error: 'E-mail e senha são obrigatórios.' });
        }

        const usuario = await prisma.usuario.findUnique({ where: { email: email.toLowerCase().trim() } });

        // CA09: Generic error message
        if (!usuario) {
            // Log failed attempt
            await prisma.logAuditoria.create({
                data: {
                    acao: 'LOGIN_FALHA',
                    modulo: 'AUTH',
                    detalhes: JSON.stringify({ email }),
                    ipOrigem: req.ip || req.socket.remoteAddress,
                    userAgent: req.get('User-Agent'),
                },
            });
            return res.status(401).json({ error: 'E-mail ou senha incorretos.' });
        }

        // CA04: Check if account is blocked
        if (usuario.bloqueadoAte && usuario.bloqueadoAte > new Date()) {
            const minutosRestantes = Math.ceil((usuario.bloqueadoAte.getTime() - Date.now()) / 60000);
            return res.status(423).json({
                error: `Conta bloqueada temporariamente. Tente novamente em ${minutosRestantes} minutos.`,
            });
        }

        // Verify password
        const senhaValida = await bcrypt.compare(senha, usuario.senhaHash);

        if (!senhaValida) {
            const tentativas = usuario.tentativasLogin + 1;
            const update: any = { tentativasLogin: tentativas };

            // CA04: Block after 5 failed attempts for 30 minutes
            if (tentativas >= MAX_LOGIN_ATTEMPTS) {
                update.bloqueadoAte = new Date(Date.now() + LOGIN_BLOCK_MINUTES * 60 * 1000);
                update.tentativasLogin = 0;
            }

            await prisma.usuario.update({ where: { id: usuario.id }, data: update });

            // CA10 (1.5.3): Log failed attempt
            await prisma.logAuditoria.create({
                data: {
                    usuarioId: usuario.id,
                    nomeUsuario: usuario.pseudonimo,
                    acao: 'LOGIN_FALHA',
                    modulo: 'AUTH',
                    detalhes: JSON.stringify({ tentativa: tentativas }),
                    ipOrigem: req.ip || req.socket.remoteAddress,
                    userAgent: req.get('User-Agent'),
                },
            });

            return res.status(401).json({ error: 'E-mail ou senha incorretos.' });
        }

        if (usuario.status === 'BANIDO') {
            return res.status(403).json({ error: 'Esta conta foi banida.' });
        }

        if (usuario.status === 'SUSPENSO') {
            return res.status(403).json({ error: 'Esta conta está suspensa. Entre em contato com a moderação.' });
        }

        // Reset login attempts
        await prisma.usuario.update({
            where: { id: usuario.id },
            data: { tentativasLogin: 0, bloqueadoAte: null },
        });

        // Generate JWT
        const token = jwt.sign(
            { id: usuario.id, email: usuario.email, role: usuario.role },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN }
        );

        // CA07 (1.6.1): Store session (HTTP-Only cookie concept - sending token for client storage)
        await prisma.sessao.create({
            data: {
                usuarioId: usuario.id,
                token,
                deviceInfo: req.get('User-Agent'),
                ipOrigem: req.ip || req.socket.remoteAddress,
                expiraEm: new Date(Date.now() + 24 * 60 * 60 * 1000),
            },
        });

        // Audit log
        await prisma.logAuditoria.create({
            data: {
                usuarioId: usuario.id,
                nomeUsuario: usuario.pseudonimo,
                acao: 'LOGIN',
                modulo: 'AUTH',
                ipOrigem: req.ip || req.socket.remoteAddress,
                userAgent: req.get('User-Agent'),
            },
        });

        res.json({
            token,
            usuario: {
                id: usuario.id,
                nomeCompleto: usuario.nomeCompleto,
                pseudonimo: usuario.pseudonimo,
                email: usuario.email,
                role: usuario.role,
                pontuacao: usuario.pontuacao,
                nivel: usuario.nivel,
                fotoPerfil: usuario.fotoPerfil,
                miniBio: usuario.miniBio,
            },
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Erro interno no login.' });
    }
});

/**
 * POST /api/auth/logout - Logout
 */
router.post('/logout', autenticar, async (req: Request, res: Response) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (token) {
            await prisma.sessao.updateMany({
                where: { token },
                data: { ativo: false },
            });
        }

        await prisma.logAuditoria.create({
            data: {
                usuarioId: req.usuario!.id,
                nomeUsuario: req.usuario!.pseudonimo,
                acao: 'LOGOUT',
                modulo: 'AUTH',
                ipOrigem: req.ip || req.socket.remoteAddress,
                userAgent: req.get('User-Agent'),
            },
        });

        res.json({ mensagem: 'Logout realizado com sucesso.' });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao realizar logout.' });
    }
});

/**
 * POST /api/auth/forgot-password - Request password recovery
 */
router.post('/forgot-password', async (req: Request, res: Response) => {
    try {
        const { email } = req.body;
        const usuario = await prisma.usuario.findUnique({ where: { email: email?.toLowerCase().trim() } });

        // Always return success to not reveal if email exists
        res.json({ mensagem: 'Se o e-mail estiver cadastrado, você receberá as instruções de recuperação.' });

        // In production: send actual email with signed token
        if (usuario) {
            const recoveryToken = jwt.sign({ id: usuario.id, type: 'recovery' }, JWT_SECRET, { expiresIn: '1h' });
            console.log(`[RECOVERY] Token for ${email}: ${recoveryToken}`);
        }
    } catch (error) {
        res.status(500).json({ error: 'Erro ao processar recuperação.' });
    }
});

/**
 * POST /api/auth/reset-password - Reset password with token
 * CA11: Prevent reuse of last 3 passwords
 */
router.post('/reset-password', async (req: Request, res: Response) => {
    try {
        const { token, novaSenha } = req.body;

        const decoded = jwt.verify(token, JWT_SECRET) as any;
        if (decoded.type !== 'recovery') {
            return res.status(400).json({ error: 'Token inválido.' });
        }

        const validacao = validarSenha(novaSenha);
        if (!validacao.valido) {
            return res.status(400).json({ error: validacao.mensagem });
        }

        const usuario = await prisma.usuario.findUnique({ where: { id: decoded.id } });
        if (!usuario) {
            return res.status(404).json({ error: 'Usuário não encontrado.' });
        }

        // CA11: Check against last 3 passwords
        const senhasAnteriores = JSON.parse(usuario.senhasAnteriores || '[]');
        for (const oldHash of senhasAnteriores) {
            if (await bcrypt.compare(novaSenha, oldHash)) {
                return res.status(400).json({ error: 'Não é possível reutilizar uma das últimas 3 senhas.' });
            }
        }

        const novaHash = await bcrypt.hash(novaSenha, BCRYPT_ROUNDS);
        const novasAnteriores = [novaHash, ...senhasAnteriores].slice(0, 3);

        await prisma.usuario.update({
            where: { id: usuario.id },
            data: {
                senhaHash: novaHash,
                senhasAnteriores: JSON.stringify(novasAnteriores),
            },
        });

        // Invalidate all sessions
        await prisma.sessao.updateMany({
            where: { usuarioId: usuario.id },
            data: { ativo: false },
        });

        res.json({ mensagem: 'Senha redefinida com sucesso.' });
    } catch (error) {
        res.status(400).json({ error: 'Token inválido ou expirado.' });
    }
});

/**
 * GET /api/auth/me - Get current user profile
 */
router.get('/me', autenticar, async (req: Request, res: Response) => {
    try {
        const usuario = await prisma.usuario.findUnique({
            where: { id: req.usuario!.id },
            select: {
                id: true,
                nomeCompleto: true,
                pseudonimo: true,
                email: true,
                role: true,
                pontuacao: true,
                nivel: true,
                fotoPerfil: true,
                miniBio: true,
                status: true,
                criadoEm: true,
                medalhas: {
                    include: { medalha: true },
                },
            },
        });

        res.json(usuario);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar perfil.' });
    }
});

/**
 * PUT /api/auth/profile - Update profile
 */
router.put('/profile', autenticar, async (req: Request, res: Response) => {
    try {
        const { pseudonimo, miniBio, fotoPerfil } = req.body;

        const data: any = {};

        if (pseudonimo) {
            if (contemPalavrasProibidas(pseudonimo)) {
                return res.status(400).json({ error: 'O pseudônimo contém palavras impróprias.' });
            }
            data.pseudonimo = sanitizar(pseudonimo);
        }

        if (miniBio !== undefined) {
            if (miniBio.length > 160) {
                return res.status(400).json({ error: 'A mini bio deve ter no máximo 160 caracteres.' });
            }
            data.miniBio = sanitizar(miniBio);
        }

        if (fotoPerfil) {
            data.fotoPerfil = fotoPerfil;
        }

        const usuario = await prisma.usuario.update({
            where: { id: req.usuario!.id },
            data,
            select: {
                id: true,
                nomeCompleto: true,
                pseudonimo: true,
                email: true,
                fotoPerfil: true,
                miniBio: true,
                pontuacao: true,
                nivel: true,
                role: true,
            },
        });

        res.json({ mensagem: 'Perfil atualizado com sucesso.', usuario });
    } catch (error: any) {
        if (error.code === 'P2002') {
            return res.status(409).json({ error: 'Este pseudônimo já está em uso.' });
        }
        res.status(500).json({ error: 'Erro ao atualizar perfil.' });
    }
});

/**
 * GET /api/auth/sessions - List active sessions (CA08 of 1.6.1)
 */
router.get('/sessions', autenticar, async (req: Request, res: Response) => {
    try {
        const sessoes = await prisma.sessao.findMany({
            where: { usuarioId: req.usuario!.id, ativo: true },
            select: {
                id: true,
                deviceInfo: true,
                ipOrigem: true,
                criadoEm: true,
                expiraEm: true,
            },
            orderBy: { criadoEm: 'desc' },
        });

        res.json(sessoes);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar sessões.' });
    }
});

/**
 * DELETE /api/auth/sessions/:id - Terminate specific session
 */
router.delete('/sessions/:id', autenticar, async (req: Request, res: Response) => {
    try {
        await prisma.sessao.updateMany({
            where: {
                id: parseInt(req.params.id),
                usuarioId: req.usuario!.id,
            },
            data: { ativo: false },
        });

        res.json({ mensagem: 'Sessão encerrada.' });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao encerrar sessão.' });
    }
});

export default router;
