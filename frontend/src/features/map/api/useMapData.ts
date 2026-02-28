import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/shared/lib/api';

export const useMapIncidents = (bounds: any, isOnline: boolean) => {
    return useQuery({
        queryKey: ['incidents', bounds],
        queryFn: async () => {
            if (!bounds || !isOnline) return [];
            try {
                const data = await api.getMapData(bounds);
                if (typeof window !== "undefined") {
                    localStorage.setItem("cs_cache_incidents", JSON.stringify(data));
                }
                return data;
            } catch (err) {
                const cached = localStorage.getItem("cs_cache_incidents");
                return cached ? JSON.parse(cached) : [];
            }
        },
        enabled: !!bounds,
        staleTime: 1000 * 30, // Reference data is fresh for 30 seconds
    });
};

export const useHeatmapData = (bounds: any, showHeatmap: boolean, isOnline: boolean) => {
    return useQuery({
        queryKey: ['heatmap', bounds],
        queryFn: async () => {
            if (!bounds || !showHeatmap || !isOnline) return [];
            try {
                const data = await api.getHeatmap(bounds);
                if (typeof window !== "undefined") {
                    localStorage.setItem("cs_cache_heat", JSON.stringify(data));
                }
                return data;
            } catch (err) {
                const cached = localStorage.getItem("cs_cache_heat");
                return cached ? JSON.parse(cached) : [];
            }
        },
        enabled: !!bounds && showHeatmap,
    });
};

export const useReportIncident = () => {
    return useMutation({
        mutationFn: ({ id, motivo }: { id: number; motivo: string }) => api.reportIncident(id, motivo),
    });
};

export const useVoteIncident = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, type, lat, lng }: { id: number; type: string; lat?: number; lng?: number }) => api.voteIncident(id, type, lat, lng),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['incidents'] });
        },
    });
};

export const useCreateIncident = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: any) => api.createIncident(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['incidents'] });
        },
    });
};
