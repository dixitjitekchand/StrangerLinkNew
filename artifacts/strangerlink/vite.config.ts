import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

const isProduction = process.env.NODE_ENV === "production";

// In production builds PORT is not needed (no dev server).
// In dev (Replit) PORT and BASE_PATH are injected by the workflow.
const port = isProduction ? 3000 : Number(process.env.PORT ?? "3000");
const basePath = process.env.BASE_PATH ?? "/";

export default defineConfig({
  base: basePath,
  plugins: [
    react(),
    tailwindcss(),
    ...(!isProduction && process.env.REPL_ID !== undefined
      ? [
          // Replit-only dev plugins loaded dynamically so they don't break non-Replit builds
          ...(await Promise.all([
            import("@replit/vite-plugin-runtime-error-modal").then((m) =>
              m.default()
            ),
            import("@replit/vite-plugin-cartographer").then((m) =>
              m.cartographer({
                root: path.resolve(import.meta.dirname, ".."),
              })
            ),
            import("@replit/vite-plugin-dev-banner").then((m) =>
              m.devBanner()
            ),
          ]))
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@assets": path.resolve(
        import.meta.dirname,
        "..",
        "..",
        "attached_assets"
      ),
    },
    dedupe: ["react", "react-dom"],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    port,
    strictPort: true,
    host: "0.0.0.0",
    allowedHosts: true,
    fs: {
      strict: true,
    },
  },
  preview: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
  },
});
