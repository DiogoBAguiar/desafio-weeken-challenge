// ═══════════════════════════════════════════════════════════════
// Provedor de Segurança Padrão
// Centraliza bcrypt, JWT e TOTP em uma classe testável.
// Nenhum outro módulo precisa importar bcrypt/jwt diretamente.
// ═══════════════════════════════════════════════════════════════

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { authenticator } from 'otplib';
import { IProvedorDeSeguranca } from './interfaces';
import { JWT_SECRET, BCRYPT_ROUNDS } from '../utils/constants';

export class ProvedorDeSegurancaPadrao implements IProvedorDeSeguranca {
    public async gerarHashSincrono(dadoOriginal: string): Promise<string> {
        return bcrypt.hash(dadoOriginal, BCRYPT_ROUNDS);
    }

    public async compararHashSincrono(dadoOriginal: string, hashArmazenado: string): Promise<boolean> {
        return bcrypt.compare(dadoOriginal, hashArmazenado);
    }

    public assinarToken(cargaUtil: object, tempoExpiracao: string | number): string {
        return jwt.sign(cargaUtil, JWT_SECRET, { expiresIn: tempoExpiracao as any });
    }

    public verificarToken(token: string): any {
        return jwt.verify(token, JWT_SECRET);
    }

    public gerarSegredoTotp(): string {
        return authenticator.generateSecret();
    }

    public gerarUriTotp(email: string, emissor: string, segredo: string): string {
        return authenticator.keyuri(email, emissor, segredo);
    }

    public verificarCodigoTotp(codigo: string, segredo: string): boolean {
        return authenticator.verify({ token: codigo, secret: segredo });
    }
}
