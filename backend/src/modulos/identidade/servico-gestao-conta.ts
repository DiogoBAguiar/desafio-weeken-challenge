// ═══════════════════════════════════════════════════════════════
// Serviço de Gestão de Conta — Perfil, Sessões e 2FA
// Toda lógica de negócio relacionada à conta do usuário
// após o login. NÃO conhece HTTP (Request/Response).
// ═══════════════════════════════════════════════════════════════

import { PrismaClient } from '@prisma/client';
import * as QRCode from 'qrcode';
import {
    IProvedorDeConexao,
    IProvedorDeSeguranca,
    IServicoDeAuditoria,
    IContextoDeRede
} from '../../core/interfaces';
import { sanitizar, contemPalavrasProibidas } from '../../utils/helpers';

export class ServicoDeGestaoDeConta {
    private bancoDeDados: PrismaClient;
    private seguranca: IProvedorDeSeguranca;
    private auditoria: IServicoDeAuditoria;

    constructor(
        provedorBanco: IProvedorDeConexao,
        seguranca: IProvedorDeSeguranca,
        auditoria: IServicoDeAuditoria
    ) {
        this.bancoDeDados = provedorBanco.obterClienteBancoDeDados();
        this.seguranca = seguranca;
        this.auditoria = auditoria;
    }

    // ───────────────────────────────────────────────────────────
    // Logout
    // ───────────────────────────────────────────────────────────

    public async destituirSessaoAtual(
        token: string,
        identificadorUsuario: number,
        pseudonimo: string,
        contexto: IContextoDeRede
    ): Promise<void> {
        await this.bancoDeDados.sessao.updateMany({
            where: { token },
            data: { ativo: false },
        });

        await this.auditoria.registrarAcao(
            identificadorUsuario, pseudonimo,
            'LOGOUT', 'AUTH',
            {},
            contexto.ip, contexto.agente
        );
    }

    // ───────────────────────────────────────────────────────────
    // Perfil
    // ───────────────────────────────────────────────────────────

    public async obterPerfilAtual(identificadorUsuario: number): Promise<any> {
        return await this.bancoDeDados.usuario.findUnique({
            where: { id: identificadorUsuario },
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
    }

    public async atualizarDadosDoPerfil(identificadorUsuario: number, dadosAtualizados: any): Promise<any> {
        const dadosParaPersistencia: any = {};

        if (dadosAtualizados.pseudonimo) {
            if (contemPalavrasProibidas(dadosAtualizados.pseudonimo)) {
                throw new Error('O pseudônimo contém palavras impróprias.');
            }
            dadosParaPersistencia.pseudonimo = sanitizar(dadosAtualizados.pseudonimo);
        }

        if (dadosAtualizados.miniBio !== undefined) {
            if (dadosAtualizados.miniBio.length > 160) {
                throw new Error('A mini bio deve ter no máximo 160 caracteres.');
            }
            dadosParaPersistencia.miniBio = sanitizar(dadosAtualizados.miniBio);
        }

        if (dadosAtualizados.fotoPerfil) {
            dadosParaPersistencia.fotoPerfil = dadosAtualizados.fotoPerfil;
        }

        try {
            return await this.bancoDeDados.usuario.update({
                where: { id: identificadorUsuario },
                data: dadosParaPersistencia,
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
        } catch (erro: any) {
            if (erro.code === 'P2002') {
                throw new Error('Este pseudônimo já está em uso.');
            }
            throw erro;
        }
    }

    // ───────────────────────────────────────────────────────────
    // Sessões
    // ───────────────────────────────────────────────────────────

    public async listarSessoesAtivas(identificadorUsuario: number): Promise<any> {
        return await this.bancoDeDados.sessao.findMany({
            where: { usuarioId: identificadorUsuario, ativo: true },
            select: {
                id: true,
                deviceInfo: true,
                ipOrigem: true,
                criadoEm: true,
                expiraEm: true,
            },
            orderBy: { criadoEm: 'desc' },
        });
    }

    public async encerrarSessaoEspecifica(identificadorUsuario: number, identificadorDaSessao: number): Promise<void> {
        await this.bancoDeDados.sessao.updateMany({
            where: { id: identificadorDaSessao, usuarioId: identificadorUsuario },
            data: { ativo: false },
        });
    }

    // ───────────────────────────────────────────────────────────
    // Autenticação de Dois Fatores (2FA / TOTP)
    // ───────────────────────────────────────────────────────────

    public async iniciarConfiguracaoDoisFatores(identificadorUsuario: number, email: string): Promise<any> {
        const segredoGerado = this.seguranca.gerarSegredoTotp();
        const uriDeProvisionamento = this.seguranca.gerarUriTotp(email, 'ComunidadeSegura', segredoGerado);
        const representacaoVisualDoQr = await QRCode.toDataURL(uriDeProvisionamento);

        await this.bancoDeDados.usuario.update({
            where: { id: identificadorUsuario },
            data: { twoFactorSecret: segredoGerado },
        });

        return { secret: segredoGerado, qrCodeUrl: representacaoVisualDoQr };
    }

    public async confirmarEAtivarDoisFatores(identificadorUsuario: number, codigoInformado: string): Promise<void> {
        const usuarioLocalizado = await this.bancoDeDados.usuario.findUnique({
            where: { id: identificadorUsuario }
        });

        if (!usuarioLocalizado?.twoFactorSecret) {
            throw new Error('Configure o 2FA primeiro.');
        }

        const validacaoAprovada = this.seguranca.verificarCodigoTotp(
            codigoInformado, usuarioLocalizado.twoFactorSecret
        );
        if (!validacaoAprovada) {
            throw new Error('Código inválido. Tente novamente.');
        }

        await this.bancoDeDados.usuario.update({
            where: { id: identificadorUsuario },
            data: { twoFactorEnabled: true },
        });
    }

    public async desativarDoisFatores(identificadorUsuario: number, senhaDeConfirmacao: string): Promise<void> {
        const usuarioLocalizado = await this.bancoDeDados.usuario.findUnique({
            where: { id: identificadorUsuario }
        });
        if (!usuarioLocalizado) throw new Error('Usuário não encontrado.');

        const credencialValida = await this.seguranca.compararHashSincrono(
            senhaDeConfirmacao, usuarioLocalizado.senhaHash
        );
        if (!credencialValida) {
            throw new Error('Senha incorreta.');
        }

        await this.bancoDeDados.usuario.update({
            where: { id: identificadorUsuario },
            data: { twoFactorEnabled: false, twoFactorSecret: null },
        });
    }

    // ───────────────────────────────────────────────────────────
    // Verificação de Senha (para confirmações de admin)
    // ───────────────────────────────────────────────────────────

    public async verificarSenhaAtual(identificadorUsuario: number, senhaDeVerificacao: string): Promise<void> {
        const usuarioLocalizado = await this.bancoDeDados.usuario.findUnique({
            where: { id: identificadorUsuario }
        });
        if (!usuarioLocalizado) throw new Error('Usuário não encontrado.');

        const credencialValida = await this.seguranca.compararHashSincrono(
            senhaDeVerificacao, usuarioLocalizado.senhaHash
        );
        if (!credencialValida) {
            throw new Error('Senha incorreta.');
        }
    }
}
