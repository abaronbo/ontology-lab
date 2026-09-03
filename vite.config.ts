import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // Served from https://abaronbo.github.io/ontology-lab/ (project pages), so assets need this base.
  base: '/ontology-lab/',
  plugins: [react()],
})
