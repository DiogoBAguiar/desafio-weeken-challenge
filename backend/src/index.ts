import express, { Application, Request, Response, NextFunction } from 'express';
import cors, { CorsOptions } from 'cors';
import path from 'path';

// Importação das rotas
import rotasAutenticacao from './routes/auth';
import rotasIncidentes from './routes/incidentes';
import rotasEventos from './routes/eventos';
import rotasNotificacoes from './routes/notificacoes';
import rotasGamificacao from './routes/gamificacao';
import rotasAdministracao from './routes/admin';

/**
 * ============================================================================
 * 1. Contratos e Abstrações
 * ============================================================================
 */
interface IProvedorSegurancaWeb {
    obterPoliticasAcesso(): CorsOptions;
}

interface IGestorDeRotas {
    registarRotas(aplicacao: Application): void;
}

interface IServidorAplicacao {
    obterInstancia(): Application;
    arrancarSessao(portaAlvo: number | string): void;
}

/**
 * ============================================================================
 * 2. Implementações de Infraestrutura (Segurança e Roteamento)
 * ============================================================================
 */
class ConfiguracaoCorsNuvem implements IProvedorSegurancaWeb {
    private readonly dominiosAutorizados: string[];

    constructor() {
        // Integração de variáveis de ambiente para garantir escalabilidade
        // O domínio da Vercel deve ser passado via painel de controlo
        const dominioProducao = process.env.URL_FRONTEND_PRODUCAO || 'https://comunidade-viva-3r8e5qe71-diogobaguiars-projects.vercel.app';
        
        this.dominiosAutorizados = [
            'http://localhost:3000',
            'http://localhost:3001',
            dominioProducao
        ];
    }

    public obterPoliticasAcesso(): CorsOptions {
        return {
            origin: (origemRequisicao, chamadaRetorno) => {
                if (!origemRequisicao || this.dominiosAutorizados.includes(origemRequisicao)) {
                    chamadaRetorno(null, true);
                } else {
                    chamadaRetorno(new Error(`[Segurança] Bloqueio CORS originado por: ${origemRequisicao}`));
                }
            },
            credentials: true,
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
            allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
        };
    }
}

class OrquestradorDeRotas implements IGestorDeRotas {
    public registarRotas(aplicacao: Application): void {
        aplicacao.get('/api/health', this.controladorEstadoSaude);
        
        // Mapeamento modular de domínios
        aplicacao.use('/api/auth', rotasAutenticacao);
        aplicacao.use('/api/incidentes', rotasIncidentes);
        aplicacao.use('/api/eventos', rotasEventos);
        aplicacao.use('/api/notificacoes', rotasNotificacoes);
        aplicacao.use('/api/gamificacao', rotasGamificacao);
        aplicacao.use('/api/admin', rotasAdministracao);
        
        // Registo de interrutor de falhas
        aplicacao.use(this.tratamentoGlobalExcecoes);
    }

    private controladorEstadoSaude(requisicao: Request, resposta: Response): void {
        resposta.status(200).json({ 
            estado: 'Operacional', 
            marcaDeTempo: new Date().toISOString(), 
            versao: '2.0.0',
            ambiente: process.env.VERCEL ? 'Nuvem' : 'Local'
        });
    }

    private tratamentoGlobalExcecoes(erro: Error, requisicao: Request, resposta: Response, proximo: NextFunction): void {
        console.error('[Exceção Não Tratada]', erro.message);
        resposta.status(500).json({ erro: 'Ocorreu uma falha interna no processamento do servidor.' });
    }
}

/**
 * ============================================================================
 * 3. Orquestrador Principal do Servidor (Composição)
 * ============================================================================
 */
class ServidorComunidadeSegura implements IServidorAplicacao {
    private readonly aplicacaoInterna: Application;
    private readonly segurancaWeb: IProvedorSegurancaWeb;
    private readonly gestorRotas: IGestorDeRotas;

    constructor(segurancaWeb: IProvedorSegurancaWeb, gestorRotas: IGestorDeRotas) {
        this.aplicacaoInterna = express();
        this.segurancaWeb = segurancaWeb;
        this.gestorRotas = gestorRotas;
        
        this.configurarIntermediarios();
        this.gestorRotas.registarRotas(this.aplicacaoInterna);
    }

    private configurarIntermediarios(): void {
        this.aplicacaoInterna.use(cors(this.segurancaWeb.obterPoliticasAcesso()));
        this.aplicacaoInterna.use(express.json({ limit: '10mb' }));
        this.aplicacaoInterna.use(express.urlencoded({ extended: true }));
        
        // Ficheiros estáticos (Nota: Na Vercel, o sistema de ficheiros é efémero)
        this.aplicacaoInterna.use('/uploads', express.static(path.join(__dirname, '../uploads')));
    }

    public obterInstancia(): Application {
        return this.aplicacaoInterna;
    }

    public arrancarSessao(portaAlvo: number | string): void {
        // Em ambiente Serverless (Vercel), evitamos escutar portas manualmente.
        // A própria plataforma injeta e gere os pedidos para a aplicação exportada.
        const ambienteEmNuvem = !!process.env.VERCEL;

        if (!ambienteEmNuvem) {
            this.aplicacaoInterna.listen(portaAlvo, () => {
                console.log(`\n🚀 Sistema Operacional Local - Escutando na porta ${portaAlvo}`);
                console.log(`📡 Verificação de Integridade: http://localhost:${portaAlvo}/api/health\n`);
            });
        }
    }
}

/**
 * ============================================================================
 * 4. Ponto de Entrada e Exportação para a Nuvem
 * ============================================================================
 */
const portaExecucao = process.env.PORT || 4000;
const politicaSeguranca = new ConfiguracaoCorsNuvem();
const rotasDoSistema = new OrquestradorDeRotas();

const servidor = new ServidorComunidadeSegura(politicaSeguranca, rotasDoSistema);

// Inicia o servidor (Apenas efetivo se executado localmente)
servidor.arrancarSessao(portaExecucao);

// Exportação obrigatória para que a infraestrutura Serverless da Vercel possa 
// importar a aplicação Express em vez de procurar uma porta aberta.
export default servidor.obterInstancia();