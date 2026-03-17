import babel from '@rolldown/plugin-babel'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import tailwindcss from "@tailwindcss/vite"

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // @ts-expect-error - upstream PluginOptions typing is too strict, but this is valid at runtime
    babel({
      presets: [reactCompilerPreset()]
    }),
    tailwindcss(),
  ],
  resolve: {
    tsconfigPaths: true,
  },
})
