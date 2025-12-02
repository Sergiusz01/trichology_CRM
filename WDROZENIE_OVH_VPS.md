# 🚀 Wdrożenie na VPS OVH.pl - Instrukcja krok po kroku

Kompleksowy przewodnik wdrożenia aplikacji trychologicznej na VPS OVH.pl.

## 📋 Spis treści

1. [Zakup VPS OVH](#zakup-vps-ovh)
2. [Początkowa konfiguracja serwera](#początkowa-konfiguracja-serwera)
3. [Instalacja Node.js i PostgreSQL](#instalacja-nodejs-i-postgresql)
4. [Konfiguracja bazy danych](#konfiguracja-bazy-danych)
5. [Wdrożenie backendu](#wdrożenie-backendu)
6. [Wdrożenie frontendu](#wdrożenie-frontendu)
7. [Konfiguracja Nginx](#konfiguracja-nginx)
8. [Konfiguracja SSL/HTTPS](#konfiguracja-sslhttps)
9. [Konfiguracja firewall](#konfiguracja-firewall)
10. [Automatyczne uruchamianie](#automatyczne-uruchamianie)
11. [Backup i monitoring](#backup-i-monitoring)

---

## 🛒 Zakup VPS OVH

### Krok 1: Wybór planu

1. Przejdź na: https://www.ovh.pl/vps/
2. **Rekomendowany plan dla 50 pacjentów/miesiąc:**
   - **VPS Starter** (~30 PLN/mies) - 2 vCPU, 4GB RAM, 80GB SSD
   - **VPS Value** (~50 PLN/mies) - 2 vCPU, 8GB RAM, 160GB SSD (lepsza wydajność)

3. Wybierz:
   - **System operacyjny**: Ubuntu 22.04 LTS (rekomendowane)
   - **Lokalizacja**: Polska (Gravelines) lub Niemcy (Frankfurt)
   - **Dodatki**: Backup (opcjonalnie, ~5 PLN/mies)

4. Zakończ zakup i poczekaj na email z danymi dostępowymi

### Krok 2: Dostęp do serwera

Po zakupie otrzymasz email z:
- **IP serwera**: np. `51.xxx.xxx.xxx`
- **Hasło root**: tymczasowe hasło
- **Link do panelu**: https://www.ovh.com/manager/

**WAŻNE**: Przy pierwszym logowaniu zmień hasło!

---

## 🔧 Początkowa konfiguracja serwera

### Krok 1: Połączenie z serwerem

**Windows (PowerShell):**
```powershell
ssh root@twoj-ip-serwera
```

**Lub użyj PuTTY:**
- Host: `twoj-ip-serwera`
- Port: `22`
- User: `root`

### Krok 2: Zmiana hasła root

```bash
passwd
# Wprowadź nowe silne hasło
```

### Krok 3: Aktualizacja systemu

```bash
# Aktualizuj listę pakietów
apt update

# Zaktualizuj system
apt upgrade -y

# Zainstaluj podstawowe narzędzia
apt install -y curl wget git nano ufw fail2ban
```

### Krok 4: Utworzenie użytkownika (opcjonalnie, ale rekomendowane)

```bash
# Utwórz nowego użytkownika
adduser trichology
usermod -aG sudo trichology

# Skonfiguruj SSH key (opcjonalnie, bezpieczniejsze)
mkdir -p /home/trichology/.ssh
# Skopiuj swój publiczny klucz SSH do /home/trichology/.ssh/authorized_keys

# Przełącz się na nowego użytkownika
su - trichology
```

---

## 📦 Instalacja Node.js i PostgreSQL

### Krok 1: Instalacja Node.js 18+

```bash
# Dodaj repozytorium NodeSource
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -

# Zainstaluj Node.js
sudo apt-get install -y nodejs

# Sprawdź wersję
node --version  # Powinno pokazać v18.x.x lub wyższe
npm --version
```

### Krok 2: Instalacja PostgreSQL

```bash
# Zainstaluj PostgreSQL
sudo apt-get install -y postgresql postgresql-contrib

# Sprawdź status
sudo systemctl status postgresql

# Włącz automatyczne uruchamianie
sudo systemctl enable postgresql
```

### Krok 3: Instalacja PM2 (Process Manager)

```bash
# Zainstaluj PM2 globalnie
sudo npm install -g pm2

# Sprawdź instalację
pm2 --version
```

### Krok 4: Instalacja Nginx

```bash
# Zainstaluj Nginx
sudo apt-get install -y nginx

# Włącz automatyczne uruchamianie
sudo systemctl enable nginx

# Sprawdź status
sudo systemctl status nginx
```

---

## 🗄️ Konfiguracja bazy danych

### Krok 1: Utworzenie bazy danych i użytkownika

```bash
# Przełącz się na użytkownika postgres
sudo -u postgres psql

# W psql wykonaj:
CREATE DATABASE trichology_db;
CREATE USER trichology_user WITH PASSWORD 'twoje-silne-haslo-tutaj';
GRANT ALL PRIVILEGES ON DATABASE trichology_db TO trichology_user;
ALTER USER trichology_user CREATEDB;
\q
```

**WAŻNE**: Zapamiętaj hasło! Będzie potrzebne w `.env`.

### Krok 2: Konfiguracja PostgreSQL (opcjonalnie)

```bash
# Edytuj konfigurację PostgreSQL
sudo nano /etc/postgresql/14/main/postgresql.conf

# Znajdź i zmień (jeśli potrzebujesz):
# listen_addresses = 'localhost'  # Tylko lokalne połączenia (bezpieczniejsze)

# Edytuj pg_hba.conf dla bezpieczeństwa
sudo nano /etc/postgresql/14/main/pg_hba.conf

# Upewnij się, że masz:
# local   all             all                                     peer
# host    all             all             127.0.0.1/32            md5

# Zrestartuj PostgreSQL
sudo systemctl restart postgresql
```

---

## 🔧 Wdrożenie backendu

### Krok 1: Przygotowanie katalogu

```bash
# Utwórz katalog dla aplikacji
sudo mkdir -p /var/www/trichology
sudo chown -R $USER:$USER /var/www/trichology
cd /var/www/trichology
```

### Krok 2: Sklonuj repozytorium

```bash
# Sklonuj repozytorium (zastąp URL swoim)
git clone https://github.com/twoj-repo/formularz.git .

# Lub prześlij pliki przez SCP:
# scp -r backend frontend root@twoj-ip:/var/www/trichology/
```

### Krok 3: Konfiguracja backendu

```bash
cd /var/www/trichology/backend

# Zainstaluj zależności
npm install

# Utwórz plik .env
nano .env
```

**Zawartość `.env`:**

```env
# Baza danych (użyj localhost, nie IP!)
DATABASE_URL="postgresql://trichology_user:twoje-haslo@localhost:5432/trichology_db?schema=public"

# JWT Secrets (wygeneruj silne sekrety!)
JWT_SECRET="twoj-bardzo-silny-sekret-min-32-znaki-losowe"
JWT_REFRESH_SECRET="twoj-bardzo-silny-refresh-sekret-min-32-znaki-losowe"
JWT_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"

# Port
PORT=3001

# Environment
NODE_ENV=production

# Frontend URL (ustawisz po wdrożeniu frontendu)
FRONTEND_URL="https://twoja-domena.pl"

# Upload settings
UPLOAD_DIR=./storage/uploads
MAX_FILE_SIZE=10485760

# Email (SendGrid)
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASS=SG.xxxxx
EMAIL_FROM=noreply@twoja-domena.pl

# PDF Output
PDF_OUTPUT_DIR=./storage/pdfs
```

**Wygeneruj silne sekrety JWT:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```
Uruchom dwa razy dla `JWT_SECRET` i `JWT_REFRESH_SECRET`.

### Krok 4: Utworzenie katalogów storage

```bash
# Utwórz katalogi na pliki
mkdir -p storage/uploads storage/pdfs storage/email-attachments

# Ustaw uprawnienia
chmod -R 755 storage
```

### Krok 5: Build i migracje

```bash
# Wygeneruj Prisma Client
npx prisma generate

# Uruchom migracje
npx prisma migrate deploy

# Zbuduj aplikację
npm run build

# Sprawdź czy build się powiódł
ls -la dist/
```

### Krok 6: Test uruchomienia

```bash
# Uruchom aplikację ręcznie (do testu)
npm start

# W innym terminalu sprawdź:
curl http://localhost:3001/health

# Powinno zwrócić: {"status":"ok","timestamp":"..."}
# Zatrzymaj aplikację (Ctrl+C)
```

### Krok 7: Uruchomienie z PM2

```bash
# Uruchom aplikację z PM2
pm2 start dist/index.js --name "trichology-backend"

# Sprawdź status
pm2 status

# Zobacz logi
pm2 logs trichology-backend

# Zapisz konfigurację PM2 (automatyczne uruchamianie)
pm2 save

# Skonfiguruj PM2 do uruchamiania przy starcie systemu
pm2 startup
# Wykonaj komendę, którą PM2 pokaże (z sudo)
```

---

## 🎨 Wdrożenie frontendu

### Krok 1: Build frontendu

```bash
cd /var/www/trichology/frontend

# Zainstaluj zależności
npm install

# Utwórz plik .env.production
nano .env.production
```

**Zawartość `.env.production`:**
```env
VITE_API_URL=https://twoja-domena.pl
# Lub jeśli backend na innym subdomain:
# VITE_API_URL=https://api.twoja-domena.pl
```

```bash
# Zbuduj aplikację
npm run build

# Sprawdź czy build się powiódł
ls -la dist/
```

### Krok 2: Konfiguracja Nginx (tymczasowo, bez SSL)

```bash
# Utwórz konfigurację Nginx
sudo nano /etc/nginx/sites-available/trichology
```

**Zawartość pliku:**

```nginx
server {
    listen 80;
    server_name twoja-domena.pl www.twoja-domena.pl;

    root /var/www/trichology/frontend/dist;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/json;

    # Security headers
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # SPA routing
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy API requests to backend
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Proxy uploads
    location /uploads {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
# Włącz konfigurację
sudo ln -s /etc/nginx/sites-available/trichology /etc/nginx/sites-enabled/

# Usuń domyślną konfigurację (opcjonalnie)
sudo rm /etc/nginx/sites-enabled/default

# Sprawdź konfigurację
sudo nginx -t

# Jeśli OK, przeładuj Nginx
sudo systemctl reload nginx
```

---

## 🔒 Konfiguracja SSL/HTTPS

### Krok 1: Instalacja Certbot

```bash
# Zainstaluj Certbot
sudo apt-get install -y certbot python3-certbot-nginx
```

### Krok 2: Konfiguracja DNS

W panelu DNS (gdzie masz domenę):
- **A record**: `twoja-domena.pl` → IP serwera OVH
- **A record**: `www.twoja-domena.pl` → IP serwera OVH

Poczekaj na propagację DNS (15 min - 24h). Sprawdź:
```bash
ping twoja-domena.pl
```

### Krok 3: Uzyskanie certyfikatu SSL

```bash
# Uzyskaj certyfikat SSL
sudo certbot --nginx -d twoja-domena.pl -d www.twoja-domena.pl

# Postępuj zgodnie z instrukcjami:
# - Email (opcjonalnie)
# - Zgoda na warunki
# - Automatyczne przekierowanie HTTP → HTTPS (wybierz opcję 2)
```

Certbot automatycznie zaktualizuje konfigurację Nginx!

### Krok 4: Automatyczne odnawianie

Certbot automatycznie konfiguruje cron job. Sprawdź:
```bash
sudo certbot renew --dry-run
```

### Krok 5: Zaktualizuj zmienne środowiskowe

```bash
# Zaktualizuj .env w backendzie
cd /var/www/trichology/backend
nano .env

# Zmień:
FRONTEND_URL="https://twoja-domena.pl"

# Zrestartuj backend
pm2 restart trichology-backend
```

---

## 🛡️ Konfiguracja firewall

### Krok 1: Podstawowa konfiguracja UFW

```bash
# Sprawdź status
sudo ufw status

# Zezwól na SSH (WAŻNE - zrób to najpierw!)
sudo ufw allow 22/tcp

# Zezwól na HTTP i HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Włącz firewall
sudo ufw enable

# Sprawdź status
sudo ufw status verbose
```

### Krok 2: Konfiguracja Fail2Ban (ochrona przed atakami)

```bash
# Fail2Ban jest już zainstalowany, skonfiguruj go:
sudo nano /etc/fail2ban/jail.local
```

**Dodaj:**

```ini
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[sshd]
enabled = true
port = 22
logpath = /var/log/auth.log
```

```bash
# Zrestartuj Fail2Ban
sudo systemctl restart fail2ban
sudo systemctl enable fail2ban

# Sprawdź status
sudo fail2ban-client status
```

---

## 🔄 Automatyczne uruchamianie

### PM2 (już skonfigurowane)

```bash
# Sprawdź czy PM2 uruchomi się przy starcie
pm2 startup
# Jeśli pokaże komendę z sudo, wykonaj ją

# Zapisz aktualną konfigurację
pm2 save
```

### Test restartu

```bash
# Zrestartuj serwer
sudo reboot

# Po restarcie sprawdź:
pm2 status
sudo systemctl status nginx
sudo systemctl status postgresql
```

---

## 💾 Backup i monitoring

### Krok 1: Skrypt backupu bazy danych

```bash
# Utwórz katalog na backupy
mkdir -p /var/backups/trichology

# Utwórz skrypt backupu
sudo nano /usr/local/bin/backup-db.sh
```

**Zawartość skryptu:**

```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/var/backups/trichology"
DB_NAME="trichology_db"
DB_USER="trichology_user"

# Utwórz backup
PGPASSWORD='twoje-haslo-bazy' pg_dump -U $DB_USER -h localhost $DB_NAME > $BACKUP_DIR/backup_$DATE.sql

# Kompresuj
gzip $BACKUP_DIR/backup_$DATE.sql

# Usuń backupy starsze niż 30 dni
find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +30 -delete

echo "Backup utworzony: backup_$DATE.sql.gz"
```

```bash
# Ustaw uprawnienia
sudo chmod +x /usr/local/bin/backup-db.sh

# Przetestuj
sudo /usr/local/bin/backup-db.sh
```

### Krok 2: Automatyczny backup (cron)

```bash
# Edytuj crontab
sudo crontab -e

# Dodaj (backup codziennie o 2:00):
0 2 * * * /usr/local/bin/backup-db.sh >> /var/log/backup.log 2>&1
```

### Krok 3: Backup plików storage

```bash
# Utwórz skrypt backupu plików
sudo nano /usr/local/bin/backup-files.sh
```

```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/var/backups/trichology"
STORAGE_DIR="/var/www/trichology/backend/storage"

# Utwórz backup
tar -czf $BACKUP_DIR/storage_backup_$DATE.tar.gz -C $STORAGE_DIR .

# Usuń backupy starsze niż 30 dni
find $BACKUP_DIR -name "storage_backup_*.tar.gz" -mtime +30 -delete

echo "Backup plików utworzony: storage_backup_$DATE.tar.gz"
```

```bash
sudo chmod +x /usr/local/bin/backup-files.sh
sudo crontab -e
# Dodaj: 0 3 * * * /usr/local/bin/backup-files.sh >> /var/log/backup.log 2>&1
```

### Krok 4: Monitoring (opcjonalnie)

**PM2 Monitoring:**
```bash
# Zainstaluj PM2 Plus (opcjonalnie, płatne)
pm2 link
```

**Uptime Monitoring:**
- UptimeRobot: https://uptimerobot.com (darmowy)
- Monitoruj: `https://twoja-domena.pl` i `https://twoja-domena.pl/api/health`

---

## 🔧 Aktualizacje aplikacji

### Proces aktualizacji

```bash
cd /var/www/trichology

# Pobierz najnowsze zmiany
git pull origin main

# Backend
cd backend
npm install
npx prisma generate
npx prisma migrate deploy
npm run build
pm2 restart trichology-backend

# Frontend
cd ../frontend
npm install
npm run build
sudo systemctl reload nginx
```

---

## 🆘 Rozwiązywanie problemów

### Backend nie startuje

```bash
# Sprawdź logi PM2
pm2 logs trichology-backend

# Sprawdź czy port jest zajęty
sudo netstat -tulpn | grep 3001

# Sprawdź zmienne środowiskowe
cd /var/www/trichology/backend
cat .env
```

### Baza danych nie działa

```bash
# Sprawdź status PostgreSQL
sudo systemctl status postgresql

# Sprawdź połączenie
sudo -u postgres psql -c "SELECT version();"

# Sprawdź logi
sudo tail -f /var/log/postgresql/postgresql-14-main.log
```

### Nginx nie działa

```bash
# Sprawdź status
sudo systemctl status nginx

# Sprawdź konfigurację
sudo nginx -t

# Sprawdź logi
sudo tail -f /var/log/nginx/error.log
```

### SSL nie działa

```bash
# Sprawdź certyfikat
sudo certbot certificates

# Odnów certyfikat ręcznie
sudo certbot renew --force-renewal
```

### Problemy z uprawnieniami

```bash
# Ustaw właściciela katalogów
sudo chown -R $USER:$USER /var/www/trichology
sudo chmod -R 755 /var/www/trichology
```

---

## ✅ Checklist wdrożenia

### Przed wdrożeniem:
- [ ] VPS OVH zakupiony
- [ ] Domena zakupiona i skonfigurowana DNS
- [ ] Hasło root zmienione
- [ ] System zaktualizowany

### Instalacja:
- [ ] Node.js zainstalowany
- [ ] PostgreSQL zainstalowany i skonfigurowany
- [ ] PM2 zainstalowany
- [ ] Nginx zainstalowany

### Aplikacja:
- [ ] Backend wdrożony i działa
- [ ] Frontend zbudowany
- [ ] Migracje uruchomione
- [ ] PM2 skonfigurowany

### Konfiguracja:
- [ ] Nginx skonfigurowany
- [ ] SSL/HTTPS skonfigurowany
- [ ] Firewall skonfigurowany
- [ ] Backup skonfigurowany

### Testy:
- [ ] Aplikacja dostępna przez HTTPS
- [ ] Logowanie działa
- [ ] API działa
- [ ] Upload plików działa
- [ ] Email działa

---

## 📊 Koszty

**Miesięczne koszty:**
- VPS OVH Starter: ~30 PLN/mies
- Domena: ~40 PLN/rok (~3 PLN/mies)
- SendGrid (email): Darmowy (100 emaili/dzień)
- **Razem: ~33 PLN/mies**

**Roczne koszty:**
- VPS: ~360 PLN/rok
- Domena: ~40 PLN/rok
- **Razem: ~400 PLN/rok**

---

## 🎯 Podsumowanie

Po wykonaniu wszystkich kroków będziesz mieć:
- ✅ Aplikację działającą na HTTPS
- ✅ Automatyczne uruchamianie przy starcie
- ✅ Automatyczne backupy
- ✅ Monitoring i logi
- ✅ Zabezpieczony serwer

**Powodzenia z wdrożeniem! 🚀**

---

## 📚 Przydatne komendy

```bash
# Status serwisów
sudo systemctl status nginx
sudo systemctl status postgresql
pm2 status

# Logi
pm2 logs trichology-backend
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/postgresql/postgresql-14-main.log

# Restart
pm2 restart trichology-backend
sudo systemctl restart nginx
sudo systemctl restart postgresql

# Sprawdź porty
sudo netstat -tulpn

# Sprawdź miejsce na dysku
df -h

# Sprawdź użycie pamięci
free -h
```





 

