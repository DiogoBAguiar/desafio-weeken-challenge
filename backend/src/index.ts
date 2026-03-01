class ConfiguracaoCorsNuvem implements IProvedorSegurancaWeb {
    // A tipagem agora suporta Expressões Regulares (RegExp) para validação dinâmica
    private readonly dominiosAutorizados: (string | RegExp)[];

    constructor() {
        // Integração de variáveis de ambiente para garantir escalabilidade
        const dominioProducao = process.env.URL_FRONTEND_PRODUCAO || 'https://comunidade-viva.vercel.app';

        this.dominiosAutorizados = [
            'http://localhost:3000',
            'http://localhost:3001',
            dominioProducao,
            // Expressão regular vital para permitir os deploys dinâmicos do Vercel
            /^https:\/\/comunidade-viva-[a-zA-Z0-9]+-diogobaguiars-projects\.vercel\.app$/
        ];
    }

    public obterPoliticasAcesso(): CorsOptions {
        return {
            origin: (origemRequisicao, chamadaRetorno) => {
                // Valida a requisição através do método de verificação de padrões
                if (!origemRequisicao || this.verificarOrigemAutorizada(origemRequisicao)) {
                    chamadaRetorno(null, true);
                } else {
                    console.warn(`[Alerta de Segurança] Bloqueio CORS originado por: ${origemRequisicao}`);
                    chamadaRetorno(new Error(`[Segurança] Tráfego não autorizado. Origem bloqueada: ${origemRequisicao}`));
                }
            },
            credentials: true,
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
            allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
        };
    }

    /**
     * Método utilitário encapsulado para avaliar se a origem entrante 
     * coincide com uma String exata ou satisfaz uma Expressão Regular.
     */
    private verificarOrigemAutorizada(origem: string): boolean {
        return this.dominiosAutorizados.some((dominioPermitido) => {
            if (typeof dominioPermitido === 'string') {
                return dominioPermitido === origem;
            }
            // Executa a validação por Regex caso não seja uma string
            return dominioPermitido.test(origem);
        });
    }
}