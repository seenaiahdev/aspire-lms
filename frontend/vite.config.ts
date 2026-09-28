import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

function apiDevServerPlugin(): Plugin {
  return {
    name: 'api-dev-server',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/')) return next();
        const parsedUrl = new URL(req.url, 'http://localhost');
        const endpoint = parsedUrl.pathname.replace(/^\/api\//, '').split('?')[0];
        const apiFile = path.resolve(fileURLToPath(new URL('.', import.meta.url)), `../api/${endpoint}.js`);

        if (!fs.existsSync(apiFile)) return next();

        let body = '';
        req.on('data', (chunk) => { body += chunk; });
        req.on('end', async () => {
          try {
            (req as any).body = body ? JSON.parse(body) : {};
          } catch {
            (req as any).body = body;
          }
          (req as any).query = Object.fromEntries(parsedUrl.searchParams.entries());
          (res as any).status = (code: number) => {
            res.statusCode = code;
            return res;
          };
          (res as any).json = (data: any) => {
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(data));
            return res;
          };
          try {
            delete require.cache[require.resolve(apiFile)];
            const handler = require(apiFile);
            await handler(req, res);
          } catch (err: any) {
            console.error(`API Error in ${endpoint}:`, err);
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ ok: false, error: err?.message || 'Server error' }));
          }
        });
      });
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), apiDevServerPlugin()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  // Strip developer noise from production bundles. `pure` drops console.log/info/debug calls
  // (their return value is unused) while KEEPING console.warn/error for real diagnostics.
  esbuild: {
    drop: ['debugger'],
    pure: ['console.log', 'console.info', 'console.debug'],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-supabase': ['@supabase/supabase-js'],
          'vendor-firebase': ['firebase/app', 'firebase/auth'],
          'vendor-icons': ['lucide-react'],
        },
      },
    },
  },
});
