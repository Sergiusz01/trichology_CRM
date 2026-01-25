# 🚀 Wdrożenie Aplikacji na Mikrus Hosting

## ✅ **TAK, możesz hostować całą aplikację na Mikrus!**

Mikrus oferuje:
- ✅ **VPS** - Własny serwer wirtualny
- ✅ **Node.js** - Backend Express
- ✅ **PostgreSQL** - Baza danych
- ✅ **Nginx** - Serwowanie frontendu
- ✅ **SSL** - Bezpieczne połączenie (Let's Encrypt)

---

## 📋 **Wymagania Mikrus**

### **Rekomendowany Plan:**
- **Mikrus 3.0** lub wyższy
- RAM: minimum 2GB (dla PostgreSQL + Node.js)
- Dysk: minimum 10GB
- System: Debian/Ubuntu

### **Cena:**
- ~15-30 PLN/miesiąc (w zależności od planu)

---

## 🛠️ **Plan Wdrożenia Krok po Kroku**

### **FAZA 1: Przygotowanie Serwera (30 min)**

#### **1. Zamów VPS na Mikrus**
```
1. Wejdź na https://mikr.us
2. Wybierz plan (minimum Mikrus 3.0)
3. Wybierz system: Debian 11 lub Ubuntu 22.04
4. Zamów i poczekaj na dane dostępowe (email)
```

#### **2. Połącz się z serwerem**
```bash
# Windows - użyj PuTTY lub PowerShell
ssh root@twoj-serwer.mikr.us

# Zmień hasło root
passwd
```

#### **3. Zaktualizuj system**
```bash
apt update && apt upgrade -y
```

---

### **FAZA 2: Instalacja Oprogramowania (45 min)**

#### **1. Zainstaluj Node.js 18+**
```bash
# Dodaj repozytorium NodeSource
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -

# Zainstaluj Node.js i npm
apt install -y nodejs

# Sprawdź wersję
node --version  # Powinno być v18.x
npm --version
```

#### **2. Zainstaluj PostgreSQL**
```bash
# Zainstaluj PostgreSQL
apt install -y postgresql postgresql-contrib

# Uruchom PostgreSQL
systemctl start postgresql
systemctl enable postgresql

# Sprawdź status
systemctl status postgresql
```

#### **3. Zainstaluj Nginx**
```bash
apt install -y nginx

# Uruchom Nginx
systemctl start nginx
systemctl enable nginx
```

#### **4. Zainstaluj PM2 (Process Manager)**
```bash
npm install -g pm2
```

#### **5. Zainstaluj Git**
```bash
apt install -y git
```

---

### **FAZA 3: Konfiguracja Bazy Danych (15 min)**

#### **1. Utwórz bazę danych**
```bash
# Przełącz się na użytkownika postgres
su - postgres

# Uruchom psql
psql

# W psql:
CREATE DATABASE trichology_db;
CREATE USER trichology_user WITH PASSWORD 'TWOJE_SILNE_HASLO';
GRANT ALL PRIVILEGES ON DATABASE trichology_db TO trichology_user;
\q

# Wyjdź z użytkownika postgres
exit
```

#### **2. Skonfiguruj dostęp zdalny (opcjonalnie)**
```bash
# Edytuj postgresql.conf
nano /etc/postgresql/*/main/postgresql.conf

# Znajdź i zmień:
listen_addresses = 'localhost'

# Edytuj pg_hba.conf
nano /etc/postgresql/*/main/pg_hba.conf

# Dodaj na końcu:
local   all             trichology_user                         md5

# Restart PostgreSQL
systemctl restart postgresql
```

---

### **FAZA 4: Wdrożenie Aplikacji (30 min)**

#### **1. Utwórz użytkownika aplikacji**
```bash
# Utwórz użytkownika (bezpieczniejsze niż root)
adduser trichology
usermod -aG sudo trichology

# Przełącz się na użytkownika
su - trichology
```

#### **2. Sklonuj kod z GitHub (lub prześlij)**

**Opcja A: GitHub (Rekomendowane)**
```bash
# Jeśli masz repo na GitHub:
cd ~
git clone https://github.com/TWOJ_USERNAME/trichology-app.git
cd trichology-app
```

**Opcja B: SCP/SFTP (Bez GitHub)**
```bash
# Na lokalnym komputerze (Windows PowerShell):
# Spakuj projekt (bez node_modules!)
tar -czf trichology-app.tar.gz --exclude=node_modules --exclude=.git formularz/

# Prześlij na serwer
scp trichology-app.tar.gz trichology@twoj-serwer.mikr.us:~

# Na serwerze:
tar -xzf trichology-app.tar.gz
cd formularz
```

#### **3. Skonfiguruj Backend**
```bash
cd ~/trichology-app/backend  # lub ~/formularz/backend

# Zainstaluj zależności
npm install

# Utwórz .env
nano .env
```

**Zawartość `.env`:**
```env
# Database
DATABASE_URL="postgresql://trichology_user:TWOJE_HASLO@localhost:5432/trichology_db?schema=public"

# JWT
JWT_SECRET="WYGENERUJ_LOSOWY_SEKRET_64_ZNAKI"
JWT_REFRESH_SECRET="WYGENERUJ_INNY_LOSOWY_SEKRET_64_ZNAKI"
JWT_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"

# Server
PORT=3001
NODE_ENV=production

# CORS
FRONTEND_URL=https://twoja-domena.pl

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

# PDF Generation
PDF_OUTPUT_DIR=./storage/pdfs
```

**Wygeneruj sekrety JWT:**
```bash
# Wygeneruj losowe sekrety
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Skopiuj wynik do JWT_SECRET

node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Skopiuj wynik do JWT_REFRESH_SECRET
```

#### **4. Uruchom migracje**
```bash
npx prisma migrate deploy
npx prisma generate
npm run seed  # Utwórz domyślnych użytkowników
```

#### **5. Zbuduj i uruchom Backend**
```bash
# Zbuduj (jeśli masz build script)
npm run build

# Uruchom z PM2
pm2 start npm --name "trichology-backend" -- run start
pm2 save
pm2 startup  # Uruchom przy starcie systemu
```

---

### **FAZA 5: Wdrożenie Frontendu (20 min)**

#### **1. Zbuduj Frontend**
```bash
cd ~/trichology-app/frontend  # lub ~/formularz/frontend

# Zainstaluj zależności
npm install

# Utwórz .env.production
nano .env.production
```

**Zawartość `.env.production`:**
```env
VITE_API_URL=https://twoja-domena.pl
```

**Zbuduj aplikację:**
```bash
npm run build
# Tworzy folder dist/
```

#### **2. Przenieś build do Nginx**
```bash
# Jako root:
sudo mkdir -p /var/www/trichology
sudo cp -r dist/* /var/www/trichology/
sudo chown -R www-data:www-data /var/www/trichology
```

---

### **FAZA 6: Konfiguracja Nginx (20 min)**

#### **1. Utwórz konfigurację Nginx**
```bash
sudo nano /etc/nginx/sites-available/trichology
```

**Zawartość pliku:**
```nginx
server {
    listen 80;
    server_name twoja-domena.pl www.twoja-domena.pl;

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

#### **2. Aktywuj konfigurację**
```bash
# Utwórz symlink
sudo ln -s /etc/nginx/sites-available/trichology /etc/nginx/sites-enabled/

# Usuń domyślną konfigurację
sudo rm /etc/nginx/sites-enabled/default

# Testuj konfigurację
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

---

### **FAZA 7: SSL (Let's Encrypt) (15 min)**

#### **1. Zainstaluj Certbot**
```bash
sudo apt install -y certbot python3-certbot-nginx
```

#### **2. Uzyskaj certyfikat SSL**
```bash
sudo certbot --nginx -d twoja-domena.pl -d www.twoja-domena.pl

# Postępuj zgodnie z instrukcjami:
# - Podaj email
# - Zaakceptuj ToS
# - Wybierz opcję 2 (redirect HTTP -> HTTPS)
```

#### **3. Auto-renewal**
```bash
# Certbot automatycznie dodaje cron job
# Sprawdź:
sudo certbot renew --dry-run
```

---

### **FAZA 8: Konfiguracja DNS (5 min)**

#### **1. Ustaw rekord A w DNS**
```
Typ: A
Nazwa: @
Wartość: IP_TWOJEGO_SERWERA_MIKRUS
TTL: 3600

Typ: A
Nazwa: www
Wartość: IP_TWOJEGO_SERWERA_MIKRUS
TTL: 3600
```

#### **2. Poczekaj na propagację DNS (5-60 min)**
```bash
# Sprawdź DNS:
nslookup twoja-domena.pl
```

---

## 🔒 **Bezpieczeństwo**

### **1. Firewall (UFW)**
```bash
# Zainstaluj UFW
sudo apt install -y ufw

# Zezwól na SSH, HTTP, HTTPS
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Włącz firewall
sudo ufw enable

# Sprawdź status
sudo ufw status
```

### **2. Fail2Ban (Ochrona przed brute-force)**
```bash
sudo apt install -y fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

### **3. Automatyczne aktualizacje**
```bash
sudo apt install -y unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades
```

---

## 📊 **Monitoring i Utrzymanie**

### **1. Sprawdź status aplikacji**
```bash
# Backend
pm2 status
pm2 logs trichology-backend

# Nginx
sudo systemctl status nginx

# PostgreSQL
sudo systemctl status postgresql
```

### **2. Backup bazy danych**
```bash
# Utwórz backup
pg_dump -U trichology_user trichology_db > backup_$(date +%Y%m%d).sql

# Automatyczny backup (cron)
crontab -e

# Dodaj:
0 2 * * * pg_dump -U trichology_user trichology_db > ~/backups/backup_$(date +\%Y\%m\%d).sql
```

### **3. Aktualizacja aplikacji**
```bash
cd ~/trichology-app

# Pull nowych zmian (jeśli GitHub)
git pull

# Backend
cd backend
npm install
npx prisma migrate deploy
pm2 restart trichology-backend

# Frontend
cd ../frontend
npm install
npm run build
sudo cp -r dist/* /var/www/trichology/
```

---

## 💰 **Koszty Miesięczne**

| Usługa | Koszt |
|--------|-------|
| Mikrus VPS 3.0 | ~20-30 PLN |
| Domena .pl | ~30 PLN/rok (2.50 PLN/m) |
| SSL (Let's Encrypt) | **DARMOWE** |
| **RAZEM** | **~25-35 PLN/miesiąc** |

---

## ✅ **Checklist Wdrożenia**

- [ ] Zamówienie VPS Mikrus
- [ ] Instalacja Node.js, PostgreSQL, Nginx
- [ ] Konfiguracja bazy danych
- [ ] Wgranie kodu aplikacji
- [ ] Konfiguracja .env
- [ ] Migracje Prisma
- [ ] Build frontendu
- [ ] Konfiguracja Nginx
- [ ] SSL (Let's Encrypt)
- [ ] Konfiguracja DNS
- [ ] Firewall (UFW)
- [ ] Backup bazy danych
- [ ] Test aplikacji

---

## 🆘 **Typowe Problemy**

### **Problem: Backend nie startuje**
```bash
# Sprawdź logi
pm2 logs trichology-backend

# Sprawdź czy port 3001 jest wolny
netstat -tulpn | grep 3001

# Sprawdź .env
cat backend/.env
```

### **Problem: Nginx 502 Bad Gateway**
```bash
# Sprawdź czy backend działa
pm2 status

# Sprawdź logi Nginx
sudo tail -f /var/log/nginx/error.log
```

### **Problem: Nie można połączyć z bazą**
```bash
# Sprawdź czy PostgreSQL działa
sudo systemctl status postgresql

# Sprawdź connection string w .env
# Sprawdź hasło użytkownika
```

---

## 🚀 **Gotowe!**

Po wykonaniu wszystkich kroków Twoja aplikacja będzie dostępna pod:
- **Frontend:** https://twoja-domena.pl
- **Backend API:** https://twoja-domena.pl/api
- **Baza danych:** localhost:5432 (tylko z serwera)

---

**Potrzebujesz pomocy z wdrożeniem? Powiedz na którym etapie jesteś!** 🎯
