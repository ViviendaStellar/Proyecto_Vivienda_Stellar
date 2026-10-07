import { defineConfig } from "vite";

export default defineConfig({
  define: { global: "globalThis" },
  server: { port: 5173, open: true },
  build: { chunkSizeWarningLimit: 1500 },
});
