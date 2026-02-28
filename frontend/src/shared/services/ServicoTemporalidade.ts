export interface ResultadoRelevanciaVisual {
    opacidade: number;
    animacaoPulsante: boolean;
    texto: string;
    ehConsideradoAntigo: boolean;
}

export abstract class ServicoTemporalidade {
    public static calcularRelevanciaVisual(dataRegistroIso: string): ResultadoRelevanciaVisual {
        const dataRegistro = new Date(dataRegistroIso);
        const agora = new Date();

        const diferencaMilissegundos = agora.getTime() - dataRegistro.getTime();
        const diferencaHoras = diferencaMilissegundos / (1000 * 60 * 60);

        if (diferencaHoras < 24) {
            return {
                opacidade: 1.0,
                animacaoPulsante: true,
                texto: 'Hoje (Recente)',
                ehConsideradoAntigo: false
            };
        }

        if (diferencaHoras >= 24 && diferencaHoras <= 72) {
            return {
                opacidade: 0.85,
                animacaoPulsante: false,
                texto: 'Últimos dias',
                ehConsideradoAntigo: false
            };
        }

        return {
            opacidade: 0.5,
            animacaoPulsante: false,
            texto: 'Histórico antigo',
            ehConsideradoAntigo: true
        };
    }
}
