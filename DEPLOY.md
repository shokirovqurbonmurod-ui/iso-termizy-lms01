# 🚀 ISO Termizy LMS — Deploy Yo'riqnomasi

## 1. LOCAL ISHGA TUSHIRISH (Kompyuterda)

### Talab:
- Node.js 18+ o'rnatilgan bo'lishi kerak → https://nodejs.org
- Internet (birinchi marta npm install uchun)

### Windows (eng oson):
```
start.bat faylini 2 marta bosing
```

### Terminal orqali:
```bash
# Terminal 1 — Backend (port 4000):
cd server
npm install
npm run dev

# Terminal 2 — Frontend (port 5173):
cd client
npm install
npm run dev
```
Brauzer: http://localhost:5173

---

## 2. RENDER.COM DEPLOY (Bepul, onlayn)

### Backend (Express server):

1. https://render.com → Sign up (GitHub bilan)
2. "New" → "Web Service"
3. GitHub repoga ulang yoki "Public Git URL" dan:
   - Root directory: `server`
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Environment: Node
4. Environment Variables qo'shing:
   ```
   JWT_SECRET = iso_termizy_secret_2026
   PORT = 4000
   ```
5. "Create Web Service" → URL oling (masalan: https://iso-lms-api.onrender.com)

### Frontend (React):

1. "New" → "Static Site"
2. Root directory: `client`
3. Build Command: `npm install && npm run build`
4. Publish directory: `dist`
5. Environment Variables:
   ```
   VITE_API_URL = https://iso-lms-api.onrender.com/api
   ```

**client/src/lib/api.js faylida URL'ni o'zgartiring:**
```js
const BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
```

---

## 3. RAILWAY.APP DEPLOY (Eng oson full-stack)

1. https://railway.app → Login (GitHub bilan)
2. "New Project" → "Deploy from GitHub repo"
3. Ikki xizmat yarating:
   - **Backend:** root = `server`, start = `npm run dev`
   - **Frontend:** root = `client`, build = `npm run build`
4. Environment o'zgaruvchilari:
   ```
   JWT_SECRET = iso_termizy_secret_2026
   VITE_API_URL = https://your-backend.railway.app/api
   ```

---

## 4. VPS SERVERY (Linux, masalan DigitalOcean/Hetzner)

```bash
# 1. Server sozlash:
apt update && apt install -y nodejs npm nginx

# 2. Loyihani yuklash:
git clone <your-repo> /var/www/iso-lms
cd /var/www/iso-lms

# 3. Backend:
cd server && npm install
npm install -g pm2
pm2 start src/index.js --name "iso-lms-api"
pm2 save && pm2 startup

# 4. Frontend build:
cd ../client
npm install
npm run build
# dist/ papkasini nginx ga ulash

# 5. Nginx sozlash:
# /etc/nginx/sites-available/iso-lms:
server {
    listen 80;
    server_name your-domain.com;

    # Frontend
    location / {
        root /var/www/iso-lms/client/dist;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }
}

nginx -t && systemctl reload nginx
```

---

## 5. NETLIFY (Frontend) + RAILWAY (Backend)

### Backend — Railway:
1. railway.app → New → GitHub → server papkasi
2. `PORT = 4000`, `JWT_SECRET = ...`
3. URL oling: `https://xxx.railway.app`

### Frontend — Netlify:
1. netlify.com → "Add new site" → "Import from Git"
2. Base directory: `client`
3. Build command: `npm run build`
4. Publish directory: `client/dist`
5. Environment:
   ```
   VITE_API_URL = https://xxx.railway.app/api
   ```

---

## 6. MUHIM: API URL sozlash

`client/src/lib/api.js` faylida:
```js
// Local uchun:
const BASE = 'http://localhost:4000/api';

// Render/Railway/VPS uchun:
const BASE = 'https://YOUR-BACKEND-URL.com/api';
// YOKI .env orqali:
const BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
```

---

## 7. SUBDOMEN MISOLI

Agar `lms.iso-termizy.uz` domeningiz bo'lsa:
- Frontend: `lms.iso-termizy.uz` → Netlify/Nginx
- Backend API: `api.iso-termizy.uz` → Railway/VPS port 4000

---

## 8. MA'LUMOTLAR BAZASI (Ishlab chiqarish uchun)

Hozir JSON-fayl (server/data/db.json) ishlatiladi.
Katta miqyos uchun SQLite yoki PostgreSQL ga o'tish:

```bash
# SQLite (oson):
npm install better-sqlite3

# PostgreSQL (keng imkoniyat):
npm install pg
```

Yordamga muhtoj bo'lsangiz, platformani PostgreSQL ga o'tkazib beraman.

---

© 2026 ISO Termizy Avlodlari · Sherobod
