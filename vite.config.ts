import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { seoFiles } from './scripts/seo-files';
export default defineConfig({ plugins: [react(), seoFiles()] });
