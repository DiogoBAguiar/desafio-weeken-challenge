// ═══════════════════════════════════════════════════════════════
// Controlador de Identidade — Camada HTTP para Autenticação
// Traduz Request/Response ↔ ServicoDeIdentidade.
// Herda respostas padronizadas de ControladorAbstrato.
// ═══════════════════════════════════════════════════════════════

import { Request, Response } from 'express';
import { ControladorAbstrato } from '../../core/controlador-abstrato';
import { ServicoDeIdentidade } from './servico-identidade';

export class ControladorDeIdentidade extends ControladorAbstrato {
    private servicoPrincipal: ServicoDeIdentidade;

    constructor(servicoDeIdentidade: ServicoDeIdentidade) {
        super();
        this.servicoPrincipal = servicoDeIdentidade;
    }

    /**
     * POST /register — Cadastro de novo usuário
     */
    public registrarNovoUsuario = async (req: Request, res: Response): Promise<void> => {
        try {
            const resultado = await this.servicoPrincipal.processarCadastroDeMembro(
                req.body,
                this.extrairContextoDeRede(req)
            );
            this.enviarRespostaDeSucesso(res, {
                mensagem: 'Cadastro realizado com sucesso!',
                ...resultado
            }, 201);
        } catch (excecao: any) {
            const codigoDeStatus = excecao.message.includes('obrigatórios') ||
                excecao.message.includes('inválido') ||
                excecao.message.includes('coincidem') ||
                excecao.message.includes('aceitar') ||
                excecao.message.includes('impróprias') ||
                excecao.message.includes('caractere')
                ? 400 : 409;
            this.enviarFalhaDeValidacao(res, excecao.message, codigoDeStatus);
        }
    }

    /**
     * POST /login — Autenticação de credenciais
     */
    public realizarLogin = async (req: Request, res: Response): Promise<void> => {
        try {
            const emissaoDeAcesso = await this.servicoPrincipal.autenticarCredenciais(
                req.body,
                this.extrairContextoDeRede(req)
            );
            this.enviarRespostaDeSucesso(res, emissaoDeAcesso, 200);
        } catch (excecao: any) {
            let codigoDeStatus = 500;
            if (excecao.message.includes('bloqueada')) codigoDeStatus = 423;
            else if (excecao.message.includes('incorretos')) codigoDeStatus = 401;
            else if (excecao.message.includes('obrigatórios')) codigoDeStatus = 400;
            else if (excecao.message.includes('banida') || excecao.message.includes('suspensa')) codigoDeStatus = 403;

            this.enviarFalhaDeValidacao(res, excecao.message, codigoDeStatus);
        }
    }

    /**
     * POST /forgot-password — Solicitar recuperação de senha
     */
    public requisitarRecuperacaoDeSenha = async (req: Request, res: Response): Promise<void> => {
        try {
            const mensagemInformativa = await this.servicoPrincipal.solicitarRecuperacaoDeSenha(req.body.email);
            this.enviarRespostaDeSucesso(res, { mensagem: mensagemInformativa });
        } catch (excecao: any) {
            this.gerenciarExcecoesGerais(res, excecao, 'Erro ao processar recuperação.');
        }
    }

    /**
     * POST /reset-password — Redefinir senha com token
     */
    public confirmarRedefinicaoDeSenha = async (req: Request, res: Response): Promise<void> => {
        try {
            await this.servicoPrincipal.redefinirSenha(req.body.token, req.body.novaSenha);
            this.enviarRespostaDeSucesso(res, { mensagem: 'Senha redefinida com sucesso.' });
        } catch (excecao: any) {
            this.enviarFalhaDeValidacao(res, excecao.message, 400);
        }
    }
}
