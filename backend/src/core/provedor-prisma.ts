// ═══════════════════════════════════════════════════════════════
// Provedor Prisma — Instância Única do Banco de Dados
// Substitui os múltiplos `new PrismaClient()` espalhados
// pelos arquivos de rotas por uma única instância compartilhada.
// ═══════════════════════════════════════════════════════════════

import { PrismaClient } from '@prisma/client';
import { IProvedorDeConexao } from './interfaces';

export class ProvedorPrisma implements IProvedorDeConexao {
    private clienteConexao: PrismaClient;

    constructor() {
        this.clienteConexao = new PrismaClient();
    }

    public obterClienteBancoDeDados(): PrismaClient {
        return this.clienteConexao;
    }
}
