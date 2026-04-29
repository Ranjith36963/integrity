import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Dharma",
    short_name: "Dharma",
    description: "Build today, brick by brick.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0a1628",
    theme_color: "#0a1628",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
