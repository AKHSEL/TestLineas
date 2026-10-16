import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Test de las Líneas",
    short_name: "Test de Líneas",
    description: "Plataforma para la aplicación profesional del Test de las Líneas",
    start_url: "/",
    display: "standalone",
    background_color: "#f6f8f5",
    theme_color: "#2d6258",
    icons: [
      { src: "/brand/favicon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/brand/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/brand/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  };
}
