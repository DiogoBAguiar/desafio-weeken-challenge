import type { Metadata } from "next";
import "leaflet/dist/leaflet.css";
import "./globals.css";
import { AuthProvider } from "@/features/auth/AuthContext";
import { ToastContainer } from "@/shared/components/Toast/ToastContainer";
import Sidebar from "@/shared/components/Sidebar/Sidebar";
import { QueryProvider } from "@/shared/lib/QueryProvider";

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
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body>
        <QueryProvider>
          <AuthProvider>
            <Sidebar />
            {children}
            <ToastContainer />
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
