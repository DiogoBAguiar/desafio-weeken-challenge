const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

class ApiService {
    private token: string | null = null;

    constructor() {
        if (typeof window !== 'undefined') {
            this.token = localStorage.getItem('cs_token');
        }
    }

    setToken(token: string | null) {
        this.token = token;
        if (typeof window !== 'undefined') {
            if (token) localStorage.setItem('cs_token', token);
            else localStorage.removeItem('cs_token');
        }
    }

    getToken() {
        return this.token;
    }

    private async request(endpoint: string, options: RequestInit = {}) {
        const headers: any = {
            'Content-Type': 'application/json',
            ...options.headers,
        };

        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }

        const response = await fetch(`${API_BASE}${endpoint}`, {
            ...options,
            headers,
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Erro na requisição');
        }

        return data;
    }

    // ═══ Auth ═══
    async register(dados: any) {
        const res = await this.request('/auth/register', { method: 'POST', body: JSON.stringify(dados) });
        this.setToken(res.token);
        return res;
    }

    async login(email: string, senha: string) {
        const res = await this.request('/auth/login', { method: 'POST', body: JSON.stringify({ email, senha }) });
        this.setToken(res.token);
        return res;
    }

    async logout() {
        try {
            await this.request('/auth/logout', { method: 'POST' });
        } finally {
            this.setToken(null);
        }
    }

    async getMe() {
        return this.request('/auth/me');
    }

    async updateProfile(data: any) {
        return this.request('/auth/profile', { method: 'PUT', body: JSON.stringify(data) });
    }

    async forgotPassword(email: string) {
        return this.request('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) });
    }

    async getSessions() {
        return this.request('/auth/sessions');
    }

    async terminateSession(id: number) {
        return this.request(`/auth/sessions/${id}`, { method: 'DELETE' });
    }

    // ═══ Incidentes ═══
    async getMapData(bounds: { minLat: number; maxLat: number; minLng: number; maxLng: number }, categorias?: string) {
        const params = new URLSearchParams({
            minLat: bounds.minLat.toString(),
            maxLat: bounds.maxLat.toString(),
            minLng: bounds.minLng.toString(),
            maxLng: bounds.maxLng.toString(),
        });
        if (categorias) params.set('categorias', categorias);
        return this.request(`/incidentes/mapa?${params}`);
    }

    async getHeatmap(bounds: { minLat: number; maxLat: number; minLng: number; maxLng: number }) {
        const params = new URLSearchParams({
            minLat: bounds.minLat.toString(),
            maxLat: bounds.maxLat.toString(),
            minLng: bounds.minLng.toString(),
            maxLng: bounds.maxLng.toString(),
        });
        return this.request(`/incidentes/heatmap?${params}`);
    }

    async createIncident(data: any) {
        return this.request('/incidentes', { method: 'POST', body: JSON.stringify(data) });
    }

    async getIncident(id: number) {
        return this.request(`/incidentes/${id}`);
    }

    async updateIncident(id: number, data: any) {
        return this.request(`/incidentes/${id}`, { method: 'PUT', body: JSON.stringify(data) });
    }

    async deleteIncident(id: number) {
        return this.request(`/incidentes/${id}`, { method: 'DELETE' });
    }

    async voteIncident(id: number, tipo: string, latitude?: number, longitude?: number) {
        return this.request(`/incidentes/${id}/votar`, {
            method: 'POST',
            body: JSON.stringify({ tipo, latitude, longitude }),
        });
    }

    // ═══ Eventos ═══
    async getEvents(bounds?: any) {
        const params = bounds ? new URLSearchParams({
            minLat: bounds.minLat.toString(),
            maxLat: bounds.maxLat.toString(),
            minLng: bounds.minLng.toString(),
            maxLng: bounds.maxLng.toString(),
        }) : '';
        return this.request(`/eventos?${params}`);
    }

    async createEvent(data: any) {
        return this.request('/eventos', { method: 'POST', body: JSON.stringify(data) });
    }

    async rsvpEvent(id: number, tipo: string = 'EU_VOU') {
        return this.request(`/eventos/${id}/rsvp`, { method: 'POST', body: JSON.stringify({ tipo }) });
    }

    // ═══ Notificações ═══
    async getNotifications(page: number = 1) {
        return this.request(`/notificacoes?page=${page}`);
    }

    async markAllRead() {
        return this.request('/notificacoes/read-all', { method: 'PUT' });
    }

    async markRead(id: number) {
        return this.request(`/notificacoes/${id}/read`, { method: 'PUT' });
    }

    async getZones() {
        return this.request('/notificacoes/zonas');
    }

    async createZone(data: any) {
        return this.request('/notificacoes/zonas', { method: 'POST', body: JSON.stringify(data) });
    }

    async toggleZone(id: number) {
        return this.request(`/notificacoes/zonas/${id}`, { method: 'PUT' });
    }

    async deleteZone(id: number) {
        return this.request(`/notificacoes/zonas/${id}`, { method: 'DELETE' });
    }

    // ═══ Gamificação ═══
    async getReputation() {
        return this.request('/gamificacao/reputacao');
    }

    async getRanking() {
        return this.request('/gamificacao/ranking');
    }

    async getExtract(page: number = 1, filters?: any) {
        const params = new URLSearchParams({ page: page.toString() });
        if (filters?.tipo) params.set('tipo', filters.tipo);
        if (filters?.dataInicio) params.set('dataInicio', filters.dataInicio);
        if (filters?.dataFim) params.set('dataFim', filters.dataFim);
        return this.request(`/gamificacao/extrato?${params}`);
    }

    // ═══ Admin ═══
    async getDashboardStats(periodo: number = 7) {
        return this.request(`/admin/dashboard/stats?periodo=${periodo}`);
    }

    async exportDashboard(formato: string = 'json', periodo: number = 30) {
        return this.request(`/admin/dashboard/export?formato=${formato}&periodo=${periodo}`);
    }

    async getModerationQueue() {
        return this.request('/admin/moderacao');
    }

    async moderateAction(incidenteId: number, acao: string, justificativa: string) {
        return this.request('/admin/moderacao/acao', {
            method: 'POST',
            body: JSON.stringify({ incidenteId, acao, justificativa }),
        });
    }

    async banUser(usuarioId: number, motivo: string, permanente: boolean, dataExpiracao?: string) {
        return this.request('/admin/banir', {
            method: 'POST',
            body: JSON.stringify({ usuarioId, motivo, permanente, dataExpiracao }),
        });
    }

    async getAuditLogs(page: number = 1, filters?: any) {
        const params = new URLSearchParams({ page: page.toString() });
        if (filters) {
            Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v as string); });
        }
        return this.request(`/admin/auditoria?${params}`);
    }

    async getUsers(page: number = 1, filters?: any) {
        const params = new URLSearchParams({ page: page.toString() });
        if (filters) {
            Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v as string); });
        }
        return this.request(`/admin/usuarios?${params}`);
    }

    async changeUserRole(userId: number, role: string) {
        return this.request(`/admin/usuarios/${userId}/role`, {
            method: 'PUT',
            body: JSON.stringify({ role }),
        });
    }

    async reportIncident(incidenteId: number, motivo: string) {
        return this.request('/admin/denunciar', {
            method: 'POST',
            body: JSON.stringify({ incidenteId, motivo }),
        });
    }
}

export const api = new ApiService();
export default api;
