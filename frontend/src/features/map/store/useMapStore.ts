import { create } from 'zustand';

type CategoryType = 'CRITICAL' | 'WARNING' | 'INFRASTRUCTURE' | 'INFO' | 'EVENT' | 'ANTIGOS';

interface MapState {
    filters: Record<CategoryType, boolean>;
    setFilter: (category: CategoryType, value: boolean) => void;
    showHeatmap: boolean;
    setShowHeatmap: (val: boolean) => void;
    isDarkMode: boolean;
    setIsDarkMode: (val: boolean) => void;
    showLegend: boolean;
    setShowLegend: (val: boolean) => void;
}

export const useMapStore = create<MapState>((set) => ({
    filters: {
        CRITICAL: true,
        WARNING: true,
        INFRASTRUCTURE: true,
        INFO: true,
        EVENT: false,
        ANTIGOS: false,
    },
    setFilter: (category, value) =>
        set((state) => ({
            filters: { ...state.filters, [category]: value },
        })),
    showHeatmap: false,
    setShowHeatmap: (val) => set({ showHeatmap: val }),
    isDarkMode: false,
    setIsDarkMode: (val) => set({ isDarkMode: val }),
    showLegend: true,
    setShowLegend: (val) => set({ showLegend: val }),
}));
