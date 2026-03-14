import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '../', '');
  return {
    base: '/',
    plugins: [react()],
    define: {
      'import.meta.env.VITE_STRAVA_MAPBOX_TOKEN': JSON.stringify(env.VITE_STRAVA_MAPBOX_TOKEN)
    },
    build: {
      outDir: '../docs'
    }
  };
});