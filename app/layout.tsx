import type { Metadata } from "next";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
  ?? (process.env.VERCEL_PROJECT_PRODUCTION_URL && `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`)
  ?? (process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}`)
  ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Test de las Líneas | Evaluación psicológica",
  description: "Plataforma para la aplicación profesional del Test de las Líneas",
  applicationName: "Test de las Líneas",
  icons: {
    icon: [{ url: "/brand/favicon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/brand/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
    shortcut: "/brand/favicon.svg",
  },
  openGraph: {
    title: "Test de las Líneas",
    description: "Evaluación psicológica profesional",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es"><body>{children}</body></html>;
}
