# 🏛 ISO Termizy Avlodlari — LMS / CRM / ERP

**Xorijiy tillar o'quv markazi uchun to'liq boshqaruv platformasi**
Sherobod — Bosh filial · English · IELTS · CEFR · Koreys · Rus · Matematika · Tarix · Huquq · IT

**React + Vite + Tailwind** (frontend) · **Node.js + Express** (backend, JSON-fayl bazasi)

---

## ⚡ Tez ishga tushirish

### Windows (eng oson)
1. ZIP ni oching (extract)
2. **`start.bat`** faylini 2 marta bosing
3. Brauzer: **http://localhost:5173**

### Terminal orqali (Mac / Linux / Windows)

**Terminal 1 — backend:**
```
cd server
npm install
npm run dev
```
✅ `🏛 ISO Termizy Avlodlari — LMS API` chiqishi kerak

**Terminal 2 — frontend:**
```
cd client
npm install
npm run dev
```
✅ `VITE ready` chiqishi kerak → **http://localhost:5173**

> ⚠️ **"This site can't be reached"** chiqsa — ikkala terminal ham ishlab turganini tekshiring.
> ⚠️ Yangi modullar ko'rinmasa — `server/data/db.json` faylini o'chirib, qayta ishga tushiring.

---

## 🔑 Demo akkauntlar (parol: `123456`)

| Telefon | Rol | Ism |
|---|---|---|
| **998993212141** | Director | Husniddin Khayitov |
| 998900000004 | Academic Manager | Dilshod Rahimov |
| 998900000005 | Reception | Gulnoza Islomova |
| 998900000008 | Accountant | Otabek Saidov |
| 998900000015 | IT Admin | Jumayev Baxtbek |
| 998900000016 | Senior Teacher | Jasurbek Boboqulov (CEFR) |
| 998900000022 | Teacher | Madina Karimova (IELTS) |
| 998900000027 | Student | Diyorbek Azizov |

Jami **30 akkaunt · 18 rol** — har rol faqat o'ziga tegishli menyularni ko'radi.
Login sahifasida tezkor kirish tugmalari bor.

---

## 📊 Platforma imkoniyatlari

**103 menyu · 9 bo'lim · 82 jadval · 480+ demo yozuv · 0 bo'sh sahifa**

| Bo'lim | Modullar |
|---|---|
| **Command Center** | Dashboard, Live Classroom, Jadval, AI Analitika, Kalendar, Filiallar xaritasi, Vazifalar, Yig'ilishlar, KPI |
| **Akademik** | O'quvchilar, O'qituvchilar, Guruhlar, Guruh analitika, Teacher KPI, O'qituvchi jadvali, Dars kutubxonasi, Xona bron, Davomat, Davomat belgilash, Imtihonlar, Sertifikatlar, Kutubxona, Kurslar, CEFR, O'quv reja |
| **O'quv jarayoni** | Darslar (video + coin), Topshiriqlar, Esselar, Testlar, Vazifa tekshiruvi, Mock imtihonlar, Natijalar, Coin berish |
| **O'quvchi boshqaruvi** | Ro'yxatga olish, Guruh o'zgartirish, Muzlatilganlar, Bitiruvchilar, Portfolio, Timeline, TOP 100 |
| **Moliya** | Buxgalteriya, To'lovlar, Xarajatlar, Oyliklar, Bonuslar, Jarimalar, Kassa, Bank, Fatura, Chegirmalar |
| **Marketing & CRM** | CRM, Reception, Sales Pipeline, Demo darslar, Kutish ro'yxati, Tavsiya dasturi, Follow Up, Lidlar, Kampaniyalar, So'rovnomalar |
| **Boshqaruv** | Filiallar, Xonalar, Inventar, HR, Hujjatlar, Shartnomalar, Lavozimlar, Tartib-qoidalar, Xodim baho, Ta'til, Hamkorlar, Tiketlar |
| **Gamifikatsiya** | Olimpiada, Debate Club, Speaking Club, Hall of Fame, Missiyalar, Badge, Coin Shop |
| **Tizim** | Parollar, Rollar & Ruxsatlar, Audit, Tadbirlar, SMS tarix, Resurs markazi, Hisobotlar, Backup, Sozlamalar |

### Maxsus imkoniyatlar
- 🌙 **Tun / Kun rejimi** — topbar tugmasi orqali
- 🌐 **3 til** — O'zbekcha / Русский / English
- 🪙 **Coin tizimi** — bir martada maks **40 coin**, o'quvchi balansi maks **50 000**
- 🛍️ **Coin Shop** — 30 ta sovg'a (Ruchka 1 500 → Dubay sayohati 1 500 000)
- 🔴🟢 **Davomat belgilash** — Aktiv / Passiv / Noaktiv / Qatnashmadi / Arxiv dumaloqlari
- 🕐 **3 smena** — Ertalabki (08–12) · Kunduzgi (12–16) · Kechki (16–22)
- 🗳️ **So'rovnoma** — Ha/Yo'q ovoz + sharh qoldirish
- 🧠 **AI Analitika** — kim o'sadi, kim e'tibor talab qiladi + oylik hisobot
- 🔑 **Parollar moduli** — har bir foydalanuvchi uchun parol yaratish/almashtirish
- 📄 **Eksport** — Audit va hisobotlarni CSV / TXT formatida yuklab olish

---

## 📁 Struktura

```
iso-termizy-lms/
├── start.bat / start.sh     # Bir bosishda ishga tushirish
├── server/
│   ├── src/index.js         # 80+ API endpoint
│   ├── src/db.js            # JSON baza (82 jadval)
│   ├── src/seed.js          # 480+ demo yozuv
│   └── data/db.json         # Ma'lumotlar (avtomatik)
└── client/
    └── src/
        ├── config/menu.js       # 103 menyu
        ├── config/resources.js  # CRUD konfiguratsiya
        ├── pages/               # 19 sahifa
        └── i18n/                # 3 tilli
```

## 🧩 Yangi modul qo'shish

1. `server/src/db.js` → `TABLES` ga nom qo'shing
2. `server/src/index.js` → `app.use('/api/x', crudRouter('x', ['ustun1','ustun2']))`
3. `client/src/config/resources.js` → `x: { title, endpoint, columns, fields }`
4. `client/src/config/menu.js` → `{ key:'x', kind:'resource', resource:'x', roles:[...] }`

---

## 🎨 Brend

- **Ranglar:** Tilla `#C6A15B` · To'q ko'k `#1C2B45` (Timuriylar me'morchiligi)
- **Shriftlar:** Marcellus (sarlavha) + Inter (matn)
- **Talab:** Node.js 18+

---

© 2026 ISO Termizy Avlodlari · Sherobod

---

## 🚀 Deploy qilish (serverga joylashtirish)

### 1-usul: VPS (Hetzner, DigitalOcean, Timeweb)
```bash
# 1. VPS serverga SSH orqali kiring
ssh root@your-server-ip

# 2. Node.js o'rnating
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# 3. PM2 o'rnating (server o'chib qolmasligi uchun)
npm install -g pm2

# 4. Loyihani yuklang
# SCP, Git yoki FTP orqali iso-termizy-lms/ papkasini serverga ko'chiring
scp -r iso-termizy-lms/ root@your-server-ip:/opt/

# 5. Kutubxonalarni o'rnating
cd /opt/iso-termizy-lms/server && npm install
cd /opt/iso-termizy-lms/client && npm install && npm run build

# 6. Backend'ni ishga tushiring
cd /opt/iso-termizy-lms/server
PORT=4000 pm2 start src/index.js --name iso-api

# 7. Frontend uchun Nginx o'rnating
apt install -y nginx
```

Nginx config (`/etc/nginx/sites-available/iso-termizy`):
```nginx
server {
    listen 80;
    server_name your-domain.uz;

    root /opt/iso-termizy-lms/client/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://localhost:4000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

```bash
ln -s /etc/nginx/sites-available/iso-termizy /etc/nginx/sites-enabled/
nginx -t && systemctl restart nginx

# 8. HTTPS (bepul SSL)
apt install certbot python3-certbot-nginx
certbot --nginx -d your-domain.uz
```

### 2-usul: Railway / Render (bepul hosting)
1. GitHub'ga loyihani push qiling
2. railway.app yoki render.com da yangi loyiha yarating
3. Server: `cd server && npm install && npm start`
4. Client: `cd client && npm install && npm run build`

---

## 🤖 Telegram bot ulash (keyingi bosqich)

Telegram bot qo'shish uchun kerak bo'ladi:
1. @BotFather da yangi bot yaratish → TOKEN olish
2. `npm install node-telegram-bot-api` — server'ga
3. `server/src/bot.js` fayl yaratish:
   - `/login` — parol orqali kirish
   - `/balance` — coin balansi
   - `/schedule` — dars jadvali
   - Bildirishnomalar — to'lov eslatmasi, yangi dars, natijalar
4. Bot'ni PM2 bilan ishga tushirish

> Bu haqiqiy Telegram API bilan ishlaydi — demo emas.
> Kerak bo'lsa, keyingi bosqichda to'liq qilamiz.

---

## 📧 SMS / Email integratsiya

- **SMS**: Eskiz.uz yoki PlayMobile API orqali
- **Email**: Nodemailer + Gmail SMTP
- **Telegram**: node-telegram-bot-api

Har biri alohida API kalit talab qiladi — `.env` faylga yoziladi.
