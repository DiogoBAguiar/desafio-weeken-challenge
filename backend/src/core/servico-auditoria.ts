// ═══════════════════════════════════════════════════════════════
// Serviço de Auditoria — Log Centralizado
// Substitui os blocos de `prisma.logAuditoria.create()` duplicados
// em cada handler por uma chamada simples e padronizada.
// ═══════════════════════════════════════════════════════════════

import { PrismaClient } from '@prisma/client';
import { IProvedorDeConexao, IServicoDeAuditoria } from './interfaces';

export class ServicoDeAuditoria implements IServicoDeAuditoria {
    private bancoDeDados: PrismaClient;

    constructor(provedorBanco: IProvedorDeConexao) {
        this.bancoDeDados = provedorBanco.obterClienteBancoDeDados();
    }

    public async registrarAcao(
        usuarioId: number | undefined,
        nomeUsuario: string | undefined,
        acao: string,
        modulo: string,
        detalhes: any,
        ipOrigem: string,
        agenteDoNavegador: string
    ): Promise<void> {
        await this.bancoDeDados.logAuditoria.create({
            data: {
                usuarioId,
                nomeUsuario: nomeUsuario || 'SISTEMA_NAO_IDENTIFICADO',
                acao,
                modulo,
                detalhes: JSON.stringify(detalhes),
                ipOrigem,
                userAgent: agenteDoNavegador,
            }
        });
    }
}
