import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { contentSnapshot } from "./vite-plugin-content-snapshot";
import { githubPagesFallback } from "./vite-plugin-github-pages-fallback";

export default defineConfig({
  base: process.env.VITE_BASE_PATH || "/",
  plugins: [react(), contentSnapshot(), githubPagesFallback()],
});
