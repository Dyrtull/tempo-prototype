/**
 * vite.config.ts
 * Build configuration for TEMPO. `base: './'` makes the built site work from any
 * sub-folder (GitHub Pages project sites), and HashRouter avoids server rewrites.
 */
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
})
