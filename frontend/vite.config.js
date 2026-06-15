import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.js',
    env: {
      VITE_SUPABASE_URL: 'http://localhost:54321',
      VITE_SUPABASE_ANON_KEY: 'test-key'
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary'],
      include: ['src/services/api.js', 'src/components/VoiceRecorder.jsx', 'src/pages/Jobs.jsx'],
      thresholds: {
        'src/services/api.js': { statements: 90 },
        'src/components/VoiceRecorder.jsx': { statements: 70 },
        'src/pages/Jobs.jsx': { statements: 70 },
      }
    }
  }
})
