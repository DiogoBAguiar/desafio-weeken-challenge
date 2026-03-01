"use client";

import React, { useEffect, useState, ReactElement } from "react";
import {
    MapContainer,
    TileLayer,
    Marker,
    Popup,
    Tooltip,
    useMap,
    useMapEvents,
    ZoomControl,
    Circle
} from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import L, { DivIcon } from "leaflet";
import "leaflet.heat";
import {
    Target as Alvo, Layers as Camadas, X as Fechar, Flame as Fogo, ThumbsUp as PolegarCima, ThumbsDown as PolegarBaixo,
    Flag as Bandeira, Plus as Adicionar, WifiOff as SemWifi, Sun as Sol, Moon as Lua, ChevronDown as SetaBaixo, ChevronUp as SetaCima
} from "lucide-react";
import estilosVisuais from "./Map.module.css";
import ModalIncidente from "@/features/incidents/components/IncidentModal/IncidentModal";
import { DicionarioCategorias } from "@/shared/domain/DicionarioCategorias";
import { ServicoTemporalidade } from "@/shared/services/ServicoTemporalidade";

// Importações com Alias para manter o uso interno 100% em português
import { useAuth as usarAutenticacao } from "@/features/auth/AuthContext";
import { usarNotificacao, CategoriaNotificacao } from "@/shared/lib/toastStore";
import { useMapStore as usarArmazenamentoMapa } from "@/features/map/store/useMapStore";
import {
    useMapIncidents as usarIncidentesMapa,
    useHeatmapData as usarDadosMapaCalor,
    useVoteIncident as usarVotoIncidente,
    useReportIncident as usarDenunciaIncidente,
    useCreateIncident as usarCriacaoIncidente,
    useCreateEvento as usarCriacaoEvento
} from "@/features/map/api/useMapData";

// ============================================================================
// 1. Tipagens e Contratos (Interfaces)
// ============================================================================

export type TipoCategoria = "CRITICAL" | "WARNING" | "INFRASTRUCTURE" | "INFO" | "EVENT" | "ANTIGOS";

interface LimitesGeograficosMapa {
    minLat: number;
    maxLat: number;
    minLng: number;
    maxLng: number;
}

interface PropriedadesMudancaVisao {
    centro: [number, number];
    zoom: number;
}

interface PropriedadesCamadaCalor {
    pontos: [number, number, number][];
    exibir: boolean;
}

// ============================================================================
// 2. Classes de Domínio e Padrão Factory
// ============================================================================

abstract class ConfiguracaoGlobalMapa {
    public static readonly TILES_MODO_DIA = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
    public static readonly TILES_MODO_NOITE = "https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png";
    public static readonly COORDENADA_CENTRAL_PADRAO: [number, number] = [-7.11532, -34.86105];
    public static readonly ZOOM_INICIAL_PADRAO = 13;
}

abstract class FabricaElementosGeograficos {
    public static construirIconeUsuario(): DivIcon {
        return L.divIcon({
            html: `<div style="width:18px;height:18px;background:#3b82f6;border-radius:50%;border:3px solid white;box-shadow:0 0 0 6px rgba(59,130,246,0.3),0 2px 6px rgba(0,0,0,0.3);animation:pulse 2s infinite"></div>`,
            className: "",
            iconSize: [18, 18],
            iconAnchor: [9, 9],
        });
    }

    public static construirIconeIncidente(tipoSeveridade: string, dataCriacaoIso: string): DivIcon {
        const metadadosVisuais = ServicoTemporalidade.calcularRelevanciaVisual(dataCriacaoIso);

        let corHexadecimal = "#3b82f6";
        let classeCss = metadadosVisuais.animacaoPulsante ? estilosVisuais.pulsingMarker || "" : "";
        let svgInterno = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`;

        if (tipoSeveridade === "CRITICAL") {
            corHexadecimal = "#ef4444";
            svgInterno = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`;
        } else if (tipoSeveridade === "WARNING") {
            corHexadecimal = "#f59e0b";
            svgInterno = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>`;
        } else if (tipoSeveridade === "INFRASTRUCTURE") {
            corHexadecimal = "#eab308"; // Amarelo
            svgInterno = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>`;
        } else if (tipoSeveridade === "INFO") {
            corHexadecimal = "#06b6d4"; // Cyan
            svgInterno = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>`;
        } else if (tipoSeveridade === "EVENT") {
            corHexadecimal = "#10b981"; // Verde
            svgInterno = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`;
        }

        return L.divIcon({
            html: `<div style="background-color:${corHexadecimal};width:36px;height:36px;display:flex;align-items:center;justify-content:center;border-radius:50%;box-shadow:0 3px 8px rgba(0,0,0,0.3);border:2.5px solid white;opacity:${metadadosVisuais.opacidade};">${svgInterno}</div>`,
            className: classeCss,
            iconSize: [36, 36],
            iconAnchor: [18, 18],
            popupAnchor: [0, -20],
        });
    }

    public static construirIconeAgrupamento(agrupamento: any): DivIcon {
        const quantidadeFilhos = agrupamento.getChildCount();
        return L.divIcon({
            html: `<span>${quantidadeFilhos}</span>`,
            className: estilosVisuais.markerCluster,
            iconSize: L.point(42, 42, true),
        });
    }
}

// ============================================================================
// 3. Subcomponentes (Composição)
// ============================================================================

interface PropriedadesOuvinteMapa {
    estaAutenticado: boolean;
    notificar: (mensagem: string, categoria?: CategoriaNotificacao) => void;
    aoClicar: (coordenadas: [number, number]) => void;
    aoMover: (limites: LimitesGeograficosMapa) => void;
    aoArrastar: () => void;
}

function OuvinteIteracoesMapa({
    estaAutenticado,
    notificar,
    aoClicar,
    aoMover,
    aoArrastar
}: PropriedadesOuvinteMapa): null {
    const controleMapaLeaflet = useMapEvents({
        click(eventoClique) {
            console.log("Cliquei no mapa!", eventoClique.latlng); // <-- Adicionado para testar

            if (!estaAutenticado) {
                notificar("Autenticação requerida para novos registros.", "alerta");
                return;
            }

            aoClicar([eventoClique.latlng.lat, eventoClique.latlng.lng]);
        },
        moveend() {
            const bordasGeograficas = controleMapaLeaflet.getBounds();
            aoMover({
                minLat: bordasGeograficas.getSouth(),
                maxLat: bordasGeograficas.getNorth(),
                minLng: bordasGeograficas.getWest(),
                maxLng: bordasGeograficas.getEast(),
            });
        },
        dragstart() {
            aoArrastar();
        },
    });
    return null;
}

function ControladorFocoGeografico({ centro, zoom }: PropriedadesMudancaVisao): null {
    const instanciaMapa = useMap();
    useEffect(() => {
        instanciaMapa.flyTo(centro, zoom, { animate: true, duration: 1.5 });
    }, [centro, zoom, instanciaMapa]);
    return null;
}

function CamadaDensidadeCalor({ pontos, exibir }: PropriedadesCamadaCalor): null {
    const instanciaMapa = useMap();
    useEffect(() => {
        if (!exibir || pontos.length === 0) return;

        // Ignorando tipagem estrita do Leaflet Heatmap não nativo
        // @ts-ignore
        const camadaCalor = L.heatLayer(pontos, {
            radius: 25,
            blur: 15,
            maxZoom: 17,
            gradient: { 0.2: "#22d3ee", 0.4: "#06b6d4", 0.6: "#f59e0b", 0.8: "#f97316", 1: "#ef4444" },
        }).addTo(instanciaMapa);

        return () => { instanciaMapa.removeLayer(camadaCalor); };
    }, [instanciaMapa, pontos, exibir]);
    return null;
}

// ============================================================================
// 4. Componente Principal Orquestrador
// ============================================================================

export default function MapaInterativoAplicacao(): ReactElement {
    // Serviços e Estados Globais
    const { isAuthenticated: usuarioEstaAutenticado } = usarAutenticacao();
    const { apresentarNotificacao } = usarNotificacao();

    const {
        filters: filtrosAtivos,
        setFilter: definirFiltro,
        showHeatmap: exibirMapaCalor,
        setShowHeatmap: definirExibirMapaCalor,
        isDarkMode: ehModoEscuro,
        setIsDarkMode: definirModoEscuro,
        showLegend: exibirLegenda,
        setShowLegend: definirExibirLegenda
    } = usarArmazenamentoMapa();

    // Estados Locais
    const [limitesVisao, definirLimitesVisao] = useState<LimitesGeograficosMapa | null>(null);
    const [coordenadaAtual, definirCoordenadaAtual] = useState<[number, number]>(ConfiguracaoGlobalMapa.COORDENADA_CENTRAL_PADRAO);
    const [coordenadaUsuario, definirCoordenadaUsuario] = useState<[number, number] | null>(null);
    const [nivelDeZoom, definirNivelDeZoom] = useState<number>(ConfiguracaoGlobalMapa.ZOOM_INICIAL_PADRAO);

    const [sistemaEstaLocalizando, definirSistemaEstaLocalizando] = useState<boolean>(false);
    const [dispositivoTemConexao, definirDispositivoTemConexao] = useState<boolean>(true);
    const [modalInclusaoAberto, definirModalInclusaoAberto] = useState<boolean>(false);
    const [coordenadaSelecionada, definirCoordenadaSelecionada] = useState<[number, number] | null>(null);
    const [menuFiltrosExpandido, definirMenuFiltrosExpandido] = useState<boolean>(false);
    const [opacidadeMapaCalor, definirOpacidadeMapaCalor] = useState<number>(0.6);
    const [componenteFoiMontado, definirComponenteFoiMontado] = useState<boolean>(false);

    // Queries e Mutações
    const { data: incidentesBrutos = [], isFetching: estaSincronizando } = usarIncidentesMapa(limitesVisao, dispositivoTemConexao);
    const { data: pontosGeograficosCalor = [] } = usarDadosMapaCalor(limitesVisao, exibirMapaCalor, dispositivoTemConexao);

    const mutacaoVoto = usarVotoIncidente();
    const mutacaoDenuncia = usarDenunciaIncidente();
    const mutacaoCriacao = usarCriacaoIncidente();
    const mutacaoCriacaoEvento = usarCriacaoEvento();

    const listaIncidentes = incidentesBrutos || [];
    const listaEventos = listaIncidentes.filter((item: any) => (item.tipo || item.type) === "EVENT");

    // ------------------------------------------------------------------------
    // Ciclos de Vida (Efeitos)
    // ------------------------------------------------------------------------

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const parametrosUrl = new URLSearchParams(window.location.search);
            const latitudeParam = parametrosUrl.get('lat');
            const longitudeParam = parametrosUrl.get('lng');
            const zoomParam = parametrosUrl.get('zoom');

            if (latitudeParam && longitudeParam) {
                definirCoordenadaAtual([parseFloat(latitudeParam), parseFloat(longitudeParam)]);
            }
            if (zoomParam) {
                definirNivelDeZoom(parseInt(zoomParam));
            }
        }
        definirLimitesVisao({ minLat: -7.16, maxLat: -7.07, minLng: -34.92, maxLng: -34.80 });
    }, []);

    useEffect(() => {
        definirComponenteFoiMontado(true);
        const filtrosSalvos = localStorage.getItem("cs_filters");
        if (filtrosSalvos) {
            try {
                const filtrosAnalisados = JSON.parse(filtrosSalvos);
                definirFiltro('CRITICAL', filtrosAnalisados.CRITICAL !== false);
                definirFiltro('WARNING', filtrosAnalisados.WARNING !== false);
                definirFiltro('EVENT', filtrosAnalisados.EVENT !== false);
                definirFiltro('INFRASTRUCTURE', filtrosAnalisados.INFRASTRUCTURE !== false);
                definirFiltro('INFO', filtrosAnalisados.INFO !== false);
                definirFiltro('ANTIGOS', filtrosAnalisados.ANTIGOS !== false);
            } catch { /* Absorve falha de parse silenciosamente */ }
        }
        if (localStorage.getItem("cs_heatmap") === "true") definirExibirMapaCalor(true);
    }, [definirFiltro, definirExibirMapaCalor]);

    useEffect(() => {
        if (componenteFoiMontado) {
            localStorage.setItem("cs_filters", JSON.stringify(filtrosAtivos));
            localStorage.setItem("cs_heatmap", exibirMapaCalor.toString());
        }
        if (filtrosAtivos.EVENT && !filtrosAtivos.CRITICAL && !filtrosAtivos.WARNING) {
            definirExibirMapaCalor(false);
        }
    }, [filtrosAtivos, exibirMapaCalor, componenteFoiMontado, definirExibirMapaCalor]);

    useEffect(() => {
        const eventoConexaoAtiva = () => {
            definirDispositivoTemConexao(true);
            apresentarNotificacao("Conexão com os servidores restaurada", "sucesso");
        };
        const eventoDesconexao = () => { definirDispositivoTemConexao(false); };

        window.addEventListener("online", eventoConexaoAtiva);
        window.addEventListener("offline", eventoDesconexao);
        definirDispositivoTemConexao(navigator.onLine);

        return () => {
            window.removeEventListener("online", eventoConexaoAtiva);
            window.removeEventListener("offline", eventoDesconexao);
        };
    }, [apresentarNotificacao]);

    // ------------------------------------------------------------------------
    // Métodos de Regra de Negócio
    // ------------------------------------------------------------------------

    const processarRastreioDispositivo = () => {
        definirSistemaEstaLocalizando(true);
        navigator.geolocation.getCurrentPosition(
            (posicaoGeografica) => {
                const novaPosicao: [number, number] = [posicaoGeografica.coords.latitude, posicaoGeografica.coords.longitude];
                definirCoordenadaAtual(novaPosicao);
                definirCoordenadaUsuario(novaPosicao);
                definirNivelDeZoom(16);
                definirSistemaEstaLocalizando(false);
            },
            (erroGeolocalizacao) => {
                definirSistemaEstaLocalizando(false);
                if (erroGeolocalizacao.code === erroGeolocalizacao.PERMISSION_DENIED) {
                    apresentarNotificacao("Permissão de localização negada pelo navegador.", "alerta");
                } else {
                    apresentarNotificacao("Falha ao triangular sua posição via satélite.", "erro");
                }
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    };

    const submeterNovoIncidente = async (dadosFormulario: any) => {
        if (dadosFormulario.type === 'EVENT') {
            mutacaoCriacaoEvento.mutate({
                titulo: dadosFormulario.category || "Novo Evento",
                descricao: dadosFormulario.description,
                categoriaEvento: dadosFormulario.category,
                latitude: dadosFormulario.lat,
                longitude: dadosFormulario.lng,
                dataEvento: dadosFormulario.dataEvento || new Date().toISOString(),
                horaInicio: dadosFormulario.horaInicio || "06:00",
                horaFim: dadosFormulario.horaFim || "18:00",
                necessitaVoluntarios: false,
                capacidadeMax: null,
                linkExterno: null
            }, {
                onSuccess: (respostaServidor: any) => apresentarNotificacao(respostaServidor.mensagem || "Ação Social cadastrada", "sucesso"),
                onError: (erroRequisicao: any) => apresentarNotificacao(erroRequisicao.message, "erro")
            });
        } else {
            mutacaoCriacao.mutate({
                titulo: dadosFormulario.category || "Novo Registro",
                descricao: dadosFormulario.description,
                categoria: dadosFormulario.category,
                tipo: dadosFormulario.type,
                latitude: dadosFormulario.lat,
                longitude: dadosFormulario.lng,
            }, {
                onSuccess: (respostaServidor: any) => apresentarNotificacao(respostaServidor.mensagem || "Incidente protocolado", "sucesso"),
                onError: (erroRequisicao: any) => apresentarNotificacao(erroRequisicao.message, "erro")
            });
        }
    };

    const computarValidacaoIncidente = (identificadorIncidente: number, tipoVoto: string) => {
        if (!usuarioEstaAutenticado) return apresentarNotificacao("Efetue login para validar ocorrências.", "alerta");
        mutacaoVoto.mutate({
            id: identificadorIncidente,
            type: tipoVoto,
            lat: coordenadaUsuario?.[0],
            lng: coordenadaUsuario?.[1]
        }, {
            onSuccess: (resposta: any) => apresentarNotificacao(resposta.mensagem || "Avaliação computada", "sucesso"),
            onError: (erro: any) => apresentarNotificacao(erro.message, "erro")
        });
    };

    const registrarDenunciaModeracao = (identificadorIncidente: number) => {
        const justificativaDenuncia = prompt("Relate o motivo da moderação (mínimo 10 caracteres):");
        if (!justificativaDenuncia || justificativaDenuncia.length < 10) return;

        mutacaoDenuncia.mutate({ id: identificadorIncidente, motivo: justificativaDenuncia }, {
            onSuccess: () => apresentarNotificacao("Denúncia encaminhada para a equipe de moderação.", "sucesso"),
            onError: (erro: any) => apresentarNotificacao(erro.message, "erro")
        });
    };

    // ------------------------------------------------------------------------
    // Processamento de Dados de Visualização
    // ------------------------------------------------------------------------

    const incidentesParaVisualizacao = listaIncidentes.filter((incidenteAtual: any) => {
        const tipoCategorizacao = incidenteAtual.tipo || incidenteAtual.type;
        const metadadosVisuais = ServicoTemporalidade.calcularRelevanciaVisual(incidenteAtual.criadoEm || incidenteAtual.time || new Date().toISOString());

        if (filtrosAtivos.ANTIGOS === false && metadadosVisuais.ehConsideradoAntigo) return false;

        if (tipoCategorizacao === "CRITICAL" && !filtrosAtivos.CRITICAL) return false;
        if (tipoCategorizacao === "WARNING" && !filtrosAtivos.WARNING) return false;
        if (tipoCategorizacao === "INFRASTRUCTURE" && !filtrosAtivos.INFRASTRUCTURE) return false;
        if (tipoCategorizacao === "INFO" && !filtrosAtivos.INFO) return false;
        if (tipoCategorizacao === "EVENT" && !filtrosAtivos.EVENT) return false;
        return true;
    });

    const nenhumFiltroSelecionado = !filtrosAtivos.CRITICAL && !filtrosAtivos.WARNING && !filtrosAtivos.EVENT && !filtrosAtivos.INFRASTRUCTURE && !filtrosAtivos.INFO;

    const contagemPorCategoria = {
        CRITICAL: listaIncidentes.filter((item: any) => (item.tipo || item.type) === "CRITICAL").length,
        WARNING: listaIncidentes.filter((item: any) => (item.tipo || item.type) === "WARNING").length,
        INFRASTRUCTURE: listaIncidentes.filter((item: any) => (item.tipo || item.type) === "INFRASTRUCTURE").length,
        INFO: listaIncidentes.filter((item: any) => (item.tipo || item.type) === "INFO").length,
        EVENT: listaEventos.length,
        ANTIGOS: listaIncidentes.filter((item: any) => ServicoTemporalidade.calcularRelevanciaVisual(item.criadoEm || item.time || new Date().toISOString()).ehConsideradoAntigo).length,
    };

    // ------------------------------------------------------------------------
    // Renderização do Template (JSX)
    // ------------------------------------------------------------------------

    return (
        <div className={estilosVisuais.mapWrapper}>
            <MapContainer center={coordenadaAtual} zoom={nivelDeZoom} zoomControl={false} style={{ height: "100%", width: "100%" }}>
                <ControladorFocoGeografico centro={coordenadaAtual} zoom={nivelDeZoom} />

                {/* O ouvinte agora recebe os estados do pai como injeção de dependência */}
                <OuvinteIteracoesMapa
                    estaAutenticado={usuarioEstaAutenticado}
                    notificar={apresentarNotificacao}
                    aoClicar={(coordenadas) => {
                        definirCoordenadaSelecionada(coordenadas);
                        definirModalInclusaoAberto(true);
                    }}
                    aoMover={definirLimitesVisao as any}
                    aoArrastar={() => definirCoordenadaUsuario(null)}
                />

                <TileLayer
                    attribution='&copy; OpenStreetMap'
                    url={ehModoEscuro ? ConfiguracaoGlobalMapa.TILES_MODO_NOITE : ConfiguracaoGlobalMapa.TILES_MODO_DIA}
                />

                {estaSincronizando && (
                    <div style={{ position: 'absolute', top: 20, left: 20, zIndex: 1000, background: 'var(--bg-surface)', padding: '6px 12px', borderRadius: 'var(--radius-full)', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, border: '1px solid var(--glass-border)', boxShadow: 'var(--shadow-md)' }}>
                        <div style={{ width: 12, height: 12, borderRadius: '50%', border: '2px solid var(--primary-color)', borderTopColor: 'transparent', animation: 'spin 1s linear infinite' }} />
                        Sincronizando Banco de Dados...
                    </div>
                )}

                <ZoomControl position="bottomright" />
                <CamadaDensidadeCalor pontos={pontosGeograficosCalor} exibir={exibirMapaCalor} />

                {coordenadaUsuario && (
                    <>
                        <Marker position={coordenadaUsuario} icon={FabricaElementosGeograficos.construirIconeUsuario()}>
                            <Popup><div style={{ fontWeight: 600, fontSize: 14 }}>Sua Posição Exata</div></Popup>
                        </Marker>
                        <Circle center={coordenadaUsuario} radius={500} pathOptions={{ color: "#3b82f6", fillColor: "#3b82f6", fillOpacity: 0.05, weight: 1, dashArray: "5,5" }} />
                    </>
                )}

                <MarkerClusterGroup chunkedLoading iconCreateFunction={FabricaElementosGeograficos.construirIconeAgrupamento} maxClusterRadius={50}>
                    {incidentesParaVisualizacao.map((itemIncidente: any) => {
                        const metadadosVisuais = ServicoTemporalidade.calcularRelevanciaVisual(itemIncidente.criadoEm || itemIncidente.time || new Date().toISOString());
                        return (
                            <Marker key={itemIncidente.id} position={[itemIncidente.latitude || itemIncidente.lat, itemIncidente.longitude || itemIncidente.lng]} icon={FabricaElementosGeograficos.construirIconeIncidente(itemIncidente.tipo || itemIncidente.type, itemIncidente.criadoEm || itemIncidente.time || new Date().toISOString())}>
                                <Tooltip direction="top" offset={[0, -20]} opacity={0.95}>
                                    <span style={{ fontWeight: 600 }}>{itemIncidente.titulo || itemIncidente.category}</span>
                                </Tooltip>

                                <Popup>
                                    <div style={{ minWidth: 240, display: "flex", flexDirection: "column", gap: 10 }}>
                                        <div style={{ fontWeight: 700, fontSize: 15, borderBottom: "1px solid var(--glass-border)", paddingBottom: 6, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                            <span>{itemIncidente.categoria || itemIncidente.category}</span>
                                            <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 6, background: (itemIncidente.tipo || itemIncidente.type) === "CRITICAL" ? "rgba(239,68,68,0.1)" : "rgba(245,158,11,0.1)", color: (itemIncidente.tipo || itemIncidente.type) === "CRITICAL" ? "#ef4444" : "#f59e0b" }}>
                                                {itemIncidente.severidade || ""}
                                            </span>
                                        </div>

                                        <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5, color: "var(--text-primary)" }}>
                                            {(itemIncidente.descricao || itemIncidente.description || "").substring(0, 100)}
                                        </p>

                                        <div style={{ fontSize: 12, display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--bg-secondary)", padding: "4px 8px", borderRadius: 4 }}>
                                            <span>⏳ Status temporal:</span>
                                            <strong style={{ color: "var(--primary-color)" }}>{metadadosVisuais.texto}</strong>
                                        </div>

                                        <div style={{ fontSize: 12, color: "var(--text-secondary)", display: "flex", justifyContent: "space-between" }}>
                                            <span>✏️ {itemIncidente.autor?.pseudonimo || itemIncidente.author || "Registro Anônimo"}</span>
                                            <span>{new Date(itemIncidente.criadoEm || itemIncidente.time || new Date()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                                        </div>

                                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                            <div style={{ flex: 1, height: 6, background: "var(--bg-primary)", borderRadius: 3, overflow: "hidden" }}>
                                                <div style={{ width: `${Math.max(0, Math.min(100, ((itemIncidente.scoreVeracidade || 0) + 10) * 5))}%`, height: "100%", background: (itemIncidente.scoreVeracidade || 0) > 0 ? "#10b981" : "#ef4444", borderRadius: 3, transition: "width 0.3s" }} />
                                            </div>
                                            <span style={{ fontSize: 12, fontWeight: 700, color: (itemIncidente.scoreVeracidade || 0) > 5 ? "#10b981" : "var(--text-secondary)" }}>
                                                {itemIncidente.verificado && "✅ "}{itemIncidente.scoreVeracidade || 0}
                                            </span>
                                        </div>

                                        <div style={{ display: "flex", gap: 6 }}>
                                            <button onClick={() => computarValidacaoIncidente(itemIncidente.id, "CONFIRMAR")} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 4, padding: "8px", borderRadius: 8, background: "rgba(16,185,129,0.1)", color: "#10b981", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
                                                <PolegarCima size={14} /> Fato Real
                                            </button>
                                            <button onClick={() => computarValidacaoIncidente(itemIncidente.id, "NAO_PROCEDE")} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 4, padding: "8px", borderRadius: 8, background: "rgba(239,68,68,0.1)", color: "#ef4444", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
                                                <PolegarBaixo size={14} /> Falso
                                            </button>
                                            {usuarioEstaAutenticado && (
                                                <button onClick={() => registrarDenunciaModeracao(itemIncidente.id)} title="Solicitar Intervenção de Moderação" style={{ padding: "8px", borderRadius: 8, background: "rgba(245,158,11,0.1)", color: "#f59e0b", border: "none", cursor: "pointer" }}>
                                                    <Bandeira size={14} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </Popup>
                            </Marker>
                        )
                    })}
                </MarkerClusterGroup>
            </MapContainer>

            {!dispositivoTemConexao && (
                <div className={estilosVisuais.offlineBanner}>
                    <SemWifi size={16} />
                    <span>Sistema operando em contigência (Offline)</span>
                </div>
            )}

            {nenhumFiltroSelecionado && (
                <div className={estilosVisuais.overlayInfo}>
                    Habilite as categorias na aba de filtros para visualizar os dados.
                </div>
            )}

            <div className={estilosVisuais.legend} style={{ cursor: "pointer" }} onClick={() => definirExibirLegenda(!exibirLegenda)}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: exibirLegenda ? 8 : 0 }}>
                    <span style={{ fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5 }}>Dicionário de Marcadores</span>
                    {exibirLegenda ? <SetaBaixo size={14} /> : <SetaCima size={14} />}
                </div>
                {exibirLegenda && (
                    <>
                        <div className={estilosVisuais.legendItem}>
                            <div className={estilosVisuais.legendColor} style={{ backgroundColor: "#ef4444" }} />
                            <span>Crimes Graves e Violência</span>
                        </div>
                        <div className={estilosVisuais.legendItem}>
                            <div className={estilosVisuais.legendColor} style={{ backgroundColor: "#f59e0b" }} />
                            <span>Atividades Suspeitas ou Furtos</span>
                        </div>
                        <div className={estilosVisuais.legendItem}>
                            <div className={estilosVisuais.legendColor} style={{ backgroundColor: "#eab308" }} />
                            <span>Zeladoria Urbana</span>
                        </div>
                        <div className={estilosVisuais.legendItem}>
                            <div className={estilosVisuais.legendColor} style={{ backgroundColor: "#06b6d4" }} />
                            <span>Utilidade Pública</span>
                        </div>
                        <div className={estilosVisuais.legendItem}>
                            <div className={estilosVisuais.legendColor} style={{ backgroundColor: "#10b981" }} />
                            <span>Ações da Comunidade</span>
                        </div>
                        {exibirMapaCalor && (
                            <>
                                <div style={{ borderTop: "1px solid var(--glass-border)", margin: "6px 0", paddingTop: 6 }}>
                                    <span style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase" }}>Escala de Concentração</span>
                                </div>
                                <div style={{ display: "flex", height: 8, borderRadius: 4, overflow: "hidden" }}>
                                    <div style={{ flex: 1, background: "#22d3ee" }} />
                                    <div style={{ flex: 1, background: "#f59e0b" }} />
                                    <div style={{ flex: 1, background: "#ef4444" }} />
                                </div>
                                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: "var(--text-secondary)" }}>
                                    <span>Esporádico</span><span>Intermediário</span><span>Frequente</span>
                                </div>
                            </>
                        )}
                    </>
                )}
            </div>

            {menuFiltrosExpandido && (
                <div className={estilosVisuais.filterMenu} role="dialog" aria-label="Menu de configurações visuais" tabIndex={-1}>
                    <div className={estilosVisuais.filterHeader}>
                        <span id="titulo-menu-filtros">Camadas de Informação</span>
                        <button className={estilosVisuais.closeButton} onClick={() => definirMenuFiltrosExpandido(false)} aria-label="Ocultar painel" tabIndex={0}>
                            <Fechar size={18} />
                        </button>
                    </div>

                    <div className={estilosVisuais.filterList} role="group" aria-labelledby="titulo-menu-filtros">
                        {[
                            { key: "CRITICAL" as TipoCategoria, label: "Eventos Críticos", color: "#ef4444" },
                            { key: "WARNING" as TipoCategoria, label: "Alertas Preventivos", color: "#f59e0b" },
                            { key: "INFRASTRUCTURE" as TipoCategoria, label: "Zeladoria Urbana", color: "#eab308" },
                            { key: "INFO" as TipoCategoria, label: "Utilidade Pública", color: "#06b6d4" },
                            { key: "EVENT" as TipoCategoria, label: "Sociabilidade", color: "#10b981" },
                            { key: "ANTIGOS" as TipoCategoria, label: "Ocultar Registros Antigos", color: "#9ca3af" },
                        ].map((filtroAtual) => (
                            <label key={filtroAtual.key} className={estilosVisuais.filterItem} tabIndex={0} role="checkbox" aria-checked={filtrosAtivos[filtroAtual.key]} aria-label={`Ativar camada ${filtroAtual.label} (${contagemPorCategoria[filtroAtual.key]} registros encontrados)`} onKeyDown={(eventoTeclado) => { if (eventoTeclado.key === 'Enter' || eventoTeclado.key === ' ') { eventoTeclado.preventDefault(); definirFiltro(filtroAtual.key, !filtrosAtivos[filtroAtual.key]); } }}>
                                <div className={estilosVisuais.filterLabel}>
                                    <input type="checkbox" className={estilosVisuais.filterCheckbox} checked={filtrosAtivos[filtroAtual.key]} onChange={(eventoMudanca) => definirFiltro(filtroAtual.key, eventoMudanca.target.checked)} aria-label={filtroAtual.label} tabIndex={-1} />
                                    <div className={estilosVisuais.legendColor} style={{ backgroundColor: filtroAtual.color, width: 10, height: 10 }} />
                                    <span>{filtroAtual.label}</span>
                                </div>
                                <span className={estilosVisuais.badge}>{contagemPorCategoria[filtroAtual.key]}</span>
                            </label>
                        ))}
                    </div>

                    <div className={estilosVisuais.filterActions} role="group" aria-label="Controles de seleção em massa">
                        <button className={estilosVisuais.actionButton} onClick={() => { definirFiltro('CRITICAL', true); definirFiltro('WARNING', true); definirFiltro('EVENT', true); definirFiltro('INFRASTRUCTURE', true); definirFiltro('INFO', true); definirFiltro('ANTIGOS', true); }} aria-label="Ativar todas as opções" tabIndex={0}>
                            Marcar Todos
                        </button>
                        <button className={estilosVisuais.actionButton} onClick={() => { definirFiltro('CRITICAL', false); definirFiltro('WARNING', false); definirFiltro('EVENT', false); definirFiltro('INFRASTRUCTURE', false); definirFiltro('INFO', false); definirFiltro('ANTIGOS', false); }} aria-label="Desativar todas as opções" tabIndex={0}>
                            Remover Filtros
                        </button>
                    </div>

                    <label className={estilosVisuais.heatmapToggle}>
                        <input type="checkbox" className={estilosVisuais.filterCheckbox} checked={exibirMapaCalor} onChange={(eventoMudanca) => definirExibirMapaCalor(eventoMudanca.target.checked)} />
                        <Fogo size={18} color="#ef4444" />
                        Visão Termográfica
                    </label>

                    {exibirMapaCalor && (
                        <div style={{ paddingTop: 8 }}>
                            <label style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                                Transparência da Camada Térmica: {Math.round(opacidadeMapaCalor * 100)}%
                            </label>
                            <input type="range" min="0.1" max="1" step="0.1" value={opacidadeMapaCalor} onChange={(eventoMudanca) => definirOpacidadeMapaCalor(parseFloat(eventoMudanca.target.value))} style={{ width: "100%", accentColor: "var(--primary-color)" }} />
                        </div>
                    )}

                    <label className={estilosVisuais.heatmapToggle}>
                        <input type="checkbox" className={estilosVisuais.filterCheckbox} checked={ehModoEscuro} onChange={(eventoMudanca) => definirModoEscuro(eventoMudanca.target.checked)} />
                        {ehModoEscuro ? <Lua size={18} color="#8b5cf6" /> : <Sol size={18} color="#f59e0b" />}
                        {ehModoEscuro ? "Aparência Noturna" : "Aparência Diurna"}
                    </label>
                </div>
            )}

            <div className={estilosVisuais.mapControls}>
                <button className={estilosVisuais.floatingButton} onClick={processarRastreioDispositivo} title="Obter Coordenadas GPS Atuais">
                    <Alvo size={20} color={sistemaEstaLocalizando ? "#3b82f6" : "currentColor"} style={{ animation: sistemaEstaLocalizando ? "pulse 1s infinite" : "none" }} />
                </button>
                <button className={`${estilosVisuais.floatingButton} ${menuFiltrosExpandido ? estilosVisuais.active : ""}`} onClick={() => definirMenuFiltrosExpandido(!menuFiltrosExpandido)} title="Painel de Informações">
                    <Camadas size={20} />
                </button>
                {usuarioEstaAutenticado && (
                    <button className={estilosVisuais.floatingButton} onClick={() => apresentarNotificacao("Pressione um ponto no mapa para marcar uma denúncia.", "informacao")} title="Criar Alerta" style={{ background: "var(--primary-color)", color: "white" }}>
                        <Adicionar size={20} />
                    </button>
                )}
            </div>

            <ModalIncidente
                isOpen={modalInclusaoAberto}
                onClose={() => { definirModalInclusaoAberto(false); definirCoordenadaSelecionada(null); }}
                initialLocation={coordenadaSelecionada}
                onSubmit={submeterNovoIncidente}
            />
        </div>
    );
}