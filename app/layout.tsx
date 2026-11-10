import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SEM TABACO",
  description: "Seu assistente pessoal para parar de fumar.",
  manifest: "/manifest.ts",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "SEM TABACO",
  },
};

export const viewport: Viewport = {
  themeColor: "#10b981",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className="antialiased bg-slate-950">
        {children}
      </body>
    </html>
  );
}