import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const vendorChunkGroups = [
  {
    name: "vendor-react",
    packages: ["/node_modules/react/", "/node_modules/react-dom/", "/node_modules/scheduler/"]
  },
  {
    name: "vendor-mui",
    packages: ["/node_modules/@mui/", "/node_modules/@emotion/", "/node_modules/@popperjs/", "/node_modules/react-is/", "/node_modules/stylis/"]
  },
  {
    name: "vendor-motion",
    packages: ["/node_modules/@gsap/", "/node_modules/gsap/"]
  },
  {
    name: "vendor-platform",
    packages: ["/node_modules/@tauri-apps/"]
  }
] as const;

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        // Route-level lazy imports still share React, MUI, and GSAP; keep vendor chunks coarse so Vite reports real oversized chunks without fragile per-component splits.
        manualChunks(id) {
          const normalizedId = id.replace(/\\/g, "/");
          if (!normalizedId.includes("/node_modules/")) return undefined;

          for (const group of vendorChunkGroups) {
            if (group.packages.some((packagePath) => normalizedId.includes(packagePath))) return group.name;
          }

          return undefined;
        }
      }
    }
  },
  server: {
    host: "127.0.0.1",
    port: 5173,
    strictPort: true,
    watch: {
      ignored: ["**/src-tauri/**"]
    }
  },
  preview: {
    host: "127.0.0.1"
  }
});
