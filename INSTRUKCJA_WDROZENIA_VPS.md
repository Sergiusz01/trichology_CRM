# 📦 Instrukcja Wdrożenia Aplikacji na VPS OVH

## 📋 Spis treści
1. [Informacje o serwerze](#informacje-o-serwerze)
2. [Przygotowanie VPS](#przygotowanie-vps)
3. [Konfiguracja projektu](#konfiguracja-projektu)
4. [Pierwsza instalacja](#pierwsza-instalacja)
5. [Aktualizacja aplikacji](#aktualizacja-aplikacji)
6. [Zarządzanie i monitoring](#zarządzanie-i-monitoring)

---

## 🖥️ Informacje o serwerze

**Dane dostępowe:**
- **Nazwa VPS:** vps-d33aef4a.vps.ovh.net
- **IPv4:** 54.37.138.254
- **IPv6:** 2001:41d0:601:1100::4f0
- **Użytkownik:** ubuntu
- **Hasło:** ue9neKBATu5N

**Architektura wdrożenia:**
- Frontend: Nginx (serwowanie plików statycznych)
- Backend: Docker Container (Node.js + Express)
- Baza danych: PostgreSQL (Docker Container)
- Reverse Proxy: Nginx
- SSL: Let's Encrypt (Certbot)

---

## 🚀 Przygotowanie VPS

### 1. Połączenie z serwerem

Z Windows PowerShell:
```powershell
ssh ubuntu@54.37.138.254
# Hasło: ue9neKBATu5N
```

### 2. Aktualizacja systemu i instalacja podstawowych narzędzi

```bash
# Aktualizacja systemu
sudo apt update && sudo apt upgrade -y

# Instalacja niezbędnych narzędzi
sudo apt install -y git curl wget nano ufw fail2ban

# Instalacja Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker ubuntu

# Instalacja Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Instalacja Node.js (do budowania frontendu)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Weryfikacja instalacji
docker --version
docker-compose --version
node --version
npm --version
```

### 3. Konfiguracja firewalla

```bash
# Konfiguracja UFW
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable
sudo ufw status
```

### 4. Zmiana hasła (opcjonalnie, ale zalecane)

```bash
passwd
# Ustaw nowe silne hasło
```

### 5. Konfiguracja SSH dla lepszego bezpieczeństwa (opcjonalnie)

```bash
# Edytuj konfigurację SSH
sudo nano /etc/ssh/sshd_config

# Zmień lub dodaj:
# PermitRootLogin no
# PasswordAuthentication yes  # lub 'no' jeśli używasz kluczy SSH
# MaxAuthTries 3

# Restart SSH
sudo systemctl restart sshd
```

---

## 📦 Konfiguracja projektu

### 1. Przygotowanie struktury katalogów na serwerze

```bash
# Utwórz katalog dla aplikacji
mkdir -p ~/app
cd ~/app

# Utwórz katalogi dla danych trwałych
mkdir -p ~/app/data/postgres
mkdir -p ~/app/data/backend-storage
mkdir -p ~/app/logs
```

### 2. Konfiguracja lokalnego repozytorium Git (na Twoim komputerze)

Jeśli jeszcze nie masz repozytorium Git:

```powershell
# W katalogu projektu na Windows
cd C:\Users\SEEGIUSZ\OneDrive\Pulpit\formularz

# Inicjalizacja Git (jeśli nie została wykonana)
git init

# Dodaj wszystkie pliki
git add .
git commit -m "Initial commit"
```

### 3. Utwórz plik `.gitignore` w głównym katalogu

Utwórz plik `.gitignore` z następującą zawartością:

```
node_modules/
dist/
build/
.env
.env.local
*.log
storage/
data/
.DS_Store
*.swp
*.swo
*~
.vscode/
.idea/
```

### 4. Przygotowanie plików konfiguracyjnych

#### A. Plik `docker-compose.prod.yml` (główny katalog projektu)

Utwórz nowy plik `docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  # PostgreSQL Database
  postgres:
    image: postgres:15-alpine
    container_name: trichology-db
    restart: unless-stopped
    environment:
      POSTGRES_DB: ${DB_NAME}
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      PGDATA: /var/lib/postgresql/data/pgdata
    volumes:
      - ./data/postgres:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    networks:
      - trichology-network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER} -d ${DB_NAME}"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Backend API
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: trichology-backend
    restart: unless-stopped
    environment:
      NODE_ENV: production
      DATABASE_URL: postgresql://${DB_USER}:${DB_PASSWORD}@postgres:5432/${DB_NAME}?schema=public
      JWT_SECRET: ${JWT_SECRET}
      JWT_REFRESH_SECRET: ${JWT_REFRESH_SECRET}
      FRONTEND_URL: ${FRONTEND_URL}
      SMTP_HOST: ${SMTP_HOST}
      SMTP_PORT: ${SMTP_PORT}
      SMTP_USER: ${SMTP_USER}
      SMTP_PASS: ${SMTP_PASS}
      EMAIL_FROM: ${EMAIL_FROM}
    volumes:
      - ./data/backend-storage:/app/storage
    ports:
      - "3001:3001"
    depends_on:
      postgres:
        condition: service_healthy
    networks:
      - trichology-network
    healthcheck:
      test: ["CMD", "node", "-e", "require('http').get('http://localhost:3001/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

networks:
  trichology-network:
    driver: bridge

volumes:
  postgres-data:
  backend-storage:
```

#### B. Plik `.env.production` (główny katalog)

```env
# Database
DB_NAME=trichology_db
DB_USER=trichology_user
DB_PASSWORD=ZMIEN_TO_NA_SILNE_HASLO_123

# JWT Secrets (wygeneruj losowe ciągi znaków)
JWT_SECRET=ZMIEN_TO_NA_LOSOWY_CIAG_ZNAKOW_MIN_32_ZNAKI
JWT_REFRESH_SECRET=ZMIEN_TO_NA_INNY_LOSOWY_CIAG_ZNAKOW_MIN_32_ZNAKI

# Frontend URL
FRONTEND_URL=http://54.37.138.254
# Po skonfigurowaniu domeny: https://twoja-domena.pl

# Email Configuration (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=twoj-email@gmail.com
SMTP_PASS=twoje-haslo-aplikacji-gmail
EMAIL_FROM=twoj-email@gmail.com

# Backend URL (dla frontendu)
VITE_API_URL=http://54.37.138.254:3001
# Po skonfigurowaniu domeny: https://api.twoja-domena.pl
```

**⚠️ WAŻNE:** Wygeneruj bezpieczne hasła i sekrety:

```powershell
# W PowerShell wygeneruj losowe sekrety:
-join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | % {[char]$_})
# Uruchom to 3 razy dla: DB_PASSWORD, JWT_SECRET, JWT_REFRESH_SECRET
```

#### C. Plik `deploy.sh` (skrypt wdrożeniowy)

```bash
#!/bin/bash

# Kolory dla output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}==================================${NC}"
echo -e "${GREEN}  Wdrożenie Aplikacji Trichology${NC}"
echo -e "${GREEN}==================================${NC}\n"

# Sprawdzenie czy jesteśmy w katalogu app
if [ ! -f "docker-compose.prod.yml" ]; then
    echo -e "${RED}Błąd: Nie znaleziono pliku docker-compose.prod.yml${NC}"
    exit 1
fi

# Zatrzymaj stare kontenery
echo -e "${YELLOW}Zatrzymywanie starych kontenerów...${NC}"
docker-compose -f docker-compose.prod.yml down

# Aktualizacja kodu z Git (jeśli używasz)
if [ -d ".git" ]; then
    echo -e "${YELLOW}Aktualizacja kodu z Git...${NC}"
    git pull origin master || git pull origin main
fi

# Budowanie frontendu
echo -e "${YELLOW}Budowanie frontendu...${NC}"
cd frontend
npm install
npm run build

# Kopiowanie zbudowanego frontendu do katalogu nginx
echo -e "${YELLOW}Kopiowanie plików frontendu...${NC}"
sudo rm -rf /var/www/trichology/*
sudo mkdir -p /var/www/trichology
sudo cp -r dist/* /var/www/trichology/
sudo chown -R www-data:www-data /var/www/trichology

cd ..

# Ładowanie zmiennych środowiskowych
if [ -f ".env.production" ]; then
    export $(cat .env.production | grep -v '^#' | xargs)
fi

# Budowanie i uruchamianie kontenerów
echo -e "${YELLOW}Budowanie i uruchamianie kontenerów...${NC}"
docker-compose -f docker-compose.prod.yml up -d --build

# Oczekiwanie na uruchomienie bazy danych
echo -e "${YELLOW}Oczekiwanie na uruchomienie bazy danych...${NC}"
sleep 10

# Uruchomienie migracji Prisma
echo -e "${YELLOW}Uruchamianie migracji bazy danych...${NC}"
docker-compose -f docker-compose.prod.yml exec -T backend npx prisma migrate deploy

# Sprawdzenie statusu
echo -e "\n${YELLOW}Status kontenerów:${NC}"
docker-compose -f docker-compose.prod.yml ps

# Sprawdzenie logów
echo -e "\n${YELLOW}Ostatnie logi backendu:${NC}"
docker-compose -f docker-compose.prod.yml logs --tail=20 backend

echo -e "\n${GREEN}==================================${NC}"
echo -e "${GREEN}  Wdrożenie zakończone!${NC}"
echo -e "${GREEN}==================================${NC}"
echo -e "\nAplikacja powinna być dostępna pod adresem:"
echo -e "${GREEN}Frontend: http://54.37.138.254${NC}"
echo -e "${GREEN}Backend API: http://54.37.138.254:3001${NC}"
```

#### D. Konfiguracja Nginx

Plik `/etc/nginx/sites-available/trichology`:

```nginx
# Frontend
server {
    listen 80;
    listen [::]:80;
    server_name 54.37.138.254;

    root /var/www/trichology;
    index index.html;

    # Logi
    access_log /var/log/nginx/trichology-access.log;
    error_log /var/log/nginx/trichology-error.log;

    # Kompresja
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/json;

    # Frontend - SPA routing
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy do API backendu
    location /api/ {
        proxy_pass http://localhost:3001/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeout dla długich requestów (upload plików)
        proxy_connect_timeout 600;
        proxy_send_timeout 600;
        proxy_read_timeout 600;
        send_timeout 600;
    }

    # Limity dla plików
    client_max_body_size 100M;
}
```

---

## 🎯 Pierwsza instalacja

### 1. Transfer plików na serwer

Możesz użyć jednej z metod:

#### Opcja A: Za pomocą Git (ZALECANE)

Na serwerze:
```bash
cd ~/app
git clone https://github.com/TWOJA_NAZWA_UZYTKOWNIKA/trichology-app.git .
```

Jeśli nie masz repozytorium GitHub, utwórz je:
1. Przejdź na https://github.com/new
2. Utwórz nowe repozytorium (może być prywatne)
3. Na swoim komputerze:

```powershell
git remote add origin https://github.com/TWOJA_NAZWA_UZYTKOWNIKA/trichology-app.git
git branch -M main
git push -u origin main
```

#### Opcja B: Za pomocą SCP (dla małych zmian)

Na swoim komputerze (PowerShell):
```powershell
scp -r C:\Users\SEEGIUSZ\OneDrive\Pulpit\formularz\* ubuntu@54.37.138.254:~/app/
```

### 2. Konfiguracja na serwerze

```bash
# Połącz się z serwerem
ssh ubuntu@54.37.138.254

# Przejdź do katalogu
cd ~/app

# Skopiuj i edytuj plik .env
cp .env.production .env.production
nano .env.production
# Wypełnij wszystkie wymagane wartości!

# Nadaj uprawnienia do skryptu deploy
chmod +x deploy.sh

# Zainstaluj Nginx
sudo apt install -y nginx

# Utwórz katalog dla frontendu
sudo mkdir -p /var/www/trichology

# Skopiuj konfigurację Nginx
sudo nano /etc/nginx/sites-available/trichology
# Wklej konfigurację Nginx z sekcji wyżej

# Aktywuj konfigurację
sudo ln -s /etc/nginx/sites-available/trichology /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default  # Usuń domyślną konfigurację

# Sprawdź konfigurację
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
sudo systemctl enable nginx
```

### 3. Pierwsze wdrożenie

```bash
cd ~/app

# Załaduj zmienne środowiskowe
export $(cat .env.production | grep -v '^#' | xargs)

# Budowanie frontendu
cd frontend
npm install
npm run build
sudo cp -r dist/* /var/www/trichology/
cd ..

# Uruchomienie kontenerów Docker
docker-compose -f docker-compose.prod.yml up -d --build

# Poczekaj ~20 sekund na uruchomienie
sleep 20

# Uruchom migracje bazy danych
docker-compose -f docker-compose.prod.yml exec backend npx prisma migrate deploy

# Utwórz pierwszego użytkownika (admin)
docker-compose -f docker-compose.prod.yml exec backend npx tsx src/scripts/seed.ts
```

### 4. Weryfikacja instalacji

```bash
# Sprawdź status kontenerów
docker-compose -f docker-compose.prod.yml ps

# Sprawdź logi backendu
docker-compose -f docker-compose.prod.yml logs backend

# Sprawdź logi bazy danych
docker-compose -f docker-compose.prod.yml logs postgres

# Sprawdź czy Nginx działa
sudo systemctl status nginx

# Sprawdź czy aplikacja odpowiada
curl http://localhost:3001/health
```

Otwórz przeglądarkę i wejdź na:
- **Frontend:** http://54.37.138.254
- **Backend API:** http://54.37.138.254/api/health

**Dane logowania (domyślne z seed.ts):**
- Email: admin@example.com
- Hasło: admin123

⚠️ **ZMIEŃ HASŁO NATYCHMIAST PO PIERWSZYM LOGOWANIU!**

---

## 🔄 Aktualizacja aplikacji

### Szybka aktualizacja (gdy masz zmiany w kodzie)

#### Opcja 1: Automatyczna aktualizacja (ZALECANE)

```bash
# Połącz się z serwerem
ssh ubuntu@54.37.138.254

# Przejdź do katalogu
cd ~/app

# Uruchom skrypt deploy
./deploy.sh
```

To wszystko! Skrypt:
1. Pobierze najnowszy kod z Git
2. Zbuduje frontend
3. Przebuduje kontenery Docker
4. Uruchomi migracje
5. Zrestartuje aplikację

#### Opcja 2: Manualna aktualizacja

```bash
ssh ubuntu@54.37.138.254
cd ~/app

# Aktualizacja kodu
git pull origin main

# Aktualizacja frontendu
cd frontend
npm install
npm run build
sudo cp -r dist/* /var/www/trichology/
cd ..

# Aktualizacja backendu
docker-compose -f docker-compose.prod.yml up -d --build backend

# Jeśli były zmiany w schemacie bazy danych
docker-compose -f docker-compose.prod.yml exec backend npx prisma migrate deploy
```

### Aktualizacja tylko frontendu

```bash
ssh ubuntu@54.37.138.254
cd ~/app/frontend
git pull origin main
npm install
npm run build
sudo cp -r dist/* /var/www/trichology/
```

### Aktualizacja tylko backendu

```bash
ssh ubuntu@54.37.138.254
cd ~/app
git pull origin main
docker-compose -f docker-compose.prod.yml up -d --build backend
```

### Aktualizacja ze zmianami w bazie danych

```bash
ssh ubuntu@54.37.138.254
cd ~/app

# Backup bazy danych
docker-compose -f docker-compose.prod.yml exec postgres pg_dump -U trichology_user trichology_db > backup_$(date +%Y%m%d_%H%M%S).sql

# Aktualizacja
git pull origin main
docker-compose -f docker-compose.prod.yml up -d --build

# Migracje
docker-compose -f docker-compose.prod.yml exec backend npx prisma migrate deploy
```

---

## 🛠️ Zarządzanie i monitoring

### Przydatne komendy

```bash
# Status kontenerów
docker-compose -f docker-compose.prod.yml ps

# Logi (wszystkie kontenery)
docker-compose -f docker-compose.prod.yml logs -f

# Logi tylko backend
docker-compose -f docker-compose.prod.yml logs -f backend

# Logi tylko baza danych
docker-compose -f docker-compose.prod.yml logs -f postgres

# Restart konkretnego serwisu
docker-compose -f docker-compose.prod.yml restart backend

# Restart wszystkich serwisów
docker-compose -f docker-compose.prod.yml restart

# Zatrzymanie aplikacji
docker-compose -f docker-compose.prod.yml stop

# Zatrzymanie i usunięcie kontenerów
docker-compose -f docker-compose.prod.yml down

# Wejście do kontenera backend
docker-compose -f docker-compose.prod.yml exec backend sh

# Wejście do bazy danych
docker-compose -f docker-compose.prod.yml exec postgres psql -U trichology_user -d trichology_db
```

### Backup bazy danych

#### Ręczny backup

```bash
# Utwórz katalog na backupy
mkdir -p ~/backups

# Backup bazy danych
docker-compose -f docker-compose.prod.yml exec postgres pg_dump -U trichology_user trichology_db > ~/backups/db_backup_$(date +%Y%m%d_%H%M%S).sql

# Backup z kompresją
docker-compose -f docker-compose.prod.yml exec postgres pg_dump -U trichology_user trichology_db | gzip > ~/backups/db_backup_$(date +%Y%m%d_%H%M%S).sql.gz
```

#### Automatyczny backup (cron)

```bash
# Utwórz skrypt backup
nano ~/backup-db.sh
```

Zawartość `backup-db.sh`:
```bash
#!/bin/bash
cd ~/app
docker-compose -f docker-compose.prod.yml exec -T postgres pg_dump -U trichology_user trichology_db | gzip > ~/backups/db_backup_$(date +%Y%m%d_%H%M%S).sql.gz

# Usuń backupy starsze niż 7 dni
find ~/backups -name "db_backup_*.sql.gz" -mtime +7 -delete
```

```bash
# Nadaj uprawnienia
chmod +x ~/backup-db.sh

# Dodaj do crona (codziennie o 2:00)
crontab -e
# Dodaj linię:
# 0 2 * * * /home/ubuntu/backup-db.sh
```

#### Przywracanie backupu

```bash
# Rozpakuj backup (jeśli skompresowany)
gunzip backup_file.sql.gz

# Przywróć bazę danych
cat backup_file.sql | docker-compose -f docker-compose.prod.yml exec -T postgres psql -U trichology_user -d trichology_db
```

### Monitoring miejsca na dysku

```bash
# Sprawdź użycie dysku
df -h

# Sprawdź rozmiar katalogów Docker
docker system df

# Wyczyść nieużywane obrazy i kontenery
docker system prune -a

# Sprawdź rozmiar katalogów aplikacji
du -sh ~/app/*
du -sh ~/app/data/*
```

### Monitoring wydajności

```bash
# Użycie zasobów przez kontenery
docker stats

# Procesy w systemie
htop  # (zainstaluj: sudo apt install htop)

# Logi systemowe
sudo journalctl -u nginx -f
sudo journalctl -u docker -f
```

### Rozwiązywanie problemów

#### Backend nie odpowiada

```bash
# Sprawdź logi
docker-compose -f docker-compose.prod.yml logs backend

# Restart backendu
docker-compose -f docker-compose.prod.yml restart backend

# Sprawdź czy port jest otwarty
sudo netstat -tlnp | grep 3001
```

#### Baza danych nie działa

```bash
# Sprawdź logi PostgreSQL
docker-compose -f docker-compose.prod.yml logs postgres

# Restart bazy danych
docker-compose -f docker-compose.prod.yml restart postgres

# Sprawdź połączenie
docker-compose -f docker-compose.prod.yml exec postgres pg_isready -U trichology_user
```

#### Frontend wyświetla błędy

```bash
# Sprawdź logi Nginx
sudo tail -f /var/log/nginx/trichology-error.log

# Sprawdź czy pliki istnieją
ls -la /var/www/trichology/

# Zbuduj ponownie frontend
cd ~/app/frontend
npm run build
sudo cp -r dist/* /var/www/trichology/
```

#### Problemy z miejscem na dysku

```bash
# Wyczyść logi Docker
docker-compose -f docker-compose.prod.yml logs --tail=0 -f &
PID=$!
sleep 1
kill $PID

# Wyczyść stare obrazy Docker
docker image prune -a

# Wyczyść stare backupy
find ~/backups -name "*.sql.gz" -mtime +30 -delete

# Rotacja logów Nginx
sudo logrotate -f /etc/logrotate.d/nginx
```

---

## 🔒 Bezpieczeństwo (Opcjonalne ale ZALECANE)

### 1. Konfiguracja SSL/HTTPS (Let's Encrypt)

**Wymagana domena!** Jeśli masz domenę (np. `trichology.example.com`):

```bash
# Instalacja Certbot
sudo apt install -y certbot python3-certbot-nginx

# Uzyskanie certyfikatu
sudo certbot --nginx -d twoja-domena.pl

# Automatyczne odnowienie (Certbot robi to automatycznie)
sudo certbot renew --dry-run
```

Certbot automatycznie zmodyfikuje konfigurację Nginx i doda przekierowanie HTTP → HTTPS.

### 2. Fail2ban (ochrona przed atakami brute-force)

```bash
# Fail2ban jest już zainstalowany, skonfiguruj go
sudo nano /etc/fail2ban/jail.local
```

Dodaj:
```ini
[sshd]
enabled = true
port = ssh
logpath = /var/log/auth.log
maxretry = 3
bantime = 3600

[nginx-http-auth]
enabled = true
port = http,https
logpath = /var/log/nginx/error.log
maxretry = 5
bantime = 600
```

```bash
# Restart Fail2ban
sudo systemctl restart fail2ban
sudo systemctl enable fail2ban

# Sprawdź status
sudo fail2ban-client status
```

### 3. Regularne aktualizacje systemu

```bash
# Utwórz skrypt aktualizacji
sudo nano /usr/local/bin/update-system.sh
```

Zawartość:
```bash
#!/bin/bash
apt update
apt upgrade -y
apt autoremove -y
docker system prune -f
```

```bash
sudo chmod +x /usr/local/bin/update-system.sh

# Dodaj do crona (co tydzień w niedzielę o 3:00)
sudo crontab -e
# Dodaj:
# 0 3 * * 0 /usr/local/bin/update-system.sh
```

---

## 📝 Checklist pierwszego wdrożenia

- [ ] Połączenie z VPS działa
- [ ] System zaktualizowany
- [ ] Docker i Docker Compose zainstalowane
- [ ] Nginx zainstalowany i skonfigurowany
- [ ] Firewall (UFW) skonfigurowany
- [ ] Katalogi utworzone (`~/app`, `~/backups`)
- [ ] Kod skopiowany na serwer (Git lub SCP)
- [ ] Plik `.env.production` skonfigurowany (hasła, sekrety)
- [ ] Frontend zbudowany i skopiowany do `/var/www/trichology`
- [ ] Kontenery Docker uruchomione
- [ ] Migracje bazy danych wykonane
- [ ] Pierwszy użytkownik utworzony (seed.ts)
- [ ] Frontend dostępny przez przeglądarkę
- [ ] Backend API odpowiada na requesty
- [ ] Logowanie do aplikacji działa
- [ ] Backup bazy danych skonfigurowany (cron)
- [ ] Fail2ban skonfigurowany (opcjonalnie)

---

## 🎓 Workflow aktualizacji (uproszczony)

### Na swoim komputerze (development):

1. Wprowadź zmiany w kodzie
2. Testuj lokalnie
3. Commituj zmiany:
   ```powershell
   git add .
   git commit -m "Opis zmian"
   git push origin main
   ```

### Na serwerze (production):

1. Połącz się z serwerem:
   ```bash
   ssh ubuntu@54.37.138.254
   ```

2. Aktualizuj aplikację:
   ```bash
   cd ~/app
   ./deploy.sh
   ```

To wszystko! Automatyczny skrypt zajmie się resztą.

---

## 📞 Wsparcie i dalsze kroki

### Przydatne linki:
- Docker Docs: https://docs.docker.com/
- Nginx Docs: https://nginx.org/en/docs/
- PostgreSQL Docs: https://www.postgresql.org/docs/
- Prisma Docs: https://www.prisma.io/docs

### Następne kroki:
1. **Kup domenę** (np. OVH, home.pl) i skonfiguruj DNS na IP: `54.37.138.254`
2. **Skonfiguruj SSL** za pomocą Let's Encrypt
3. **Skonfiguruj monitoring** (np. Uptime Robot, Grafana)
4. **Skonfiguruj CDN** (np. Cloudflare) dla lepszej wydajności
5. **Przygotuj CI/CD** (np. GitHub Actions) dla automatycznych wdrożeń

---

## 🆘 Szybka pomoc

Jeśli coś nie działa:

1. **Sprawdź logi:** `docker-compose -f docker-compose.prod.yml logs`
2. **Sprawdź status:** `docker-compose -f docker-compose.prod.yml ps`
3. **Restart aplikacji:** `cd ~/app && ./deploy.sh`
4. **Sprawdź firewall:** `sudo ufw status`
5. **Sprawdź Nginx:** `sudo nginx -t && sudo systemctl status nginx`

---

**Powodzenia z wdrożeniem! 🚀**

Jeśli masz pytania, sprawdź logi lub skontaktuj się ze wsparciem technicznym.


