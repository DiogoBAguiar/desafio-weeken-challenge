"use client";

import React, { ReactElement } from 'react';
import { usarArmazenamentoNotificacao, EntidadeNotificacao } from '@/shared/lib/toastStore';
import { X, CheckCircle, AlertTriangle, Info, ShieldAlert } from 'lucide-react';
import estilosVisuais from './Toast.module.css';

// -----------------------------------------------------------------------------
// 1. Abstrações e Padrão Factory para Resolução de Ícones
// -----------------------------------------------------------------------------

abstract class FabricaIconesNotificacao {
    /**
     * Centraliza a lógica condicional de renderização dos ícones.
     * Isso remove a complexidade do componente visual e facilita a manutenção.
     */
    public static construirIcone(categoria: string): ReactElement {
        const tamanhoPadraoIcone = 20;

        switch (categoria) {
            case 'sucesso':
                return <CheckCircle size={tamanhoPadraoIcone} />;
            case 'erro':
                return <ShieldAlert size={tamanhoPadraoIcone} />;
            case 'alerta':
                return <AlertTriangle size={tamanhoPadraoIcone} />;
            case 'informacao':
            default:
                return <Info size={tamanhoPadraoIcone} />;
        }
    }
}

// -----------------------------------------------------------------------------
// 2. Contratos (Interfaces)
// -----------------------------------------------------------------------------

interface PropriedadesItemNotificacao {
    dadosNotificacao: EntidadeNotificacao;
    eventoDescartar: (identificadorUnico: string) => void;
}

// -----------------------------------------------------------------------------
// 3. Composição: Componente Atômico de Notificação
// -----------------------------------------------------------------------------

/**
 * Representa uma unidade de notificação independente, encapsulando seu próprio
 * ciclo de vida de renderização e estilos isolados.
 */
function ElementoNotificacao({ dadosNotificacao, eventoDescartar }: PropriedadesItemNotificacao): ReactElement {
    // Aplicação de classes dinâmicas com fallback de segurança
    const classeCategoria = estilosVisuais[dadosNotificacao.categoria] || '';
    const classesCombinadas = `${estilosVisuais.toast} ${classeCategoria}`;

    return (
        <div 
            className={classesCombinadas} 
            role="alert" 
            aria-live="assertive"
        >
            <div className={estilosVisuais.icon}>
                {FabricaIconesNotificacao.construirIcone(dadosNotificacao.categoria)}
            </div>
            
            <div className={estilosVisuais.message}>
                <p>{dadosNotificacao.conteudoMensagem}</p>
            </div>
            
            <button
                onClick={() => eventoDescartar(dadosNotificacao.identificadorUnico)}
                className={estilosVisuais.closeButton}
                aria-label="Fechar notificação"
            >
                <X size={16} />
            </button>
        </div>
    );
}

// -----------------------------------------------------------------------------
// 4. Componente Principal: Contêiner Orquestrador
// -----------------------------------------------------------------------------

/**
 * Orquestrador global que assina as mudanças de estado da Store Zustand
 * e delega a renderização iterativa para os componentes filhos.
 */
export default function ContenedorNotificacoesGlobal(): ReactElement | null {
    // Correção do erro: Desestruturação utilizando a nomenclatura exata da Store
    const { 
        listaNotificacoes, 
        descartarNotificacao 
    } = usarArmazenamentoNotificacao();

    // Early return pattern: Aborta a renderização se a estrutura de dados estiver vazia
    if (listaNotificacoes.length === 0) {
        return null;
    }

    return (
        <div className={estilosVisuais.toastContainer} aria-label="Área de notificações do sistema">
            {listaNotificacoes.map((notificacaoAtual) => (
                <ElementoNotificacao
                    key={notificacaoAtual.identificadorUnico}
                    dadosNotificacao={notificacaoAtual}
                    eventoDescartar={descartarNotificacao}
                />
            ))}
        </div>
    );
}