"use client"; // Diretriz obrigatória para habilitar interatividade e corrigir o erro de renderização

import React, { useState, useEffect, FormEvent, ChangeEvent, ReactElement } from 'react';
import {
    X as IconeFechar,
    MapPin as IconeMapa,
    Camera as IconeCamera,
    AlertTriangle as IconeAlerta,
    Trash2 as IconeLixeira
} from 'lucide-react';
import * as ComponenteDialogo from '@radix-ui/react-dialog';
import estilosVisuais from './IncidentModal.module.css';
import servicoApi from '@/shared/lib/api';

// ============================================================================
// 1. Contratos e Interfaces
// ============================================================================

interface PropriedadesModalIncidente {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (dadosEstruturados: any) => void;
    initialLocation: [number, number] | null;
}

interface DadosOcorrencia {
    tipoSeveridade: string;
    categoriaEspecifica: string;
    descricaoDetalhada: string;
    latitude: number;
    longitude: number;
}

// ============================================================================
// 2. Classes de Domínio e Dicionários Estáticos
// ============================================================================

import { DicionarioCategorias } from '@/shared/domain/DicionarioCategorias';

// ============================================================================
// 3. Componente Principal
// ============================================================================

export default function ModalRegistroIncidente({
    isOpen,
    onClose,
    onSubmit,
    initialLocation
}: PropriedadesModalIncidente): ReactElement | null {

    // Estados do Componente
    const [etapaAtualFluxo, definirEtapaAtualFluxo] = useState<number>(1);
    const [formularioOcorrencia, definirFormularioOcorrencia] = useState<DadosOcorrencia>({
        tipoSeveridade: 'WARNING',
        categoriaEspecifica: '',
        descricaoDetalhada: '',
        latitude: 0,
        longitude: 0,
    });

    const [arquivosMidia, definirArquivosMidia] = useState<File[]>([]);
    const [previsualizacoesMidia, definirPrevisualizacoesMidia] = useState<string[]>([]);
    const [errosValidacao, definirErrosValidacao] = useState<Record<string, string>>({});
    const [enderecoLogradouro, definirEnderecoLogradouro] = useState<string>('');

    // Efeito: Busca do endereço físico por coordenadas (Geocodificação Reversa)
    useEffect(() => {
        if (initialLocation) {
            definirFormularioOcorrencia((estadoAnterior) => ({
                ...estadoAnterior,
                latitude: initialLocation[0],
                longitude: initialLocation[1],
            }));

            servicoApi.reverseGeocode(initialLocation[0], initialLocation[1])
                .then(definirEnderecoLogradouro)
                .catch(() => definirEnderecoLogradouro('Endereço não identificado'));
        }
    }, [initialLocation]);

    // Retorno preventivo (Early Return)
    if (!isOpen) return null;

    // ------------------------------------------------------------------------
    // Processamento Lógico e Regras de Negócio
    // ------------------------------------------------------------------------

    const executarValidacaoRegras = (): boolean => {
        const novosErros: Record<string, string> = {};

        if (!formularioOcorrencia.categoriaEspecifica) {
            novosErros.categoria = 'A seleção de uma categoria é obrigatória.';
        }

        if (formularioOcorrencia.descricaoDetalhada.length < 20) {
            novosErros.descricao = `A descrição necessita de no mínimo 20 caracteres (atual: ${formularioOcorrencia.descricaoDetalhada.length}).`;
        }

        if (formularioOcorrencia.descricaoDetalhada.length > 500) {
            novosErros.descricao = `O limite máximo é de 500 caracteres (atual: ${formularioOcorrencia.descricaoDetalhada.length}).`;
        }

        definirErrosValidacao(novosErros);
        return Object.keys(novosErros).length === 0;
    };

    const avancarParaProximaEtapa = (): void => {
        if (executarValidacaoRegras()) {
            definirEtapaAtualFluxo(2);
        }
    };

    const processarSubmissaoFinal = (evento: FormEvent): void => {
        evento.preventDefault();

        // Mapeamento dos dados para o contrato esperado pelo hook de mutação
        onSubmit({
            type: formularioOcorrencia.tipoSeveridade,
            category: formularioOcorrencia.categoriaEspecifica,
            description: formularioOcorrencia.descricaoDetalhada,
            lat: formularioOcorrencia.latitude,
            lng: formularioOcorrencia.longitude,
            time: new Date().toISOString(),
            author: 'Usuário Local',
            veracity: 1,
        });

        // Restauração de Estados
        definirEtapaAtualFluxo(1);
        definirFormularioOcorrencia({ tipoSeveridade: 'WARNING', categoriaEspecifica: '', descricaoDetalhada: '', latitude: 0, longitude: 0 });
        definirArquivosMidia([]);
        definirPrevisualizacoesMidia([]);
        definirErrosValidacao({});
        onClose();
    };

    const lidarComSelecaoArquivos = (evento: ChangeEvent<HTMLInputElement>): void => {
        const arquivosSelecionados = Array.from(evento.target.files || []);
        const tiposPermitidos = ['image/jpeg', 'image/png', 'image/webp', 'video/mp4'];
        const tamanhoMaximoBytes = 5 * 1024 * 1024; // 5 Megabytes

        for (const arquivo of arquivosSelecionados) {
            if (!tiposPermitidos.includes(arquivo.type)) {
                definirErrosValidacao((errosAnteriores) => ({ ...errosAnteriores, arquivos: `Formato rejeitado: ${arquivo.type}. Utilize JPG, PNG, WEBP ou MP4.` }));
                return;
            }
            if (arquivo.size > tamanhoMaximoBytes) {
                definirErrosValidacao((errosAnteriores) => ({ ...errosAnteriores, arquivos: 'O arquivo excede o limite de 5MB.' }));
                return;
            }
        }

        const arquivosConsolidados = [...arquivosMidia, ...arquivosSelecionados].slice(0, 3);
        definirArquivosMidia(arquivosConsolidados);

        const geradorDeImagens = arquivosConsolidados.map((arq) => URL.createObjectURL(arq));
        definirPrevisualizacoesMidia(geradorDeImagens);

        // Remove erro de arquivo caso exista
        definirErrosValidacao((errosAnteriores) => {
            const { arquivos: _, ...errosRestantes } = errosAnteriores;
            return errosRestantes;
        });
    };

    const excluirMidiaAnexada = (indiceAlvo: number): void => {
        definirArquivosMidia((listaAnterior) => listaAnterior.filter((_, indiceAtual) => indiceAtual !== indiceAlvo));
        definirPrevisualizacoesMidia((listaAnterior) => listaAnterior.filter((_, indiceAtual) => indiceAtual !== indiceAlvo));
    };

    // ------------------------------------------------------------------------
    // Renderização do Template JSX
    // ------------------------------------------------------------------------

    return (
        <ComponenteDialogo.Root open={isOpen} onOpenChange={(aberto) => !aberto && onClose()}>
            <ComponenteDialogo.Portal>
                <ComponenteDialogo.Overlay className={estilosVisuais.overlay} />
                <ComponenteDialogo.Content className={estilosVisuais.modal}>

                    <div className={estilosVisuais.header}>
                        <ComponenteDialogo.Title style={{ fontSize: 20, fontWeight: 700, margin: 0, color: "var(--text-primary)" }}>
                            Registrar Nova Ocorrência
                        </ComponenteDialogo.Title>
                        <ComponenteDialogo.Close asChild>
                            <button className={estilosVisuais.closeBtn} aria-label="Abortar inclusão">
                                <IconeFechar size={24} />
                            </button>
                        </ComponenteDialogo.Close>
                    </div>

                    {/* Correção crítica: Uso obrigatório do Dialog.Description para acessibilidade */}
                    <ComponenteDialogo.Description className="sr-only">
                        Formulário para preenchimento de detalhes e envio de evidências fotográficas do incidente.
                    </ComponenteDialogo.Description>

                    {/* Indicador de Progresso */}
                    <div style={{ display: 'flex', padding: '12px 24px', background: 'var(--bg-primary)', borderBottom: '1px solid var(--glass-border)', gap: 8 }}>
                        {[1, 2].map((passoNumerico) => (
                            <div key={passoNumerico} style={{ flex: 1, height: 4, borderRadius: 2, background: passoNumerico <= etapaAtualFluxo ? 'var(--primary-color)' : 'var(--glass-border)', transition: 'background 0.3s' }} />
                        ))}
                    </div>

                    <form onSubmit={processarSubmissaoFinal} className={estilosVisuais.content}>

                        {etapaAtualFluxo === 1 && (
                            <div className={estilosVisuais.step}>
                                <h3 style={{ color: "var(--text-primary)" }}>1. O que aconteceu?</h3>

                                <div className={estilosVisuais.typeSelector}>
                                    {[
                                        { chave: 'CRITICAL', rotulo: 'Crime Violento', subRotulo: 'Assalto, Agressão', estiloClass: 'activeCritical' },
                                        { chave: 'WARNING', rotulo: 'Furto / Risco', subRotulo: 'Furto, Acidente', estiloClass: 'activeWarning' },
                                        { chave: 'INFRASTRUCTURE', rotulo: 'Zeladoria', subRotulo: 'Falta de Luz, Buracos', estiloClass: 'activeWarning' },
                                        { chave: 'INFO', rotulo: 'Utilidade Pública', subRotulo: 'Bloqueio, Animais', estiloClass: 'activeEvent' },
                                        { chave: 'EVENT', rotulo: 'Evento Social', subRotulo: 'Feira, Mutirão', estiloClass: 'activeEvent' },
                                    ].map((opcao) => (
                                        <label key={opcao.chave} className={`${estilosVisuais.typeCard} ${formularioOcorrencia.tipoSeveridade === opcao.chave ? estilosVisuais[opcao.estiloClass] : ''}`}>
                                            <input type="radio" name="tipoSeveridade" value={opcao.chave} checked={formularioOcorrencia.tipoSeveridade === opcao.chave} onChange={(e) => definirFormularioOcorrencia({ ...formularioOcorrencia, tipoSeveridade: e.target.value, categoriaEspecifica: '' })} style={{ display: 'none' }} />
                                            <IconeAlerta size={22} />
                                            <span style={{ color: "var(--text-primary)" }}>{opcao.rotulo}</span>
                                            <small>{opcao.subRotulo}</small>
                                        </label>
                                    ))}
                                </div>

                                <div className={estilosVisuais.formGroup}>
                                    <label>Categoria Específica *</label>
                                    <select
                                        required
                                        value={formularioOcorrencia.categoriaEspecifica}
                                        onChange={(evento) => definirFormularioOcorrencia({ ...formularioOcorrencia, categoriaEspecifica: evento.target.value })}
                                        className={estilosVisuais.input}
                                        style={errosValidacao.categoria ? { borderColor: '#ef4444' } : {}}
                                    >
                                        <option value="">Selecione uma opção...</option>
                                        {(DicionarioCategorias.OPCOES[formularioOcorrencia.tipoSeveridade] || []).map((categoria) => (
                                            <option key={categoria.valor} value={categoria.valor}>{categoria.rotulo}</option>
                                        ))}
                                    </select>
                                    {errosValidacao.categoria && <span style={{ color: '#ef4444', fontSize: 12 }}>{errosValidacao.categoria}</span>}
                                </div>

                                <div className={estilosVisuais.formGroup}>
                                    <label>Descrição Detalhada * ({formularioOcorrencia.descricaoDetalhada.length}/500)</label>
                                    <textarea
                                        required
                                        placeholder="Relate minuciosamente o fato ocorrido..."
                                        className={estilosVisuais.input}
                                        rows={4}
                                        value={formularioOcorrencia.descricaoDetalhada}
                                        onChange={(evento) => definirFormularioOcorrencia({ ...formularioOcorrencia, descricaoDetalhada: evento.target.value })}
                                        maxLength={500}
                                        style={errosValidacao.descricao ? { borderColor: '#ef4444' } : {}}
                                    />
                                    {errosValidacao.descricao && <span style={{ color: '#ef4444', fontSize: 12 }}>{errosValidacao.descricao}</span>}
                                    {formularioOcorrencia.descricaoDetalhada.length < 20 && formularioOcorrencia.descricaoDetalhada.length > 0 && (
                                        <span style={{ color: '#f59e0b', fontSize: 11 }}>
                                            Escreva mais {20 - formularioOcorrencia.descricaoDetalhada.length} caracteres para habilitar.
                                        </span>
                                    )}
                                </div>

                                <button type="button" className={estilosVisuais.primaryBtn} onClick={avancarParaProximaEtapa}>
                                    Prosseguir
                                </button>
                            </div>
                        )}

                        {etapaAtualFluxo === 2 && (
                            <div className={estilosVisuais.step}>
                                <h3 style={{ color: "var(--text-primary)" }}>2. Evidências e Local</h3>

                                <div className={estilosVisuais.formGroup}>
                                    <label>Área Geográfica Mapeada</label>
                                    <div className={estilosVisuais.locationBox}>
                                        <IconeMapa size={20} color="var(--primary-color)" />
                                        <div style={{ flex: 1 }}>
                                            <span>
                                                {initialLocation ? `${initialLocation[0].toFixed(5)}, ${initialLocation[1].toFixed(5)}` : 'Aguardando seleção no mapa...'}
                                            </span>
                                            {enderecoLogradouro && (
                                                <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
                                                    📍 {enderecoLogradouro}
                                                </div>
                                            )}
                                        </div>
                                        {initialLocation && (
                                            <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: 'rgba(16,185,129,0.1)', color: '#10b981', fontWeight: 600 }}>
                                                ✓ Capturado
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className={estilosVisuais.formGroup}>
                                    <label>Acervo Multimídia (Máx: 3 arquivos, 5MB/cada)</label>

                                    {previsualizacoesMidia.length > 0 && (
                                        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                                            {previsualizacoesMidia.map((fonteImagem, indiceElemento) => (
                                                <div key={indiceElemento} style={{ width: 80, height: 80, borderRadius: 8, overflow: 'hidden', position: 'relative', border: '1px solid var(--glass-border)' }}>
                                                    <img src={fonteImagem} alt="Pré-visualização do anexo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                    <button type="button" onClick={() => excluirMidiaAnexada(indiceElemento)} style={{ position: 'absolute', top: 2, right: 2, background: 'rgba(239,68,68,0.9)', color: 'white', border: 'none', borderRadius: 4, width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 }}>
                                                        <IconeLixeira size={12} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {arquivosMidia.length < 3 && (
                                        <div className={estilosVisuais.uploadBox}>
                                            <IconeCamera size={24} />
                                            <span>Anexar Nova Mídia (Opcional)</span>
                                            <small style={{ color: 'var(--text-secondary)' }}>Extensões: JPG, PNG, WEBP, MP4</small>
                                            <input type="file" accept="image/jpeg,image/png,image/webp,video/mp4" multiple onChange={lidarComSelecaoArquivos} className={estilosVisuais.hiddenFile} />
                                        </div>
                                    )}
                                    {errosValidacao.arquivos && <span style={{ color: '#ef4444', fontSize: 12 }}>{errosValidacao.arquivos}</span>}
                                </div>

                                <div className={estilosVisuais.actionButtons}>
                                    <button type="button" className={estilosVisuais.secondaryBtn} onClick={() => definirEtapaAtualFluxo(1)}>
                                        Corrigir Etapa Anterior
                                    </button>
                                    <button type="submit" className={estilosVisuais.primaryBtn} disabled={!initialLocation} style={{ flex: 2 }}>
                                        🚨 Emitir Alerta Comunitário
                                    </button>
                                </div>
                            </div>
                        )}
                    </form>
                </ComponenteDialogo.Content>
            </ComponenteDialogo.Portal>
        </ComponenteDialogo.Root>
    );
}