// Constants for the Comunidade Segura application

export const JWT_SECRET = process.env.JWT_SECRET || 'comunidade-segura-secret-key-2026';
export const JWT_EXPIRES_IN = '24h';
export const BCRYPT_ROUNDS = 12;

// Rate limits
export const MAX_INCIDENTS_PER_HOUR = 3;
export const MAX_LOGIN_ATTEMPTS = 5;
export const LOGIN_BLOCK_MINUTES = 30;

// Geolocation
export const PROXIMITY_RADIUS_KM = 0.5; // 500m
export const VOTE_RADIUS_KM = 1; // 1km
export const DEFAULT_CITY_LAT = -7.11532;
export const DEFAULT_CITY_LNG = -34.86105;
export const GEOLOCATION_TIMEOUT = 10000;

// Veracidade
export const VERACITY_HIDE_THRESHOLD = -5;
export const VERACITY_VERIFIED_THRESHOLD = 5;

// Gamificação
export const POINTS = {
    RELATO_CRIADO: 10,
    CONFIRMACAO_RELATO: 2,
    DENUNCIA_PROCEDENTE: 5,
    RELATO_FALSO: -20,
    VOTO_EM_FALSO: -5,
    DENUNCIA_IMPROCEDENTE: -2,
};

export const NIVEIS = {
    INICIANTE: { min: 0, max: 100, nome: 'Iniciante' },
    COLABORADOR: { min: 101, max: 500, nome: 'Colaborador' },
    SENTINELA: { min: 501, max: 1500, nome: 'Sentinela' },
    GUARDIAO: { min: 1501, max: Infinity, nome: 'Guardião da Comunidade' },
};

export const SUSPENSION_THRESHOLD = -50;

// Upload
export const MAX_FILES_PER_INCIDENT = 3;
export const MAX_FILE_SIZE_MB = 5;
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const ALLOWED_VIDEO_TYPES = ['video/mp4'];

// Heatmap
export const HEATMAP_DAYS = 30;
export const HEATMAP_MIN_INCIDENTS = 3;
export const JITTER_RANGE = 0.0001; // ~10 meters

// Categories
export const INCIDENT_CATEGORIES = [
    'Assalto à mão armada',
    'Homicídio/Tiroteio',
    'Agressão Física',
    'Furto',
    'Buraco na Via',
    'Iluminação Deficiente',
    'Acidente de Trânsito',
];

export const EVENT_CATEGORIES = [
    'Mutirão de Limpeza',
    'Feira de Bairro',
    'Festa Comunitária',
    'Reunião de Bairro',
    'Evento Esportivo',
];

export const SECURITY_CATEGORIES = [
    'Assalto à mão armada',
    'Homicídio/Tiroteio',
    'Agressão Física',
    'Furto',
];

export const CRITICAL_CATEGORIES = [
    'Assalto à mão armada',
    'Homicídio/Tiroteio',
];

export const ROLES = {
    VISITANTE: 'VISITANTE',
    MEMBRO: 'MEMBRO',
    MODERADOR: 'MODERADOR',
    ADMIN: 'ADMIN',
    ORGAO_SEGURANCA: 'ORGAO_SEGURANCA',
};

export const MEDALS = [
    { codigo: 'PRIMEIRO_RELATO', nome: 'Primeiro Relato', descricao: 'Fez seu primeiro relato na comunidade', icone: '🏅' },
    { codigo: 'VIGILANTE_MES', nome: 'Vigilante do Mês', descricao: 'Maior engajamento positivo do mês', icone: '🏆' },
    { codigo: 'CONFIRMADOR_SERIAL', nome: 'Confirmador Serial', descricao: 'Confirmou 50+ relatos', icone: '✅' },
    { codigo: 'HISTORICO_IMPECAVEL', nome: 'Histórico Impecável', descricao: 'Nenhum relato falso em 6 meses', icone: '⭐' },
    { codigo: 'SENTINELA', nome: 'Sentinela da Comunidade', descricao: 'Alcançou nível Sentinela', icone: '🛡️' },
    { codigo: 'GUARDIAO', nome: 'Guardião da Comunidade', descricao: 'Alcançou nível Guardião', icone: '🏰' },
];

// Profanity filter (basic)
export const PALAVRAS_PROIBIDAS = [
    'idiota', 'imbecil', 'burro', 'otário', 'merda',
    // Add more as needed - simplified for demo
];
