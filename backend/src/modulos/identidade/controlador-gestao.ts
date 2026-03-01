// ═══════════════════════════════════════════════════════════════
// Controlador de Gestão de Conta — Camada HTTP para Perfil/Sessões/2FA
// Traduz Request/Response ↔ ServicoDeGestaoDeConta.
// Herda respostas padronizadas de ControladorAbstrato.
// ═══════════════════════════════════════════════════════════════

import { Request, Response } from 'express';
import { ControladorAbstrato } from '../../core/controlador-abstrato';
import { ServicoDeGestaoDeConta } from './servico-gestao-conta';

export class ControladorDeGestaoDeConta extends ControladorAbstrato {
    private servicoGestor: ServicoDeGestaoDeConta;

    constructor(servicoDeGestao: ServicoDeGestaoDeConta) {
        super();
        this.servicoGestor = servicoDeGestao;
    }

    /**
     * POST /logout — Encerrar sessão atual
     */
    public efetuarLogout = async (req: Request, res: Response): Promise<void> => {
        try {
            const tokenRecuperado = req.headers.authorization?.split(' ')[1];
            if (tokenRecuperado && req.usuario) {
                const contexto = this.extrairContextoDeRede(req);
                await this.servicoGestor.destituirSessaoAtual(
                    tokenRecuperado,
                    req.usuario.id,
                    req.usuario.pseudonimo,
                    contexto
                );
            }
            this.enviarRespostaDeSucesso(res, { mensagem: 'Logout realizado com sucesso.' });
        } catch (excecao: any) {
            this.gerenciarExcecoesGerais(res, excecao, 'Erro ao realizar logout.');
        }
    }

    /**
     * GET /me — Buscar perfil do usuário autenticado
     */
    public buscarPerfilDoUsuario = async (req: Request, res: Response): Promise<void> => {
        try {
            if (!req.usuario) throw new Error('Sessão inválida.');
            const perfilEncontrado = await this.servicoGestor.obterPerfilAtual(req.usuario.id);
            this.enviarRespostaDeSucesso(res, perfilEncontrado);
        } catch (excecao: any) {
            this.gerenciarExcecoesGerais(res, excecao, 'Erro ao buscar perfil.');
        }
    }

    /**
     * PUT /profile — Atualizar dados do perfil
     */
    public modificarPerfil = async (req: Request, res: Response): Promise<void> => {
        try {
            if (!req.usuario) throw new Error('Sessão inválida.');
            const perfilModificado = await this.servicoGestor.atualizarDadosDoPerfil(
                req.usuario.id, req.body
            );
            this.enviarRespostaDeSucesso(res, {
                mensagem: 'Perfil atualizado com sucesso.',
                usuario: perfilModificado
            });
        } catch (excecao: any) {
            const codigoHttp = excecao.message.includes('em uso') ? 409 : 400;
            this.enviarFalhaDeValidacao(res, excecao.message, codigoHttp);
        }
    }

    /**
     * GET /sessions — Listar sessões ativas
     */
    public obterSessoesConectadas = async (req: Request, res: Response): Promise<void> => {
        try {
            if (!req.usuario) throw new Error('Sessão inválida.');
            const listaDeSessoes = await this.servicoGestor.listarSessoesAtivas(req.usuario.id);
            this.enviarRespostaDeSucesso(res, listaDeSessoes);
        } catch (excecao: any) {
            this.gerenciarExcecoesGerais(res, excecao, 'Erro ao buscar sessões.');
        }
    }

    /**
     * DELETE /sessions/:id — Encerrar sessão específica
     */
    public removerSessao = async (req: Request, res: Response): Promise<void> => {
        try {
            if (!req.usuario) throw new Error('Sessão inválida.');
            await this.servicoGestor.encerrarSessaoEspecifica(
                req.usuario.id,
                parseInt(req.params.id as string, 10)
            );
            this.enviarRespostaDeSucesso(res, { mensagem: 'Sessão encerrada.' });
        } catch (excecao: any) {
            this.gerenciarExcecoesGerais(res, excecao, 'Erro ao encerrar sessão.');
        }
    }

    /**
     * POST /2fa/setup — Iniciar configuração de 2FA
     */
    public iniciarConfiguracaoTotp = async (req: Request, res: Response): Promise<void> => {
        try {
            if (!req.usuario) throw new Error('Sessão inválida.');
            const metadadosDeProvisionamento = await this.servicoGestor.iniciarConfiguracaoDoisFatores(
                req.usuario.id,
                req.usuario.email
            );
            this.enviarRespostaDeSucesso(res, metadadosDeProvisionamento);
        } catch (excecao: any) {
            this.gerenciarExcecoesGerais(res, excecao, 'Erro ao configurar 2FA.');
        }
    }

    /**
     * POST /2fa/verify — Verificar código TOTP e ativar 2FA
     */
    public validarCodigoTotp = async (req: Request, res: Response): Promise<void> => {
        try {
            if (!req.usuario) throw new Error('Sessão inválida.');
            await this.servicoGestor.confirmarEAtivarDoisFatores(req.usuario.id, req.body.code);
            this.enviarRespostaDeSucesso(res, {
                mensagem: 'Autenticação de dois fatores ativada com sucesso!'
            });
        } catch (excecao: any) {
            this.enviarFalhaDeValidacao(res, excecao.message);
        }
    }

    /**
     * POST /2fa/disable — Desativar 2FA (requer senha)
     */
    public desativarTotp = async (req: Request, res: Response): Promise<void> => {
        try {
            if (!req.usuario) throw new Error('Sessão inválida.');
            await this.servicoGestor.desativarDoisFatores(req.usuario.id, req.body.senha);
            this.enviarRespostaDeSucesso(res, { mensagem: '2FA desativado.' });
        } catch (excecao: any) {
            const codigoHttp = excecao.message.includes('incorreta') ? 401 : 400;
            this.enviarFalhaDeValidacao(res, excecao.message, codigoHttp);
        }
    }

    /**
     * POST /verify-password — Verificar senha atual (para confirmações admin)
     */
    public verificarSenha = async (req: Request, res: Response): Promise<void> => {
        try {
            if (!req.usuario) throw new Error('Sessão inválida.');
            await this.servicoGestor.verificarSenhaAtual(req.usuario.id, req.body.senha);
            this.enviarRespostaDeSucesso(res, { valido: true });
        } catch (excecao: any) {
            const codigoHttp = excecao.message.includes('incorreta') ? 401 : 400;
            this.enviarFalhaDeValidacao(res, excecao.message, codigoHttp);
        }
    }
}
