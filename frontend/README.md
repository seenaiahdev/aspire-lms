# Aspire LMS — Frontend Application

This is the standalone frontend client for Aspire LMS built with React 18, Vite, TypeScript, and Tailwind CSS.

---

## 🚀 Quick Start (Development)

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Set `VITE_API_URL` to point to the running backend service (e.g., `http://localhost:5000`).

### 3. Run Development Server
```bash
npm run dev
```
Open `http://localhost:5173` in your browser.

---

## 📦 Production Build

```bash
npm run build
```
The optimized production bundle will be generated in the `dist/` directory.

### Preview Production Build
```bash
npm run preview
```

---

## 🌐 Production Deployment Options

### 1. Vercel
- Set **Root Directory** to `frontend` (or deploy directly from this folder).
- Build Command: `npm run build`
- Output Directory: `dist`
- Environment Variables: Add `VITE_API_URL`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, etc.

### 2. Nginx / Static Hosting / S3 / Cloudflare Pages
- Serve the `dist/` directory as static assets.
- Configure SPA fallback routing to `index.html` for client-side routing.
- Example Nginx configuration:
  ```nginx
  server {
      listen 80;
      server_name lms.yourdomain.com;
      root /var/www/aspire-lms/frontend/dist;
      index index.html;

      location / {
          try_files $uri $uri/ /index.html;
      }
  }
  ```
