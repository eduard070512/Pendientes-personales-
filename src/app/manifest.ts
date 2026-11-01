import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Pendientes personales",
    short_name: "Pendientes",
    start_url: "/",
    display: "standalone",
    background_color: "#09090b",
    theme_color: "#4f46e5",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
