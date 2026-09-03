// Plain Vite + TanStack Start config, replacing Lovable's @lovable.dev/vite-tanstack-config wrapper.
import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";
import { nitro } from "nitro/vite";

export default defineConfig(({ command }) => ({
  plugins: [
    tsConfigPaths({ projects: ["./tsconfig.json"] }),
    tailwindcss(),
    tanstackStart({
      // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
      server: { entry: "server" },
    }),
    // Only wire in Nitro for production builds. Loading it during `vite dev`
    // makes it switch into "Vercel dev emulation" mode, which expects a
    // plain SPA entry (src/main.tsx) that doesn't exist in this TanStack
    // Start project structure — that's what broke local dev.
    ...(command === "build" ? [nitro({ preset: "vercel" })] : []),
    viteReact(),
  ],
}));