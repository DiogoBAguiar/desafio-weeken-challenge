// ═══════════════════════════════════════════════════════════════
// Rotas de Identidade — Composição e Mapeamento HTTP
// Este é o único arquivo que "conecta tudo":
// - Instancia os provedores do core/
// - Injeta dependências nos serviços
// - Mapeia URLs para métodos dos controladores
// ═══════════════════════════════════════════════════════════════

import { Router } from 'express';
import { autenticar } from '../../middleware/auth';

// ── Core (Infraestrutura Compartilhada) ─────────────────────
import { ProvedorPrisma } from '../../core/provedor-prisma';
import { ProvedorDeSegurancaPadrao } from '../../core/provedor-seguranca';
import { ServicoDeAuditoria } from '../../core/servico-auditoria';

// ── Domínio (Serviços de Negócio) ───────────────────────────
import { ServicoDeIdentidade } from './servico-identidade';
import { ServicoDeGestaoDeConta } from './servico-gestao-conta';

// ── Camada HTTP (Controladores) ─────────────────────────────
import { ControladorDeIdentidade } from './controlador-identidade';
import { ControladorDeGestaoDeConta } from './controlador-gestao';

// ═════════════════════════════════════════════════════════════
// Composição — Injeção de Dependência Manual
// ═════════════════════════════════════════════════════════════

const provedorBanco = new ProvedorPrisma();
const provedorSeguranca = new ProvedorDeSegurancaPadrao();
const servicoAuditoria = new ServicoDeAuditoria(provedorBanco);

const servicoIdentidade = new ServicoDeIdentidade(provedorBanco, provedorSeguranca, servicoAuditoria);
const servicoGestao = new ServicoDeGestaoDeConta(provedorBanco, provedorSeguranca, servicoAuditoria);

const controladorIdentidade = new ControladorDeIdentidade(servicoIdentidade);
const controladorGestao = new ControladorDeGestaoDeConta(servicoGestao);

// ═════════════════════════════════════════════════════════════
// Mapeamento de Rotas
// ═════════════════════════════════════════════════════════════

const router = Router();

// ── Rotas Públicas (sem autenticação) ───────────────────────
router.post('/register', controladorIdentidade.registrarNovoUsuario);
router.post('/login', controladorIdentidade.realizarLogin);
router.post('/forgot-password', controladorIdentidade.requisitarRecuperacaoDeSenha);
router.post('/reset-password', controladorIdentidade.confirmarRedefinicaoDeSenha);

// ── Rotas Autenticadas ──────────────────────────────────────
router.post('/logout', autenticar, controladorGestao.efetuarLogout);
router.get('/me', autenticar, controladorGestao.buscarPerfilDoUsuario);
router.put('/profile', autenticar, controladorGestao.modificarPerfil);
router.get('/sessions', autenticar, controladorGestao.obterSessoesConectadas);
router.delete('/sessions/:id', autenticar, controladorGestao.removerSessao);

// ── Rotas de 2FA ────────────────────────────────────────────
router.post('/2fa/setup', autenticar, controladorGestao.iniciarConfiguracaoTotp);
router.post('/2fa/verify', autenticar, controladorGestao.validarCodigoTotp);
router.post('/2fa/disable', autenticar, controladorGestao.desativarTotp);

// ── Verificação de Senha ────────────────────────────────────
router.post('/verify-password', autenticar, controladorGestao.verificarSenha);

export default router;
