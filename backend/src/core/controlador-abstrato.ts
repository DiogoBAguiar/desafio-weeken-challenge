// ═══════════════════════════════════════════════════════════════
// Controlador Abstrato — Classe Base para Todos os Controladores
// Padroniza como TODOS os controladores da aplicação respondem:
// - Sucesso, Validação, Exceções
// Qualquer novo controlador deve herdar desta classe.
// ═══════════════════════════════════════════════════════════════

import { Request, Response } from 'express';
import { IContextoDeRede } from './interfaces';

export abstract class ControladorAbstrato {
    /**
     * Resposta de sucesso padronizada.
     */
    protected enviarRespostaDeSucesso(resposta: Response, dados: any, codigoHttp: number = 200): void {
        resposta.status(codigoHttp).json(dados);
    }

    /**
     * Tratamento de exceções gerais (erros inesperados do sistema).
     */
    protected gerenciarExcecoesGerais(resposta: Response, erro: unknown, mensagemDeQueda: string, codigoHttp: number = 500): void {
        console.error(`[Falha no Controlador]:`, erro);
        const detalheDoErro = erro instanceof Error ? erro.message : mensagemDeQueda;
        resposta.status(codigoHttp).json({ error: detalheDoErro });
    }

    /**
     * Resposta de falha de validação (dados inválidos, regras de negócio violadas).
     */
    protected enviarFalhaDeValidacao(resposta: Response, mensagem: string, codigoHttp: number = 400): void {
        resposta.status(codigoHttp).json({ error: mensagem });
    }

    /**
     * Extrai IP e User-Agent de uma requisição HTTP de forma padronizada.
     */
    protected extrairContextoDeRede(requisicao: Request): IContextoDeRede {
        return {
            ip: requisicao.ip || requisicao.socket.remoteAddress || 'Endereço Indisponível',
            agente: requisicao.get('User-Agent') || 'Agente Não Mapeado'
        };
    }
}
