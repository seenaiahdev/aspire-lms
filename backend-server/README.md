# Aspire LMS — Standalone Backend API Service

This is the decoupled, standalone backend service for Aspire LMS. It handles:
- Phone & Email OTP dispatch (`/api/send-otp`)
- HMAC-signed OTP verification (`/api/verify-otp`)
- Admin Alphanumeric Passkey verification & automatic post-login rotation (`/api/verify-passkey`)
- Admin Passkey retrieval & generation (`/api/get-passkey`)
- Health monitoring (`/health`)

---

## 🚀 Quick Start (Local / Production)

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env` and fill in your keys:
```bash
cp .env.example .env
```

| Variable | Description |
|---|---|
| `PORT` | Port the server listens on (default: `5000`) |
| `FRONTEND_URL` | Allowed frontend origin(s) for CORS (comma-separated, e.g. `https://lms.aspirenext.com`) |
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_ANON_KEY` | Supabase anon key |
| `GMAIL_USER` | Gmail address for sending OTP emails |
| `GMAIL_APP_PASSWORD` | 16-character Gmail App Password |
| `OTP_SECRET` | Secret HMAC string for signing OTPs |
| `PASSKEY_SECRET` | 32-byte master encryption secret for Passkey AES-256-GCM vault |

### 3. Run the Server
```bash
npm start
```
Server starts on `http://localhost:5000` (or `PORT`).

---

## 🐳 Docker Deployment

Build and run with Docker:
```bash
docker build -t aspire-backend .
docker run -p 5000:5000 --env-file .env aspire-backend
```

---

## 🔗 Connecting the Frontend

In the `frontend/` deployment, set this environment variable:
```env
VITE_API_URL=https://api.yourdomain.com
```
All frontend calls (`/api/send-otp`, `/api/verify-otp`, `/api/verify-passkey`) will automatically target your backend service.
