// ═══════════════════════════════════════════════════════════════
// Contratos e Abstrações — Fundação Arquitetural
// Todas as interfaces que definem os "contratos" que qualquer
// módulo do sistema deve respeitar.
// ═══════════════════════════════════════════════════════════════

import { PrismaClient } from '@prisma/client';

/**
 * Contrato para acesso ao banco de dados.
 * Garante instância única compartilhada entre todos os módulos.
 */
export interface IProvedorDeConexao {
    obterClienteBancoDeDados(): PrismaClient;
}

/**
 * Contrato para operações de segurança (criptografia, tokens, TOTP).
 * Centraliza toda lógica sensível em um único ponto.
 */
export interface IProvedorDeSeguranca {
    gerarHashSincrono(dadoOriginal: string): Promise<string>;
    compararHashSincrono(dadoOriginal: string, hashArmazenado: string): Promise<boolean>;
    assinarToken(cargaUtil: object, tempoExpiracao: string | number): string;
    verificarToken(token: string): any;
    gerarSegredoTotp(): string;
    gerarUriTotp(email: string, emissor: string, segredo: string): string;
    verificarCodigoTotp(codigo: string, segredo: string): boolean;
}

/**
 * Contrato para o serviço de auditoria.
 * Todo módulo que precisar registrar ações usa esta interface.
 */
export interface IServicoDeAuditoria {
    registrarAcao(
        usuarioId: number | undefined,
        nomeUsuario: string | undefined,
        acao: string,
        modulo: string,
        detalhes: any,
        ipOrigem: string,
        agenteDoNavegador: string
    ): Promise<void>;
}

/**
 * Contexto de rede extraído da requisição HTTP.
 * Padroniza como os dados de IP e User-Agent são passados.
 */
export interface IContextoDeRede {
    ip: string;
    agente: string;
}
