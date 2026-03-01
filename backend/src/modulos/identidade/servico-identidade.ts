// ═══════════════════════════════════════════════════════════════
// Serviço de Identidade — Regras de Negócio de Autenticação
// Cadastro, Login, Recuperação e Redefinição de Senha.
// NÃO conhece HTTP (Request/Response) — apenas lógica pura.
// ═══════════════════════════════════════════════════════════════

import { PrismaClient } from '@prisma/client';
import {
    IProvedorDeConexao,
    IProvedorDeSeguranca,
    IServicoDeAuditoria,
    IContextoDeRede
} from '../../core/interfaces';
import {
    JWT_EXPIRES_IN,
    MAX_LOGIN_ATTEMPTS,
    LOGIN_BLOCK_MINUTES
} from '../../utils/constants';
import {
    validarEmail,
    validarSenha,
    sanitizar,
    contemPalavrasProibidas
} from '../../utils/helpers';

export class ServicoDeIdentidade {
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
    // Cadastro de Novo Membro
    // ───────────────────────────────────────────────────────────

    public async processarCadastroDeMembro(dadosDoCadastro: any, contexto: IContextoDeRede): Promise<any> {
        // Validar todas as regras de negócio
        this.validarRegrasDeNegocioDoCadastro(dadosDoCadastro);

        const { nomeCompleto, pseudonimo, email, senha } = dadosDoCadastro;
        const emailFormatado = email.toLowerCase().trim();

        // Verificar conflitos (email/pseudônimo já existentes)
        await this.verificarConflitosDeIdentidade(emailFormatado, pseudonimo);

        // Criar usuário com senha protegida
        const senhaProtegida = await this.seguranca.gerarHashSincrono(senha);
        const novoUsuario = await this.bancoDeDados.usuario.create({
            data: {
                nomeCompleto: sanitizar(nomeCompleto),
                pseudonimo: sanitizar(pseudonimo),
                email: emailFormatado,
                senhaHash: senhaProtegida,
                aceitouTermos: true,
                pontuacao: 0,
                nivel: 'Iniciante',
                role: 'MEMBRO',
                senhasAnteriores: JSON.stringify([senhaProtegida]),
            },
        });

        // Registrar auditoria
        await this.auditoria.registrarAcao(
            novoUsuario.id, novoUsuario.pseudonimo,
            'CADASTRO', 'AUTH',
            { email: novoUsuario.email },
            contexto.ip, contexto.agente
        );

        // Estabelecer sessão e retornar token
        return this.estabelecerSessao(novoUsuario, contexto);
    }

    // ───────────────────────────────────────────────────────────
    // Autenticação (Login)
    // ───────────────────────────────────────────────────────────

    public async autenticarCredenciais(dadosDeLogin: any, contexto: IContextoDeRede): Promise<any> {
        if (!dadosDeLogin.email || !dadosDeLogin.senha) {
            throw new Error('E-mail e senha são obrigatórios.');
        }

        const emailSanitizado = dadosDeLogin.email.toLowerCase().trim();
        const perfilEncontrado = await this.bancoDeDados.usuario.findUnique({
            where: { email: emailSanitizado }
        });

        // CA09: Mensagem genérica — não revela se o email existe
        if (!perfilEncontrado) {
            await this.auditoria.registrarAcao(
                undefined, undefined,
                'LOGIN_FALHA', 'AUTH',
                { email: emailSanitizado },
                contexto.ip, contexto.agente
            );
            throw new Error('E-mail ou senha incorretos.');
        }

        // Verificar restrições (bloqueio, ban, suspensão)
        this.verificarRestricoesDeAcesso(perfilEncontrado);

        // Validar senha
        const assinaturaValida = await this.seguranca.compararHashSincrono(
            dadosDeLogin.senha, perfilEncontrado.senhaHash
        );

        if (!assinaturaValida) {
            await this.processarFalhaDeAutenticacao(perfilEncontrado, contexto);
            throw new Error('E-mail ou senha incorretos.');
        }

        // Status check após senha válida
        if (perfilEncontrado.status === 'BANIDO') {
            throw new Error('Esta conta foi banida.');
        }
        if (perfilEncontrado.status === 'SUSPENSO') {
            throw new Error('Esta conta está suspensa. Entre em contato com a moderação.');
        }

        // Reset de tentativas após login bem-sucedido
        await this.bancoDeDados.usuario.update({
            where: { id: perfilEncontrado.id },
            data: { tentativasLogin: 0, bloqueadoAte: null },
        });

        // Auditoria de login
        await this.auditoria.registrarAcao(
            perfilEncontrado.id, perfilEncontrado.pseudonimo,
            'LOGIN', 'AUTH',
            {},
            contexto.ip, contexto.agente
        );

        return this.estabelecerSessao(perfilEncontrado, contexto);
    }

    // ───────────────────────────────────────────────────────────
    // Recuperação de Senha
    // ───────────────────────────────────────────────────────────

    public async solicitarRecuperacaoDeSenha(email: string): Promise<string> {
        const emailFormatado = email?.toLowerCase().trim();
        const usuarioLocalizado = await this.bancoDeDados.usuario.findUnique({
            where: { email: emailFormatado }
        });

        // Gera token mas SEMPRE retorna mesma mensagem (segurança)
        if (usuarioLocalizado) {
            const tokenDeRecuperacao = this.seguranca.assinarToken(
                { id: usuarioLocalizado.id, type: 'recovery' }, '1h'
            );
            console.log(`[RECUPERACAO] Token gerado para ${emailFormatado}: ${tokenDeRecuperacao}`);
        }

        return 'Se o e-mail estiver cadastrado, você receberá as instruções de recuperação.';
    }

    // ───────────────────────────────────────────────────────────
    // Redefinição de Senha (com token)
    // ───────────────────────────────────────────────────────────

    public async redefinirSenha(token: string, novaSenha: string): Promise<void> {
        // Validar token
        let dadosDecodificados: any;
        try {
            dadosDecodificados = this.seguranca.verificarToken(token);
        } catch (erro) {
            throw new Error('Token inválido ou expirado.');
        }

        if (dadosDecodificados.type !== 'recovery') {
            throw new Error('Token inválido.');
        }

        // Validar força da nova senha
        const validacaoDeForca = validarSenha(novaSenha);
        if (!validacaoDeForca.valido) {
            throw new Error(validacaoDeForca.mensagem);
        }

        // Buscar usuário
        const usuario = await this.bancoDeDados.usuario.findUnique({
            where: { id: dadosDecodificados.id }
        });
        if (!usuario) {
            throw new Error('Usuário não encontrado.');
        }

        // CA11: Verificar contra últimas 3 senhas
        const senhasAnteriores = JSON.parse(usuario.senhasAnteriores || '[]');
        for (const hashAntigo of senhasAnteriores) {
            if (await this.seguranca.compararHashSincrono(novaSenha, hashAntigo)) {
                throw new Error('Não é possível reutilizar uma das últimas 3 senhas.');
            }
        }

        // Persistir nova senha
        const novaAssinaturaDeSenha = await this.seguranca.gerarHashSincrono(novaSenha);
        const historicoAtualizado = [novaAssinaturaDeSenha, ...senhasAnteriores].slice(0, 3);

        await this.bancoDeDados.usuario.update({
            where: { id: usuario.id },
            data: {
                senhaHash: novaAssinaturaDeSenha,
                senhasAnteriores: JSON.stringify(historicoAtualizado),
            },
        });

        // Invalidar todas as sessões
        await this.bancoDeDados.sessao.updateMany({
            where: { usuarioId: usuario.id },
            data: { ativo: false },
        });
    }

    // ───────────────────────────────────────────────────────────
    // Métodos Privados (Regras Internas)
    // ───────────────────────────────────────────────────────────

    private validarRegrasDeNegocioDoCadastro(dados: any): void {
        if (!dados.aceitouTermos) {
            throw new Error('Você deve aceitar os Termos de Uso e a Política de Privacidade (LGPD).');
        }
        if (!dados.nomeCompleto || !dados.pseudonimo || !dados.email || !dados.senha || !dados.confirmacaoSenha) {
            throw new Error('Todos os campos são obrigatórios.');
        }
        if (dados.senha !== dados.confirmacaoSenha) {
            throw new Error('As senhas não coincidem.');
        }
        if (!validarEmail(dados.email)) {
            throw new Error('Formato de e-mail inválido.');
        }

        const analiseDeComplexidade = validarSenha(dados.senha);
        if (!analiseDeComplexidade.valido) {
            throw new Error(analiseDeComplexidade.mensagem);
        }

        if (contemPalavrasProibidas(dados.pseudonimo)) {
            throw new Error('O pseudônimo contém palavras impróprias.');
        }
    }

    private async verificarConflitosDeIdentidade(email: string, pseudonimo: string): Promise<void> {
        const conflitoEmail = await this.bancoDeDados.usuario.findUnique({ where: { email } });
        if (conflitoEmail) {
            throw new Error('Este e-mail já está cadastrado.');
        }

        const conflitoPseudonimo = await this.bancoDeDados.usuario.findUnique({ where: { pseudonimo } });
        if (conflitoPseudonimo) {
            throw new Error('Este pseudônimo já está em uso.');
        }
    }

    private verificarRestricoesDeAcesso(usuario: any): void {
        if (usuario.bloqueadoAte && usuario.bloqueadoAte > new Date()) {
            const margemRestante = Math.ceil((usuario.bloqueadoAte.getTime() - Date.now()) / 60000);
            throw new Error(`Conta bloqueada temporariamente. Tente novamente em ${margemRestante} minutos.`);
        }
    }

    private async processarFalhaDeAutenticacao(usuario: any, contexto: IContextoDeRede): Promise<void> {
        const falhasAcumuladas = usuario.tentativasLogin + 1;
        const metadadosDeAtualizacao: any = { tentativasLogin: falhasAcumuladas };

        // CA04: Bloquear após MAX tentativas
        if (falhasAcumuladas >= MAX_LOGIN_ATTEMPTS) {
            metadadosDeAtualizacao.bloqueadoAte = new Date(Date.now() + LOGIN_BLOCK_MINUTES * 60 * 1000);
            metadadosDeAtualizacao.tentativasLogin = 0;
        }

        await this.bancoDeDados.usuario.update({
            where: { id: usuario.id },
            data: metadadosDeAtualizacao
        });

        await this.auditoria.registrarAcao(
            usuario.id, usuario.pseudonimo,
            'LOGIN_FALHA', 'AUTH',
            { tentativa: falhasAcumuladas },
            contexto.ip, contexto.agente
        );
    }

    private async estabelecerSessao(usuario: any, contexto: IContextoDeRede): Promise<any> {
        const cargaUtilDoToken = { id: usuario.id, email: usuario.email, role: usuario.role };
        const tokenDeAcesso = this.seguranca.assinarToken(cargaUtilDoToken, JWT_EXPIRES_IN);

        await this.bancoDeDados.sessao.create({
            data: {
                usuarioId: usuario.id,
                token: tokenDeAcesso,
                deviceInfo: contexto.agente,
                ipOrigem: contexto.ip,
                expiraEm: new Date(Date.now() + 24 * 60 * 60 * 1000),
            },
        });

        return {
            token: tokenDeAcesso,
            usuario: this.filtrarDadosPublicos(usuario)
        };
    }

    private filtrarDadosPublicos(usuario: any): any {
        return {
            id: usuario.id,
            nomeCompleto: usuario.nomeCompleto,
            pseudonimo: usuario.pseudonimo,
            email: usuario.email,
            role: usuario.role,
            pontuacao: usuario.pontuacao,
            nivel: usuario.nivel,
            fotoPerfil: usuario.fotoPerfil,
            miniBio: usuario.miniBio,
        };
    }
}
