import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { ToastProvider } from "@/contexts/ToastContext";
import Sidebar from "@/components/Sidebar/Sidebar";

export const metadata: Metadata = {
  title: "Comunidade Segura - Mapeamento colaborativo de segurança",
  description: "Sistema colaborativo para mapeamento de segurança e eventos comunitários. Ajude a proteger sua vizinhança com relatos em tempo real.",
  keywords: "segurança, comunidade, mapa, incidentes, João Pessoa, denúncia",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>
        <AuthProvider>
          <ToastProvider>
            <Sidebar />
            {children}
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
