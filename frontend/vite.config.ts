import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';
import fs from 'fs';
import path from 'path';

function serveResourceImages() {
  const imagesDir = resolve(__dirname, '../resource/images');
  return {
    name: 'serve-resource-images',
    configureServer(server: any) {
      server.middlewares.use('/images', (req: any, res: any, next: () => void) => {
        const urlObj = new URL(req.url || '/', 'http://localhost');
        const reqPath = urlObj.pathname.replace(/^\//, '');

        // IMPORTANT:
        // Vite will request assets as JS modules in dev via `?import`/`?url`.
        // If we return the raw image bytes, the browser will reject it as a module script.
        if (urlObj.searchParams.has('import') || urlObj.searchParams.has('url')) {
          res.setHeader('Content-Type', 'application/javascript');
          res.end(`export default "/images/${reqPath}";`);
          return;
        }
        const filePath = path.join(imagesDir, reqPath);
        if (!path.resolve(filePath).startsWith(imagesDir)) return next();
        fs.stat(filePath, (err, stat) => {
          if (err || !stat?.isFile()) return next();
          const ext = path.extname(filePath);
          const types: Record<string, string> = {
            '.webp': 'image/webp',
            '.png': 'image/png',
            '.svg': 'image/svg+xml',
            '.ico': 'image/x-icon',
          };
          res.setHeader('Content-Type', types[ext] || 'application/octet-stream');
          fs.createReadStream(filePath).pipe(res);
        });
      });
    },
  };
}

export default defineConfig({
  plugins: [vue(), serveResourceImages()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  optimizeDeps: {
    include: ['vue', 'vue-router', 'pinia', 'element-plus', 'axios', 'chart.js'],
    force: false,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('element-plus')) return 'element-plus';
            if (id.includes('chart.js')) return 'chart';
            if (id.includes('vue') || id.includes('pinia')) return 'vue-vendor';
          }
        },
      },
    },
    chunkSizeWarningLimit: 1000,
    cssCodeSplit: true,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    hmr:false,
//    hmr: {
//      protocol: 'ws',
//      host: '115.190.193.135',
//      port: 5173,
//      clientPort: 5173,
//    },
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
