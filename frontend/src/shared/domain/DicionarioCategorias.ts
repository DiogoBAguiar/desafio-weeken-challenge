export interface CategoriaIncidente {
    chave: string;
    rotulo: string;
    subcategorias: { rotulo: string; valor: string }[];
}

export class DicionarioCategorias {
    public static readonly CRITICAL: CategoriaIncidente = {
        chave: 'CRITICAL',
        rotulo: 'Crimes graves',
        subcategorias: [
            { rotulo: 'Assalto', valor: 'Assalto' },
            { rotulo: 'Homicídio', valor: 'Homicídio' },
            { rotulo: 'Agressão (Violência)', valor: 'Agressão (Violência)' }
        ]
    };

    public static readonly WARNING: CategoriaIncidente = {
        chave: 'WARNING',
        rotulo: 'Furtos e riscos',
        subcategorias: [
            { rotulo: 'Furto', valor: 'Furto' },
            { rotulo: 'Atitude suspeita', valor: 'Atitude suspeita' },
            { rotulo: 'Vandalismo', valor: 'Vandalismo' }
        ]
    };

    public static readonly INFRASTRUCTURE: CategoriaIncidente = {
        chave: 'INFRASTRUCTURE',
        rotulo: 'Zeladoria Urbana',
        subcategorias: [
            { rotulo: 'Falta de luz', valor: 'Falta de luz' },
            { rotulo: 'Buracos na via', valor: 'Buracos na via' },
            { rotulo: 'Árvore caída', valor: 'Árvore caída' }
        ]
    };

    public static readonly INFO: CategoriaIncidente = {
        chave: 'INFO',
        rotulo: 'Utilidade Pública',
        subcategorias: [
            { rotulo: 'Animais perdidos', valor: 'Animais perdidos' },
            { rotulo: 'Bloqueio de via', valor: 'Bloqueio de via' },
            { rotulo: 'Alagamento', valor: 'Alagamento' }
        ]
    };

    public static readonly EVENT: CategoriaIncidente = {
        chave: 'EVENT',
        rotulo: 'Ações Sociais',
        subcategorias: [
            { rotulo: 'Feiras', valor: 'Feiras' },
            { rotulo: 'Esportes no parque', valor: 'Esportes no parque' },
            { rotulo: 'Encontro comunitário', valor: 'Encontro comunitário' }
        ]
    };

    public static obterTodasCategorias(): CategoriaIncidente[] {
        return [
            this.CRITICAL,
            this.WARNING,
            this.INFRASTRUCTURE,
            this.INFO,
            this.EVENT
        ];
    }

    public static readonly OPCOES: Record<string, { rotulo: string; valor: string }[]> = {
        CRITICAL: this.CRITICAL.subcategorias,
        WARNING: this.WARNING.subcategorias,
        INFRASTRUCTURE: this.INFRASTRUCTURE.subcategorias,
        INFO: this.INFO.subcategorias,
        EVENT: this.EVENT.subcategorias,
    };
}
