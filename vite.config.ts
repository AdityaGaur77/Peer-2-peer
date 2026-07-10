import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // relative asset paths — the build works from any static host or subpath
  // (GitHub Pages serves at /Peer-2-peer/, Netlify at /, both fine)
  base: './',
})
