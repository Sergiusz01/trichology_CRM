# 🚀 Wdrożenie Aplikacji - Krok po Kroku z Wyjaśnieniami
## Serwer Hetzner: 91.99.237.141

---

## ✅ **CO MAMY JUŻ ZAINSTALOWANE:**

```
✅ Node.js v20.20.0
✅ npm 10.8.2
✅ PostgreSQL 16.11
✅ Nginx 1.24.0
✅ PM2 (process manager)
```

---

## 📋 **CO TERAZ ZROBIMY:**

### **Faza 3: Konfiguracja Bazy Danych** (10 min)
### **Faza 4: Wdrożenie Backendu** (30 min)
### **Faza 5: Wdrożenie Frontendu** (20 min)
### **Faza 6: Konfiguracja Nginx** (15 min)

---

# 🗄️ **FAZA 3: KONFIGURACJA BAZY DANYCH**

## **Krok 1: Utwórz bazę danych i użytkownika**

### **Komenda:**
```bash
ssh root@91.99.237.141
```

**Wyjaśnienie:** Łączymy się z serwerem przez SSH.

---

### **Komenda:**
```bash
sudo -u postgres psql
```

**Wyjaśnienie:** 
- `sudo -u postgres` - wykonaj jako użytkownik postgres
- `psql` - uruchom klienta PostgreSQL

**Zobaczysz:** `postgres=#` (prompt PostgreSQL)

---

### **Komenda (w psql):**
```sql
CREATE DATABASE trichology_db;
```

**Wyjaśnienie:** Tworzy bazę danych o nazwie `trichology_db`

**Zobaczysz:** `CREATE DATABASE`

---

### **Komenda (w psql):**
```sql
CREATE USER trichology_user WITH PASSWORD 'TwojeSuper$ilneHaslo123!';
```

**Wyjaśnienie:** 
- Tworzy użytkownika `trichology_user`
- **WAŻNE:** Zmień hasło na swoje silne hasło!
- Zapisz to hasło - będzie potrzebne w .env

**Zobaczysz:** `CREATE ROLE`

---

### **Komenda (w psql):**
```sql
GRANT ALL PRIVILEGES ON DATABASE trichology_db TO trichology_user;
```

**Wyjaśnienie:** Daje użytkownikowi pełne uprawnienia do bazy

**Zobaczysz:** `GRANT`

---

### **Komenda (w psql):**
```sql
\c trichology_db
```

**Wyjaśnienie:** Przełącz się na nową bazę danych

**Zobaczysz:** `You are now connected to database "trichology_db"`

---

### **Komenda (w psql):**
```sql
GRANT ALL ON SCHEMA public TO trichology_user;
```

**Wyjaśnienie:** Daje uprawnienia do schematu public (potrzebne dla Prisma)

**Zobaczysz:** `GRANT`

---

### **Komenda (w psql):**
```sql
\q
```

**Wyjaśnienie:** Wyjdź z psql

---

### **Komenda:**
```bash
systemctl status postgresql
```

**Wyjaśnienie:** Sprawdź czy PostgreSQL działa

**Zobaczysz:** `active (running)` - oznacza że działa ✅

---

## ✅ **CHECKPOINT 1: Baza danych gotowa!**

**Co mamy:**
- ✅ Baza danych: `trichology_db`
- ✅ Użytkownik: `trichology_user`
- ✅ Hasło: (Twoje silne hasło)
- ✅ PostgreSQL działa

---

# 📦 **FAZA 4: WDROŻENIE BACKENDU**

## **Krok 2: Przygotuj kod do uploadu**

### **Na LOKALNYM komputerze (Windows PowerShell):**

### **Komenda:**
```powershell
cd c:\Users\SEEGIUSZ\OneDrive\Pulpit\formularz
```

**Wyjaśnienie:** Przejdź do katalogu projektu

---

### **Komenda:**
```powershell
# Spakuj backend (bez node_modules!)
tar -czf backend.tar.gz --exclude=node_modules --exclude=storage backend/
```

**Wyjaśnienie:**
- `tar -czf` - stwórz skompresowane archiwum
- `--exclude=node_modules` - pomiń node_modules (zainstalujemy na serwerze)
- `--exclude=storage` - pomiń stare pliki (zdjęcia, PDF)
- `backend/` - spakuj folder backend

**Zobaczysz:** Plik `backend.tar.gz` (kilka MB)

---

### **Komenda:**
```powershell
# Spakuj frontend (bez node_modules i dist!)
tar -czf frontend.tar.gz --exclude=node_modules --exclude=dist frontend/
```

**Wyjaśnienie:** Analogicznie dla frontendu

**Zobaczysz:** Plik `frontend.tar.gz`

---

### **Komenda:**
```powershell
# Prześlij na serwer
scp backend.tar.gz root@91.99.237.141:~
scp frontend.tar.gz root@91.99.237.141:~
```

**Wyjaśnienie:**
- `scp` - secure copy (kopiowanie przez SSH)
- `root@91.99.237.141:~` - do katalogu domowego roota na serwerze

**Zobaczysz:** Pasek postępu uploadu

**Czas:** ~1-2 minuty (zależy od internetu)

---

## **Krok 3: Rozpakuj i zainstaluj backend**

### **Na SERWERZE (SSH):**

### **Komenda:**
```bash
ssh root@91.99.237.141
```

**Wyjaśnienie:** Połącz się z serwerem

---

### **Komenda:**
```bash
cd ~
ls -lh
```

**Wyjaśnienie:** 
- `cd ~` - przejdź do katalogu domowego
- `ls -lh` - pokaż pliki

**Zobaczysz:** `backend.tar.gz` i `frontend.tar.gz`

---

### **Komenda:**
```bash
tar -xzf backend.tar.gz
tar -xzf frontend.tar.gz
```

**Wyjaśnienie:** 
- `tar -xzf` - rozpakuj archiwum
- Tworzy foldery `backend/` i `frontend/`

**Zobaczysz:** Foldery rozpakowane

---

### **Komenda:**
```bash
cd backend
ls
```

**Wyjaśnienie:** Przejdź do backendu i zobacz pliki

**Zobaczysz:** `src/`, `prisma/`, `package.json`, etc.

---

### **Komenda:**
```bash
npm install
```

**Wyjaśnienie:** Zainstaluj wszystkie zależności Node.js

**Czas:** ~2-3 minuty

**Zobaczysz:** Instalacja pakietów, na końcu: `added XXX packages`

---

## **Krok 4: Skonfiguruj .env**

### **Komenda:**
```bash
nano .env
```

**Wyjaśnienie:** Otwórz edytor nano do stworzenia pliku .env

---

### **Wklej i DOSTOSUJ:**

```env
# Database
DATABASE_URL="postgresql://trichology_user:TwojeSuper$ilneHaslo123!@localhost:5432/trichology_db?schema=public"

# JWT Secrets (WYGENERUJ NOWE!)
JWT_SECRET="TUTAJ_WKLEJ_LOSOWY_SEKRET_64_ZNAKI"
JWT_REFRESH_SECRET="TUTAJ_WKLEJ_INNY_LOSOWY_SEKRET_64_ZNAKI"
JWT_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"

# Server
PORT=3001
NODE_ENV=production

# CORS
FRONTEND_URL=http://91.99.237.141

# File Upload
UPLOAD_DIR=./storage/uploads
MAX_FILE_SIZE=10485760

# Email (SMTP)
SMTP_HOST=h70.seohost.pl
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=sergiusz@stonehenge.pl
SMTP_PASS=Sbfserb1!
EMAIL_FROM=sergiusz@stonehenge.pl

# PDF
PDF_OUTPUT_DIR=./storage/pdfs
```

**WAŻNE ZMIANY:**
1. **DATABASE_URL:** Zmień hasło na to które ustawiłeś w PostgreSQL
2. **JWT_SECRET:** Wygeneruj nowy (poniżej jak)
3. **JWT_REFRESH_SECRET:** Wygeneruj inny nowy
4. **FRONTEND_URL:** Użyj IP serwera (lub domenę jeśli masz)

---

### **Jak wygenerować JWT sekrety:**

**Komenda (w innym terminalu na serwerze):**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Wyjaśnienie:** Generuje losowy 64-znakowy sekret

**Zobaczysz:** `a1b2c3d4e5f6...` (64 znaki)

**Skopiuj i wklej do JWT_SECRET**

**Uruchom ponownie dla JWT_REFRESH_SECRET** (musi być inny!)

---

### **Zapisz plik .env:**
```
Ctrl + O (zapisz)
Enter (potwierdź)
Ctrl + X (wyjdź)
```

---

### **Komenda:**
```bash
cat .env
```

**Wyjaśnienie:** Pokaż zawartość .env (sprawdź czy dobrze)

**Zobaczysz:** Twój plik .env

---

## **Krok 5: Uruchom migracje Prisma**

### **Komenda:**
```bash
npx prisma generate
```

**Wyjaśnienie:** Generuje Prisma Client (potrzebny do komunikacji z bazą)

**Czas:** ~30 sekund

**Zobaczysz:** `✔ Generated Prisma Client`

---

### **Komenda:**
```bash
npx prisma migrate deploy
```

**Wyjaśnienie:** Uruchamia migracje - tworzy tabele w bazie danych

**Czas:** ~10 sekund

**Zobaczysz:** 
```
Applying migration `20240101_init`
✔ Migration applied successfully
```

---

### **Komenda:**
```bash
npm run seed
```

**Wyjaśnienie:** Tworzy domyślnych użytkowników (admin, doctor)

**Zobaczysz:** 
```
✅ Seed completed
Created users:
- admin@example.com (admin123)
- doctor@example.com (doctor123)
```

**ZAPISZ TE DANE LOGOWANIA!**

---

## **Krok 6: Utwórz foldery storage**

### **Komenda:**
```bash
mkdir -p storage/uploads storage/pdfs
chmod 755 storage
chmod 755 storage/uploads
chmod 755 storage/pdfs
```

**Wyjaśnienie:**
- `mkdir -p` - utwórz foldery (z parent)
- `chmod 755` - ustaw uprawnienia (odczyt/zapis/wykonanie)

---

## **Krok 7: Uruchom backend z PM2**

### **Komenda:**
```bash
pm2 start npm --name "trichology-backend" -- run start
```

**Wyjaśnienie:**
- `pm2 start` - uruchom proces
- `--name "trichology-backend"` - nazwa procesu
- `npm run start` - komenda do uruchomienia

**Zobaczysz:**
```
┌─────┬──────────────────────┬─────────┬─────────┐
│ id  │ name                 │ status  │ cpu     │
├─────┼──────────────────────┼─────────┼─────────┤
│ 0   │ trichology-backend   │ online  │ 0%      │
└─────┴──────────────────────┴─────────┴─────────┘
```

---

### **Komenda:**
```bash
pm2 logs trichology-backend --lines 20
```

**Wyjaśnienie:** Pokaż logi backendu

**Zobaczysz:**
```
🚀 Server running on port 3001
📝 Environment: production
✅ Database connected
```

**Jeśli widzisz błędy:** Sprawdź .env (hasło do bazy, sekrety)

---

### **Komenda:**
```bash
pm2 save
pm2 startup
```

**Wyjaśnienie:**
- `pm2 save` - zapisz konfigurację PM2
- `pm2 startup` - uruchom PM2 przy starcie systemu

**Zobaczysz:** Komendę do wykonania (skopiuj i uruchom)

---

## ✅ **CHECKPOINT 2: Backend działa!**

**Sprawdź:**
```bash
curl http://localhost:3001/api/auth/me
```

**Zobaczysz:** `{"error":"No token provided"}` - to DOBRZE! Backend odpowiada!

---

# 🎨 **FAZA 5: WDROŻENIE FRONTENDU**

## **Krok 8: Zbuduj frontend**

### **Komenda:**
```bash
cd ~/frontend
```

**Wyjaśnienie:** Przejdź do folderu frontend

---

### **Komenda:**
```bash
npm install
```

**Wyjaśnienie:** Zainstaluj zależności

**Czas:** ~2-3 minuty

---

### **Komenda:**
```bash
nano .env.production
```

**Wyjaśnienie:** Utwórz plik konfiguracyjny dla produkcji

---

### **Wklej:**
```env
VITE_API_URL=http://91.99.237.141
```

**Wyjaśnienie:** URL do backendu (użyj IP lub domeny)

**Zapisz:** Ctrl+O, Enter, Ctrl+X

---

### **Komenda:**
```bash
npm run build
```

**Wyjaśnienie:** Buduje aplikację React do folderu `dist/`

**Czas:** ~1-2 minuty

**Zobaczysz:**
```
✓ built in 45s
dist/index.html                   0.50 kB
dist/assets/index-xxxxx.js      500.00 kB
dist/assets/index-xxxxx.css      50.00 kB
```

---

### **Komenda:**
```bash
ls -lh dist/
```

**Wyjaśnienie:** Sprawdź czy build się udał

**Zobaczysz:** Pliki `index.html`, `assets/`

---

## **Krok 9: Przenieś build do Nginx**

### **Komenda:**
```bash
mkdir -p /var/www/trichology
cp -r dist/* /var/www/trichology/
chown -R www-data:www-data /var/www/trichology
```

**Wyjaśnienie:**
- `mkdir -p` - utwórz folder dla strony
- `cp -r` - skopiuj wszystkie pliki z dist/
- `chown` - zmień właściciela na www-data (użytkownik Nginx)

---

## ✅ **CHECKPOINT 3: Frontend zbudowany!**

---

# 🌐 **FAZA 6: KONFIGURACJA NGINX**

## **Krok 10: Skonfiguruj Nginx**

### **Komenda:**
```bash
nano /etc/nginx/sites-available/trichology
```

**Wyjaśnienie:** Utwórz konfigurację Nginx dla aplikacji

---

### **Wklej:**

```nginx
server {
    listen 80;
    server_name 91.99.237.141;

    # Frontend - React SPA
    location / {
        root /var/www/trichology;
        try_files $uri $uri/ /index.html;
        
        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # Backend API - Proxy do Node.js
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Uploaded files
    location /uploads {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Max upload size
    client_max_body_size 10M;
}
```

**Wyjaśnienie:**
- `listen 80` - nasłuchuj na porcie 80 (HTTP)
- `location /` - frontend (React)
- `location /api` - proxy do backendu (Node.js na porcie 3001)
- `location /uploads` - pliki uploadowane

**Zapisz:** Ctrl+O, Enter, Ctrl+X

---

### **Komenda:**
```bash
ln -s /etc/nginx/sites-available/trichology /etc/nginx/sites-enabled/
```

**Wyjaśnienie:** Aktywuj konfigurację (symlink)

---

### **Komenda:**
```bash
rm /etc/nginx/sites-enabled/default
```

**Wyjaśnienie:** Usuń domyślną konfigurację Nginx

---

### **Komenda:**
```bash
nginx -t
```

**Wyjaśnienie:** Testuj konfigurację Nginx

**Zobaczysz:**
```
nginx: configuration file /etc/nginx/nginx.conf test is successful
```

**Jeśli błąd:** Sprawdź składnię w pliku konfiguracyjnym

---

### **Komenda:**
```bash
systemctl restart nginx
```

**Wyjaśnienie:** Restart Nginx aby załadować nową konfigurację

---

### **Komenda:**
```bash
systemctl status nginx
```

**Wyjaśnienie:** Sprawdź czy Nginx działa

**Zobaczysz:** `active (running)` ✅

---

## ✅ **CHECKPOINT 4: Nginx skonfigurowany!**

---

# 🎉 **APLIKACJA GOTOWA!**

## **Krok 11: Testuj aplikację**

### **W przeglądarce:**
```
http://91.99.237.141
```

**Powinno załadować się:** Strona logowania aplikacji! 🎉

---

### **Zaloguj się:**
```
Email: admin@example.com
Hasło: admin123
```

**Lub:**
```
Email: doctor@example.com
Hasło: doctor123
```

---

## 📋 **PODSUMOWANIE**

### **✅ Co działa:**
- Frontend: http://91.99.237.141
- Backend API: http://91.99.237.141/api
- PostgreSQL: localhost:5432
- Nginx: Proxy + static files
- PM2: Backend w tle

### **📝 Dane logowania:**
- Admin: admin@example.com / admin123
- Doctor: doctor@example.com / doctor123

### **🔧 Przydatne komendy:**

```bash
# Sprawdź backend
pm2 status
pm2 logs trichology-backend

# Sprawdź Nginx
systemctl status nginx
tail -f /var/log/nginx/error.log

# Sprawdź PostgreSQL
systemctl status postgresql
sudo -u postgres psql -d trichology_db

# Restart backendu
pm2 restart trichology-backend

# Restart Nginx
systemctl restart nginx
```

---

## 🚀 **NASTĘPNE KROKI (Opcjonalne):**

1. **Dodaj domenę** (zamiast IP)
2. **Zainstaluj SSL** (Let's Encrypt)
3. **Skonfiguruj firewall** (UFW)
4. **Ustaw automatyczne backupy**

---

**Gotowe! Aplikacja działa na Hetzner!** 🎉

**Masz pytania? Powiedz!**
