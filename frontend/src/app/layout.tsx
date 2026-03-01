import type { Metadata } from "next";
import type { JSX } from "react";
import "leaflet/dist/leaflet.css";
import "./globals.css";

// -----------------------------------------------------------------------------
// 1. Importações com Alias (Adaptando dependências externas/legadas para PT-BR)
// -----------------------------------------------------------------------------
import { AuthProvider as ProvedorAutenticacao } from "@/features/auth/AuthContext";
import { QueryProvider as ProvedorConsultas } from "@/shared/lib/QueryProvider";

// Importação corrigida para o formato "default export" e nome atualizado
import ContenedorNotificacoesGlobal from "@/shared/components/Toast/ToastContainer";
import BarraLateral from "@/shared/components/Sidebar/Sidebar";

// -----------------------------------------------------------------------------
// 2. Definição de Metadados (SEO e Configurações da Página)
// -----------------------------------------------------------------------------
const metadadosDaAplicacao: Metadata = {
  title: "Comunidade Segura - Mapeamento colaborativo de segurança",
  description: "Sistema colaborativo para mapeamento de segurança e eventos comunitários. Ajude a proteger sua vizinhança com relatos em tempo real.",
  keywords: "segurança, comunidade, mapa, incidentes, João Pessoa, denúncia",
};

// O Next.js exige estritamente a exportação de uma constante chamada 'metadata'.
// Exportamos nossa constante em português utilizando o nome reservado do framework.
export { metadadosDaAplicacao as metadata };

// -----------------------------------------------------------------------------
// 3. Contratos (Interfaces)
// -----------------------------------------------------------------------------
interface PropriedadesLayoutRaiz {
  children: React.ReactNode;
}

// -----------------------------------------------------------------------------
// 4. Componente Estrutural Principal (Layout Raiz)
// -----------------------------------------------------------------------------
export default function LayoutRaiz({ children }: PropriedadesLayoutRaiz): JSX.Element {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link 
            href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" 
            rel="stylesheet" 
        />
      </head>
      <body>
        {/* Orquestração da Árvore de Provedores de Estado */}
        <ProvedorConsultas>
          <ProvedorAutenticacao>
            
            <BarraLateral />
            
            {/* O conteúdo dinâmico das rotas será injetado aqui */}
            {children}
            
            <ContenedorNotificacoesGlobal />
            
          </ProvedorAutenticacao>
        </ProvedorConsultas>
      </body>
    </html>
  );
}