import { defineConfig } from "vitest/config";
import Icons from "unplugin-icons/vite";
import react from "@vitejs/plugin-react-swc";

export default defineConfig({
  plugins: [
    react(),
    Icons(),
  ],
  // 1. prevent vite from obscuring rust errors
  clearScreen: false,
  server: {
    port: 1420,
    // 2. tauri expects a fixed port, fail if that port is not available
    strictPort: true,
    watch: {
      // 3. tell vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
    },
  },
  test: {
    include: ["src/**/*.{test,spec}.{js,ts}"],
  },
});
