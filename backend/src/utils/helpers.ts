import { NIVEIS, PALAVRAS_PROIBIDAS, JITTER_RANGE } from './constants';

/**
 * Calculate user level based on points
 */
export function calcularNivel(pontuacao: number): string {
    if (pontuacao >= NIVEIS.GUARDIAO.min) return NIVEIS.GUARDIAO.nome;
    if (pontuacao >= NIVEIS.SENTINELA.min) return NIVEIS.SENTINELA.nome;
    if (pontuacao >= NIVEIS.COLABORADOR.min) return NIVEIS.COLABORADOR.nome;
    return NIVEIS.INICIANTE.nome;
}

/**
 * Calculate distance between two coordinates in km (Haversine)
 */
export function calcularDistanciaKm(
    lat1: number, lon1: number,
    lat2: number, lon2: number
): number {
    const R = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

function toRad(deg: number): number {
    return deg * (Math.PI / 180);
}

/**
 * Apply jitter to coordinates for privacy (5-10m offset)
 */
export function aplicarJitter(lat: number, lng: number): [number, number] {
    const jitterLat = (Math.random() * JITTER_RANGE) - (JITTER_RANGE / 2);
    const jitterLng = (Math.random() * JITTER_RANGE) - (JITTER_RANGE / 2);
    return [
        lat + (Math.random() > 0.5 ? jitterLat : -jitterLat),
        lng + (Math.random() > 0.5 ? jitterLng : -jitterLng),
    ];
}

/**
 * Check for profanity in text
 */
export function contemPalavrasProibidas(texto: string): boolean {
    const lower = texto.toLowerCase();
    return PALAVRAS_PROIBIDAS.some(p => lower.includes(p));
}

/**
 * Sanitize text input to prevent XSS
 */
export function sanitizar(texto: string): string {
    return texto
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;');
}

/**
 * Validate email format (RFC 5322 simplified)
 */
export function validarEmail(email: string): boolean {
    const re = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    return re.test(email);
}

/**
 * Validate password strength
 */
export function validarSenha(senha: string): { valido: boolean; mensagem: string } {
    if (senha.length < 8) return { valido: false, mensagem: 'Senha deve ter no mínimo 8 caracteres' };
    if (!/[A-Z]/.test(senha)) return { valido: false, mensagem: 'Senha deve conter pelo menos uma letra maiúscula' };
    if (!/[a-z]/.test(senha)) return { valido: false, mensagem: 'Senha deve conter pelo menos uma letra minúscula' };
    if (!/[0-9]/.test(senha)) return { valido: false, mensagem: 'Senha deve conter pelo menos um número' };
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(senha)) return { valido: false, mensagem: 'Senha deve conter pelo menos um caractere especial' };
    return { valido: true, mensagem: 'OK' };
}

/**
 * Generate a random token
 */
export function gerarToken(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

/**
 * Format date for display
 */
export function formatarData(data: Date): string {
    return data.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}
