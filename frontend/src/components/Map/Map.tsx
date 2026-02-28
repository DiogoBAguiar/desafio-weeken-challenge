"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
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
import L from "leaflet";
import "leaflet.heat";
import {
    Target, Layers, X, Flame, ThumbsUp, ThumbsDown,
    Flag, Plus, WifiOff, Sun, Moon, ChevronDown, ChevronUp
} from "lucide-react";
import styles from "./Map.module.css";
import IncidentModal from "../IncidentModal/IncidentModal";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import api from "@/services/api";

export type CategoryType = "CRITICAL" | "WARNING" | "EVENT";

// Day/Night tile URLs
const DAY_TILES = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const NIGHT_TILES = "https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png";

function ChangeView({ center, zoom }: { center: [number, number]; zoom: number }) {
    const map = useMap();
    useEffect(() => {
        map.flyTo(center, zoom, { animate: true, duration: 1.5 });
    }, [center, zoom, map]);
    return null;
}

const createCustomIcon = (type: string, pulsando?: boolean) => {
    let color = "#3b82f6";
    let className = "";
    let iconHtml = "";

    if (type === "CRITICAL") {
        color = "#ef4444";
        if (pulsando) className = styles.pulsingMarker;
        iconHtml = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`;
    } else if (type === "WARNING") {
        color = "#f59e0b";
        iconHtml = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>`;
    } else {
        color = "#3b82f6";
        iconHtml = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`;
    }

    return L.divIcon({
        html: `<div style="background-color:${color};width:36px;height:36px;display:flex;align-items:center;justify-content:center;border-radius:50%;box-shadow:0 3px 8px rgba(0,0,0,0.3);border:2.5px solid white">${iconHtml}</div>`,
        className,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
        popupAnchor: [0, -20],
    });
};

const userLocationIcon = L.divIcon({
    html: `<div style="width:18px;height:18px;background:#3b82f6;border-radius:50%;border:3px solid white;box-shadow:0 0 0 6px rgba(59,130,246,0.3),0 2px 6px rgba(0,0,0,0.3);animation:pulse 2s infinite"></div>`,
    className: "",
    iconSize: [18, 18],
    iconAnchor: [9, 9],
});

function HeatmapLayer({ points, show }: { points: [number, number, number][]; show: boolean }) {
    const map = useMap();
    useEffect(() => {
        if (!show || points.length === 0) return;
        // @ts-ignore
        const heatLayer = L.heatLayer(points, {
            radius: 25,
            blur: 15,
            maxZoom: 17,
            gradient: { 0.2: "#22d3ee", 0.4: "#06b6d4", 0.6: "#f59e0b", 0.8: "#f97316", 1: "#ef4444" },
        }).addTo(map);
        return () => { map.removeLayer(heatLayer); };
    }, [map, points, show]);
    return null;
}

export default function AppMap() {
    const { usuario, isAuthenticated } = useAuth();
    const { showToast } = useToast();

    const [incidents, setIncidents] = useState<any[]>([]);
    const [events, setEvents] = useState<any[]>([]);
    const [heatPoints, setHeatPoints] = useState<[number, number, number][]>([]);

    // CA11 (1.3.2): Read URL params for zone centering
    const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    const urlLat = urlParams?.get('lat');
    const urlLng = urlParams?.get('lng');
    const urlZoom = urlParams?.get('zoom');

    const [position, setPosition] = useState<[number, number]>(
        urlLat && urlLng ? [parseFloat(urlLat), parseFloat(urlLng)] : [-7.11532, -34.86105]
    );
    const [userPos, setUserPos] = useState<[number, number] | null>(null);
    const [zoom, setZoom] = useState(urlZoom ? parseInt(urlZoom) : 13);
    const [isLocating, setIsLocating] = useState(false);
    const [isOnline, setIsOnline] = useState(true);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [clickedLocation, setClickedLocation] = useState<[number, number] | null>(null);

    const [showFiltersMenu, setShowFiltersMenu] = useState(false);
    const [showHeatmap, setShowHeatmap] = useState(false);
    const [showLegend, setShowLegend] = useState(true);
    const [heatmapOpacity, setHeatmapOpacity] = useState(0.6);
    const [isDarkMode, setIsDarkMode] = useState(false);
    const [filters, setFilters] = useState<Record<CategoryType, boolean>>({
        CRITICAL: true,
        WARNING: true,
        EVENT: false,
    });

    const boundsRef = useRef<any>(null);

    // Auto detect dark mode
    useEffect(() => {
        const hour = new Date().getHours();
        setIsDarkMode(hour < 6 || hour >= 18);
    }, []);

    // Persist filters
    const [isMounted, setIsMounted] = useState(false);
    useEffect(() => {
        setIsMounted(true);
        const saved = localStorage.getItem("cs_filters");
        if (saved) try { setFilters(JSON.parse(saved)); } catch { }
        const savedHm = localStorage.getItem("cs_heatmap");
        if (savedHm === "true") setShowHeatmap(true);
    }, []);

    useEffect(() => {
        if (isMounted) {
            localStorage.setItem("cs_filters", JSON.stringify(filters));
            localStorage.setItem("cs_heatmap", showHeatmap.toString());
        }
        // CA11 (1.1.3): Auto-hide heatmap when Events filter is selected alone
        if (filters.EVENT && !filters.CRITICAL && !filters.WARNING) {
            setShowHeatmap(false);
        }
    }, [filters, showHeatmap, isMounted]);

    // Online/Offline detection
    useEffect(() => {
        const onOnline = () => { setIsOnline(true); showToast("Conexão restaurada", "success"); loadMapData(); };
        const onOffline = () => { setIsOnline(false); };
        window.addEventListener("online", onOnline);
        window.addEventListener("offline", onOffline);
        setIsOnline(navigator.onLine);
        return () => { window.removeEventListener("online", onOnline); window.removeEventListener("offline", onOffline); };
    }, []);

    // Load data from API
    const loadMapData = useCallback(async () => {
        if (!boundsRef.current || !isOnline) return;
        try {
            const bounds = boundsRef.current;
            const [mapData, heatData] = await Promise.all([
                api.getMapData(bounds),
                showHeatmap ? api.getHeatmap(bounds) : Promise.resolve([]),
            ]);

            setIncidents(mapData || []);
            setHeatPoints(heatData || []);

            // Cache for offline
            if (typeof window !== "undefined") {
                localStorage.setItem("cs_cache_incidents", JSON.stringify(mapData));
                localStorage.setItem("cs_cache_heat", JSON.stringify(heatData));
            }
        } catch {
            // Fallback to cache
            const cached = localStorage.getItem("cs_cache_incidents");
            if (cached) setIncidents(JSON.parse(cached));
            const cachedHeat = localStorage.getItem("cs_cache_heat");
            if (cachedHeat) setHeatPoints(JSON.parse(cachedHeat));
        }
    }, [isOnline, showHeatmap]);

    // Load on mount
    useEffect(() => {
        // Set initial bounds
        boundsRef.current = {
            minLat: -7.16, maxLat: -7.07,
            minLng: -34.92, maxLng: -34.80,
        };
        loadMapData();
    }, [loadMapData]);

    const handleLocateMe = () => {
        setIsLocating(true);
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const newPos: [number, number] = [pos.coords.latitude, pos.coords.longitude];
                setPosition(newPos);
                setUserPos(newPos);
                setZoom(16);
                setIsLocating(false);
            },
            (err) => {
                setIsLocating(false);
                // CA04 (1.1.4): Instruction on how to re-enable permission
                if (err.code === err.PERMISSION_DENIED) {
                    showToast(
                        "Localização bloqueada. Para ativar: clique no ícone de cadeado na barra de endereço do navegador e permita o acesso à localização.",
                        "warning"
                    );
                } else {
                    showToast(
                        "Não foi possível obter sua localização. Tente novamente.",
                        "warning"
                    );
                }
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    };

    const MapEvents = () => {
        const map = useMapEvents({
            click(e) {
                if (!isAuthenticated) {
                    showToast("Faça login para registrar uma ocorrência", "warning");
                    return;
                }
                setClickedLocation([e.latlng.lat, e.latlng.lng]);
                setIsModalOpen(true);
            },
            moveend() {
                const b = map.getBounds();
                boundsRef.current = {
                    minLat: b.getSouth(),
                    maxLat: b.getNorth(),
                    minLng: b.getWest(),
                    maxLng: b.getEast(),
                };
                loadMapData();
            },
            // CA12 (1.1.4): Disable auto-tracking when user drags map manually
            dragstart() {
                setUserPos(null);
            },
        });
        return null;
    };

    const handleIncidentSubmit = async (data: any) => {
        try {
            const result = await api.createIncident({
                titulo: data.category || "Novo Incidente",
                descricao: data.description,
                categoria: data.category,
                tipo: data.type,
                latitude: data.lat,
                longitude: data.lng,
            });
            showToast(result.mensagem, "success", result.pontosGanhos);
            loadMapData();
        } catch (err: any) {
            showToast(err.message, "error");
        }
    };

    const handleVote = async (incidenteId: number, tipo: string) => {
        if (!isAuthenticated) {
            showToast("Faça login para votar", "warning");
            return;
        }
        try {
            const result = await api.voteIncident(
                incidenteId,
                tipo,
                userPos?.[0],
                userPos?.[1]
            );
            showToast(result.mensagem, "success");
            loadMapData();
        } catch (err: any) {
            showToast(err.message, "error");
        }
    };

    const handleReport = async (incidenteId: number) => {
        const motivo = prompt("Descreva por que está denunciando (mín. 10 caracteres):");
        if (!motivo || motivo.length < 10) return;
        try {
            await api.reportIncident(incidenteId, motivo);
            showToast("Denúncia registrada. Obrigado!", "success");
        } catch (err: any) {
            showToast(err.message, "error");
        }
    };

    const createClusterCustomIcon = (cluster: any) => {
        const count = cluster.getChildCount();
        return L.divIcon({
            html: `<span>${count}</span>`,
            className: styles.markerCluster,
            iconSize: L.point(42, 42, true),
        });
    };

    const filteredIncidents = incidents.filter((inc) => {
        const type = inc.tipo || inc.type;
        if (type === "CRITICAL" && !filters.CRITICAL) return false;
        if (type === "WARNING" && !filters.WARNING) return false;
        return true;
    });

    // All filters deselected warning
    const allFiltersOff = !filters.CRITICAL && !filters.WARNING && !filters.EVENT;

    const categoryCount = {
        CRITICAL: incidents.filter(i => (i.tipo || i.type) === "CRITICAL").length,
        WARNING: incidents.filter(i => (i.tipo || i.type) === "WARNING").length,
        EVENT: events.length,
    };

    return (
        <div className={styles.mapWrapper}>
            <MapContainer
                center={position}
                zoom={zoom}
                zoomControl={false}
                style={{ height: "100%", width: "100%" }}
            >
                <ChangeView center={position} zoom={zoom} />
                <MapEvents />

                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url={isDarkMode ? NIGHT_TILES : DAY_TILES}
                />

                <ZoomControl position="bottomright" />

                <HeatmapLayer points={heatPoints} show={showHeatmap} />

                {/* User Location Marker */}
                {userPos && (
                    <>
                        <Marker position={userPos} icon={userLocationIcon}>
                            <Popup>
                                <div style={{ fontWeight: 600, fontSize: 14 }}>📍 Sua localização</div>
                            </Popup>
                        </Marker>
                        <Circle center={userPos} radius={500} pathOptions={{
                            color: "#3b82f6", fillColor: "#3b82f6", fillOpacity: 0.05,
                            weight: 1, dashArray: "5,5"
                        }} />
                    </>
                )}

                {/* Markers */}
                <MarkerClusterGroup
                    chunkedLoading
                    iconCreateFunction={createClusterCustomIcon}
                    maxClusterRadius={50}
                >
                    {filteredIncidents.map((incident) => (
                        <Marker
                            key={incident.id}
                            position={[incident.latitude || incident.lat, incident.longitude || incident.lng]}
                            icon={createCustomIcon(incident.tipo || incident.type, incident.pulsando)}
                        >
                            {/* CA10: Tooltip on hover */}
                            <Tooltip direction="top" offset={[0, -20]} opacity={0.95}>
                                <span style={{ fontWeight: 600 }}>{incident.titulo || incident.category}</span>
                            </Tooltip>

                            {/* CA03: Popup with details */}
                            <Popup>
                                <div style={{ minWidth: 240, display: "flex", flexDirection: "column", gap: 10 }}>
                                    <div style={{
                                        fontWeight: 700, fontSize: 15,
                                        borderBottom: "1px solid var(--glass-border)",
                                        paddingBottom: 6,
                                        display: "flex", justifyContent: "space-between", alignItems: "center"
                                    }}>
                                        <span>{incident.categoria || incident.category}</span>
                                        <span style={{
                                            fontSize: 11,
                                            padding: "2px 8px",
                                            borderRadius: 6,
                                            background: (incident.tipo || incident.type) === "CRITICAL" ? "rgba(239,68,68,0.1)" : "rgba(245,158,11,0.1)",
                                            color: (incident.tipo || incident.type) === "CRITICAL" ? "#ef4444" : "#f59e0b"
                                        }}>
                                            {incident.severidade || ""}
                                        </span>
                                    </div>

                                    <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5, color: "var(--text-primary)" }}>
                                        {(incident.descricao || incident.description || "").substring(0, 100)}
                                    </p>

                                    <div style={{ fontSize: 12, color: "var(--text-secondary)", display: "flex", justifyContent: "space-between" }}>
                                        <span>✏️ {incident.autor?.pseudonimo || incident.author || "Anônimo"}</span>
                                        <span>{new Date(incident.criadoEm || incident.time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                                    </div>

                                    {/* Veracity bar */}
                                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                        <div style={{ flex: 1, height: 6, background: "var(--bg-primary)", borderRadius: 3, overflow: "hidden" }}>
                                            <div style={{
                                                width: `${Math.max(0, Math.min(100, ((incident.scoreVeracidade || 0) + 10) * 5))}%`,
                                                height: "100%",
                                                background: (incident.scoreVeracidade || 0) > 0 ? "#10b981" : "#ef4444",
                                                borderRadius: 3,
                                                transition: "width 0.3s",
                                            }} />
                                        </div>
                                        <span style={{
                                            fontSize: 12, fontWeight: 700,
                                            color: (incident.scoreVeracidade || 0) > 5 ? "#10b981" : "var(--text-secondary)"
                                        }}>
                                            {incident.verificado && "✅ "}{incident.scoreVeracidade || 0}
                                        </span>
                                    </div>

                                    {/* Vote buttons */}
                                    <div style={{ display: "flex", gap: 6 }}>
                                        <button
                                            onClick={() => handleVote(incident.id, "CONFIRMAR")}
                                            style={{
                                                flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
                                                padding: "8px", borderRadius: 8,
                                                background: "rgba(16,185,129,0.1)", color: "#10b981",
                                                border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600,
                                            }}
                                        >
                                            <ThumbsUp size={14} /> Confirmar
                                        </button>
                                        <button
                                            onClick={() => handleVote(incident.id, "NAO_PROCEDE")}
                                            style={{
                                                flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
                                                padding: "8px", borderRadius: 8,
                                                background: "rgba(239,68,68,0.1)", color: "#ef4444",
                                                border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600,
                                            }}
                                        >
                                            <ThumbsDown size={14} /> Não Procede
                                        </button>
                                        {isAuthenticated && (
                                            <button
                                                onClick={() => handleReport(incident.id)}
                                                title="Denunciar"
                                                style={{
                                                    padding: "8px", borderRadius: 8,
                                                    background: "rgba(245,158,11,0.1)", color: "#f59e0b",
                                                    border: "none", cursor: "pointer",
                                                }}
                                            >
                                                <Flag size={14} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </Popup>
                        </Marker>
                    ))}
                </MarkerClusterGroup>
            </MapContainer>

            {/* Offline Banner (CA12 of 1.1.1) */}
            {!isOnline && (
                <div className={styles.offlineBanner}>
                    <WifiOff size={16} />
                    <span>Modo Offline — exibindo dados em cache</span>
                </div>
            )}

            {/* All filters off warning (CA06 of 1.1.3) */}
            {allFiltersOff && (
                <div className={styles.overlayInfo}>
                    Nenhuma categoria selecionada. O mapa está vazio.
                </div>
            )}

            {/* Legend (CA07) - Retractable */}
            <div className={styles.legend} style={{ cursor: "pointer" }} onClick={() => setShowLegend(!showLegend)}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: showLegend ? 8 : 0 }}>
                    <span style={{ fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5 }}>Legenda</span>
                    {showLegend ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                </div>
                {showLegend && (
                    <>
                        <div className={styles.legendItem}>
                            <div className={styles.legendColor} style={{ backgroundColor: "#ef4444" }} />
                            <span>Crimes Violentos (Crítico)</span>
                        </div>
                        <div className={styles.legendItem}>
                            <div className={styles.legendColor} style={{ backgroundColor: "#f59e0b" }} />
                            <span>Furtos / Riscos (Média)</span>
                        </div>
                        <div className={styles.legendItem}>
                            <div className={styles.legendColor} style={{ backgroundColor: "#3b82f6" }} />
                            <span>Eventos Comunitários</span>
                        </div>
                        {showHeatmap && (
                            <>
                                <div style={{ borderTop: "1px solid var(--glass-border)", margin: "6px 0", paddingTop: 6 }}>
                                    <span style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase" }}>Intensidade</span>
                                </div>
                                <div style={{ display: "flex", height: 8, borderRadius: 4, overflow: "hidden" }}>
                                    <div style={{ flex: 1, background: "#22d3ee" }} />
                                    <div style={{ flex: 1, background: "#f59e0b" }} />
                                    <div style={{ flex: 1, background: "#ef4444" }} />
                                </div>
                                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: "var(--text-secondary)" }}>
                                    <span>Baixo</span><span>Moderado</span><span>Alto</span>
                                </div>
                            </>
                        )}
                    </>
                )}
            </div>

            {/* Filter Menu */}
            {showFiltersMenu && (
                <div className={styles.filterMenu} role="dialog" aria-label="Filtros do mapa" tabIndex={-1}>
                    <div className={styles.filterHeader}>
                        <span id="filter-menu-title">Filtros e Camadas</span>
                        <button className={styles.closeButton} onClick={() => setShowFiltersMenu(false)}
                            aria-label="Fechar filtros" tabIndex={0}>
                            <X size={18} />
                        </button>
                    </div>

                    <div className={styles.filterList} role="group" aria-labelledby="filter-menu-title">
                        {[
                            { key: "CRITICAL" as CategoryType, label: "Crimes Violentos", color: "#ef4444" },
                            { key: "WARNING" as CategoryType, label: "Furtos e Riscos", color: "#f59e0b" },
                            { key: "EVENT" as CategoryType, label: "Eventos Comunitários", color: "#3b82f6" },
                        ].map((f) => (
                            <label key={f.key} className={styles.filterItem}
                                tabIndex={0} role="checkbox" aria-checked={filters[f.key]}
                                aria-label={`Filtro ${f.label} (${categoryCount[f.key]} ocorrências)`}
                                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setFilters(prev => ({ ...prev, [f.key]: !prev[f.key] })); } }}>
                                <div className={styles.filterLabel}>
                                    <input
                                        type="checkbox"
                                        className={styles.filterCheckbox}
                                        checked={filters[f.key]}
                                        onChange={(e) => setFilters((prev) => ({ ...prev, [f.key]: e.target.checked }))}
                                        aria-label={f.label}
                                        tabIndex={-1}
                                    />
                                    <div className={styles.legendColor} style={{ backgroundColor: f.color, width: 10, height: 10 }} />
                                    <span>{f.label}</span>
                                </div>
                                <span className={styles.badge}>{categoryCount[f.key]}</span>
                            </label>
                        ))}
                    </div>

                    <div className={styles.filterActions} role="group" aria-label="Ações de filtro">
                        <button className={styles.actionButton} onClick={() => setFilters({ CRITICAL: true, WARNING: true, EVENT: true })}
                            aria-label="Selecionar todas as categorias" tabIndex={0}>
                            Todos
                        </button>
                        <button className={styles.actionButton} onClick={() => setFilters({ CRITICAL: false, WARNING: false, EVENT: false })}
                            aria-label="Limpar todos os filtros" tabIndex={0}>
                            Limpar
                        </button>
                    </div>

                    {/* Heatmap Toggle */}
                    <label className={styles.heatmapToggle}>
                        <input type="checkbox" className={styles.filterCheckbox} checked={showHeatmap}
                            onChange={(e) => setShowHeatmap(e.target.checked)} />
                        <Flame size={18} color="#ef4444" />
                        Mapa de Calor
                    </label>

                    {/* Heatmap Opacity Slider (CA05 of 1.1.2) */}
                    {showHeatmap && (
                        <div style={{ paddingTop: 8 }}>
                            <label style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                                Opacidade: {Math.round(heatmapOpacity * 100)}%
                            </label>
                            <input type="range" min="0.1" max="1" step="0.1" value={heatmapOpacity}
                                onChange={(e) => setHeatmapOpacity(parseFloat(e.target.value))}
                                style={{ width: "100%", accentColor: "var(--primary-color)" }} />
                        </div>
                    )}

                    {/* Day/Night Toggle (CA09 of 1.1.1) */}
                    <label className={styles.heatmapToggle}>
                        <input type="checkbox" className={styles.filterCheckbox}
                            checked={isDarkMode}
                            onChange={(e) => setIsDarkMode(e.target.checked)} />
                        {isDarkMode ? <Moon size={18} color="#8b5cf6" /> : <Sun size={18} color="#f59e0b" />}
                        {isDarkMode ? "Modo Noite" : "Modo Dia"}
                    </label>
                </div>
            )}

            {/* Map Controls */}
            <div className={styles.mapControls}>
                <button
                    className={styles.floatingButton}
                    onClick={handleLocateMe}
                    title="Minha Localização"
                >
                    <Target
                        size={20}
                        color={isLocating ? "#3b82f6" : "currentColor"}
                        style={{ animation: isLocating ? "pulse 1s infinite" : "none" }}
                    />
                </button>
                <button
                    className={`${styles.floatingButton} ${showFiltersMenu ? styles.active : ""}`}
                    onClick={() => setShowFiltersMenu(!showFiltersMenu)}
                    title="Filtros e Camadas"
                >
                    <Layers size={20} />
                </button>
                {isAuthenticated && (
                    <button
                        className={styles.floatingButton}
                        onClick={() => {
                            showToast("Clique no mapa para definir o local da ocorrência", "info");
                        }}
                        title="Novo Relato"
                        style={{ background: "var(--primary-color)", color: "white" }}
                    >
                        <Plus size={20} />
                    </button>
                )}
            </div>

            <IncidentModal
                isOpen={isModalOpen}
                onClose={() => { setIsModalOpen(false); setClickedLocation(null); }}
                initialLocation={clickedLocation}
                onSubmit={handleIncidentSubmit}
            />
        </div>
    );
}
