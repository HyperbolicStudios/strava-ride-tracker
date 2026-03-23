import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '../', '');
  return {
    base: '/strava-ride-tracker/',
    plugins: [react()],
    define: {
      'import.meta.env.VITE_STRAVA_MAPBOX_TOKEN': JSON.stringify(env.VITE_STRAVA_MAPBOX_TOKEN),
      'import.meta.env.VITE_BLOB_BASE': JSON.stringify(env.VITE_BLOB_BASE)
    },
    build: {
      outDir: '../docs',
      emptyOutDir: true

    }
  };
});