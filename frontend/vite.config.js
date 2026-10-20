import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Tailwind CSS v4 is wired in through its first-party Vite plugin.
export default defineConfig({
  plugins: [react(), tailwindcss()],
});
