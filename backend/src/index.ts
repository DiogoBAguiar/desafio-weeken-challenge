import express from 'express';
import cors from 'cors';
import path from 'path';

// Route imports
import authRoutes from './routes/auth';
import incidenteRoutes from './routes/incidentes';
import eventoRoutes from './routes/eventos';
import notificacaoRoutes from './routes/notificacoes';
import gamificacaoRoutes from './routes/gamificacao';
import adminRoutes from './routes/admin';

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors({
    origin: ['http://localhost:3000', 'http://localhost:3001'],
    credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Static files for uploads
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ═══════════════════════════════════════════════════════════════
// ROUTES
// ═══════════════════════════════════════════════════════════════

// Healthcheck
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date(), version: '2.0.0' });
});

// MÓDULO 6: Autenticação e Perfil de Usuário
app.use('/api/auth', authRoutes);

// MÓDULO 1 & 2: Incidentes (mapa, relatos, votos)
app.use('/api/incidentes', incidenteRoutes);

// MÓDULO 2: Eventos Comunitários
app.use('/api/eventos', eventoRoutes);

// MÓDULO 3: Notificações e Zonas de Interesse
app.use('/api/notificacoes', notificacaoRoutes);

// MÓDULO 4: Gamificação (Reputação, Ranking, Extrato)
app.use('/api/gamificacao', gamificacaoRoutes);

// MÓDULO 5: Administração (Dashboard, Moderação, Auditoria, Gestão de Usuários)
app.use('/api/admin', adminRoutes);

// Error handling
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Erro interno do servidor.' });
});

// Start server
app.listen(PORT, () => {
    console.log(`\n🚀 Comunidade Segura API rodando na porta ${PORT}`);
    console.log(`📡 Health: http://localhost:${PORT}/api/health`);
    console.log(`🗺️  Mapa:   http://localhost:${PORT}/api/incidentes/mapa`);
    console.log(`🔐 Auth:   http://localhost:${PORT}/api/auth/login`);
    console.log(`📊 Admin:  http://localhost:${PORT}/api/admin/dashboard/stats\n`);
});
