import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// Tests run in UTC so date output never depends on the machine. Set here, in the main
// process, before vitest starts its workers, which inherit the environment.
process.env.TZ = 'UTC'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
  },
})
