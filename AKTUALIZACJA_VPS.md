# 🔄 Aktualizacja i naprawa błędów na VPS

Kompleksowy przewodnik dotyczący aktualizacji kodu, naprawy błędów i zarządzania aplikacją na VPS OVH.

## 📋 Spis treści

1. [Aktualizacja kodu](#aktualizacja-kodu)
2. [Wdrażanie zmian](#wdrażanie-zmian)
3. [Naprawa błędów](#naprawa-błędów)
4. [Sprawdzanie logów](#sprawdzanie-logów)
5. [Rollback (cofanie zmian)](#rollback-cofanie-zmian)
6. [Skrypty pomocnicze](#skrypty-pomocnicze)

---

## 🔄 Aktualizacja kodu

### Metoda 1: Git (Zalecane - jeśli używasz repozytorium)

**Na lokalnym komputerze:**
1. Wprowadź zmiany w kodzie
2. Zatwierdź i wyślij do repozytorium:
   ```powershell
   git add .
   git commit -m "Opis zmian"
   git push
   ```

**Na serwerze VPS:**
```bash
# Połącz się z serwerem
ssh root@twoj-ip-serwera

# Przejdź do katalogu projektu
cd /var/www/trichology

# Pobierz najnowsze zmiany
git pull

# Przejdź do sekcji "Wdrażanie zmian"
```

### Metoda 2: SCP (Przesyłanie plików bezpośrednio)

**Z lokalnego komputera (PowerShell):**
```powershell
# Prześlij cały projekt (UWAGA: nadpisze pliki na serwerze!)
scp -r . root@twoj-ip-serwera:/var/www/trichology

# Lub tylko konkretne pliki/katalogi:
scp -r backend/src root@twoj-ip-serwera:/var/www/trichology/backend/
scp -r frontend/src root@twoj-ip-serwera:/var/www/trichology/frontend/
```

**Uwaga:** Metoda SCP nadpisze pliki. Upewnij się, że masz backup!

### Metoda 3: Edycja bezpośrednio na serwerze

**Na serwerze VPS:**
```bash
# Połącz się z serwerem
ssh root@twoj-ip-serwera

# Edytuj pliki (np. nano, vim)
cd /var/www/trichology
nano backend/src/index.ts
# Wprowadź zmiany, zapisz (Ctrl+O, Enter, Ctrl+X)
```

---

## 🚀 Wdrażanie zmian

Po zaktualizowaniu kodu na serwerze, musisz przebudować i zrestartować aplikację.

### Krok 1: Backend

```bash
cd /var/www/trichology/backend

# 1. Zainstaluj nowe zależności (jeśli package.json się zmienił)
npm ci

# 2. Uruchom migracje bazy danych (jeśli schema.prisma się zmienił)
npx prisma generate
npx prisma migrate deploy

# 3. Zbuduj aplikację
npm run build

# 4. Zrestartuj aplikację w PM2
pm2 restart trichology-backend

# Lub jeśli używasz innej nazwy:
pm2 restart all
```

### Krok 2: Frontend

```bash
cd /var/www/trichology/frontend

# 1. Zainstaluj nowe zależności (jeśli package.json się zmienił)
npm ci

# 2. Zbuduj aplikację
npm run build

# 3. Zrestartuj Nginx (aby załadować nowe pliki)
systemctl reload nginx
```

### Pełna procedura wdrożenia (jeden skrypt)

```bash
cd /var/www/trichology

# Backend
cd backend
npm ci
npx prisma generate
npx prisma migrate deploy
npm run build
pm2 restart trichology-backend

# Frontend
cd ../frontend
npm ci
npm run build

# Nginx
systemctl reload nginx

echo "✅ Wdrożenie zakończone!"
```

---

## 🐛 Naprawa błędów

### 1. Sprawdź status aplikacji

```bash
# Status PM2 (backend)
pm2 status
pm2 logs trichology-backend --lines 50

# Status Nginx
systemctl status nginx
tail -f /var/log/nginx/error.log

# Status PostgreSQL
systemctl status postgresql
```

### 2. Typowe problemy i rozwiązania

#### Problem: Backend nie uruchamia się

```bash
# Sprawdź logi
pm2 logs trichology-backend --lines 100

# Sprawdź czy port jest zajęty
netstat -tulpn | grep 3001

# Sprawdź zmienne środowiskowe
cd /var/www/trichology/backend
cat .env

# Sprawdź połączenie z bazą danych
sudo -u postgres psql -c "SELECT version();"
```

**Rozwiązania:**
- Jeśli błąd bazy danych: sprawdź `DATABASE_URL` w `.env`
- Jeśli błąd portu: zmień `PORT` w `.env` lub zatrzymaj proces na porcie 3001
- Jeśli błąd zależności: uruchom `npm ci` w katalogu backend

#### Problem: Frontend nie działa / błędy 404

```bash
# Sprawdź logi Nginx
tail -f /var/log/nginx/error.log
tail -f /var/log/nginx/access.log

# Sprawdź konfigurację Nginx
nginx -t
cat /etc/nginx/sites-available/trichology

# Sprawdź czy pliki zostały zbudowane
ls -la /var/www/trichology/frontend/dist
```

**Rozwiązania:**
- Jeśli brak plików: uruchom `npm run build` w katalogu frontend
- Jeśli błąd konfiguracji Nginx: sprawdź ścieżki w `/etc/nginx/sites-available/trichology`
- Jeśli błąd 502: sprawdź czy backend działa (`pm2 status`)

#### Problem: Błędy migracji bazy danych

```bash
cd /var/www/trichology/backend

# Sprawdź status migracji
npx prisma migrate status

# Jeśli są problemy, możesz zresetować migracje (UWAGA: utrata danych!)
# npx prisma migrate reset

# Lub utwórz nową migrację
npx prisma migrate dev --name fix_migration
npx prisma migrate deploy
```

#### Problem: Błędy Prisma Client

```bash
cd /var/www/trichology/backend

# Wygeneruj Prisma Client na nowo
npx prisma generate

# Zrestartuj backend
pm2 restart trichology-backend
```

### 3. Debugowanie w czasie rzeczywistym

```bash
# Oglądaj logi backendu na żywo
pm2 logs trichology-backend --lines 0

# Oglądaj logi Nginx na żywo
tail -f /var/log/nginx/error.log

# Sprawdź użycie zasobów
pm2 monit
htop
```

---

## 📊 Sprawdzanie logów

### Logi aplikacji (PM2)

```bash
# Wszystkie logi
pm2 logs

# Tylko backend
pm2 logs trichology-backend

# Ostatnie 100 linii
pm2 logs trichology-backend --lines 100

# Tylko błędy
pm2 logs trichology-backend --err

# Tylko standardowe wyjście
pm2 logs trichology-backend --out

# Wyczyść logi
pm2 flush
```

### Logi Nginx

```bash
# Logi błędów
tail -f /var/log/nginx/error.log

# Logi dostępu
tail -f /var/log/nginx/access.log

# Ostatnie 50 linii
tail -n 50 /var/log/nginx/error.log
```

### Logi PostgreSQL

```bash
# Sprawdź logi PostgreSQL
sudo tail -f /var/log/postgresql/postgresql-*-main.log

# Lub jeśli logi są w innym miejscu
sudo find /var/log -name "*postgresql*" -type f
```

### Logi systemowe

```bash
# Logi systemd dla wszystkich usług
journalctl -u nginx -f
journalctl -u postgresql -f

# Ostatnie 100 linii
journalctl -u nginx -n 100
```

---

## ⏪ Rollback (cofanie zmian)

Jeśli coś poszło nie tak, możesz cofnąć zmiany.

### Metoda 1: Git (jeśli używasz Git)

```bash
cd /var/www/trichology

# Zobacz historię commitów
git log --oneline -10

# Cofnij do poprzedniego commitu
git reset --hard HEAD~1

# Lub cofnij do konkretnego commitu
git reset --hard <commit-hash>

# Następnie wdróż ponownie (patrz sekcja "Wdrażanie zmian")
```

### Metoda 2: Backup przed wdrożeniem

**Zawsze rób backup przed większymi zmianami!**

```bash
# Utwórz kopię zapasową przed zmianami
cd /var/www
cp -r trichology trichology-backup-$(date +%Y%m%d-%H%M%S)

# Jeśli coś pójdzie nie tak, przywróć:
rm -rf trichology
mv trichology-backup-YYYYMMDD-HHMMSS trichology

# Następnie zrestartuj aplikację
cd trichology/backend
pm2 restart trichology-backend
cd ../frontend
systemctl reload nginx
```

### Metoda 3: Cofnięcie migracji bazy danych

```bash
cd /var/www/trichology/backend

# Sprawdź status migracji
npx prisma migrate status

# Jeśli musisz cofnąć migrację (UWAGA: może spowodować utratę danych!)
# Najpierw zrób backup bazy danych:
pg_dump -U trichology_user trichology_db > backup_$(date +%Y%m%d).sql

# Następnie możesz ręcznie cofnąć migrację w bazie danych
sudo -u postgres psql trichology_db
# W psql: usuń tabelę lub wykonaj odpowiednie komendy SQL
```

---

## 🛠️ Skrypty pomocnicze

### Skrypt szybkiego wdrożenia

Utwórz plik `/var/www/trichology/deploy.sh`:

```bash
#!/bin/bash
set -e

echo "🚀 Rozpoczynam wdrożenie..."

cd /var/www/trichology

# Backup (opcjonalnie)
# cp -r backend backend-backup-$(date +%Y%m%d-%H%M%S)

# Backend
echo "📦 Aktualizuję backend..."
cd backend
npm ci
npx prisma generate
npx prisma migrate deploy
npm run build
pm2 restart trichology-backend

# Frontend
echo "📦 Aktualizuję frontend..."
cd ../frontend
npm ci
npm run build

# Nginx
echo "🔄 Przeładowuję Nginx..."
systemctl reload nginx

echo "✅ Wdrożenie zakończone pomyślnie!"
pm2 status
```

**Użycie:**
```bash
chmod +x /var/www/trichology/deploy.sh
/var/www/trichology/deploy.sh
```

### Skrypt sprawdzania statusu

Utwórz plik `/var/www/trichology/status.sh`:

```bash
#!/bin/bash

echo "📊 Status aplikacji:"
echo ""

echo "🔵 PM2:"
pm2 status
echo ""

echo "🌐 Nginx:"
systemctl status nginx --no-pager -l
echo ""

echo "🗄️ PostgreSQL:"
systemctl status postgresql --no-pager -l
echo ""

echo "📝 Ostatnie logi backendu (10 linii):"
pm2 logs trichology-backend --lines 10 --nostream
```

**Użycie:**
```bash
chmod +x /var/www/trichology/status.sh
/var/www/trichology/status.sh
```

### Skrypt backupu

Utwórz plik `/var/www/trichology/backup-full.sh`:

```bash
#!/bin/bash

BACKUP_DIR="/var/backups/trichology"
DATE=$(date +%Y%m%d-%H%M%S)

mkdir -p $BACKUP_DIR

echo "💾 Tworzenie backupu..."

# Backup bazy danych
pg_dump -U trichology_user trichology_db > $BACKUP_DIR/db_$DATE.sql

# Backup plików
tar -czf $BACKUP_DIR/files_$DATE.tar.gz /var/www/trichology

echo "✅ Backup utworzony w: $BACKUP_DIR"
ls -lh $BACKUP_DIR | tail -5
```

**Użycie:**
```bash
chmod +x /var/www/trichology/backup-full.sh
/var/www/trichology/backup-full.sh
```

---

## 📝 Checklist przed wdrożeniem

- [ ] Zrobiono backup bazy danych
- [ ] Zrobiono backup plików (opcjonalnie)
- [ ] Przetestowano zmiany lokalnie
- [ ] Sprawdzono logi przed wdrożeniem
- [ ] Zaktualizowano kod na serwerze
- [ ] Zainstalowano nowe zależności (`npm ci`)
- [ ] Uruchomiono migracje (jeśli potrzebne)
- [ ] Zbudowano aplikację (`npm run build`)
- [ ] Zrestartowano usługi (PM2, Nginx)
- [ ] Sprawdzono czy aplikacja działa
- [ ] Sprawdzono logi po wdrożeniu

---

## 🆘 Szybka pomoc

### Aplikacja nie działa - szybkie kroki

```bash
# 1. Sprawdź status
pm2 status
systemctl status nginx

# 2. Sprawdź logi
pm2 logs trichology-backend --lines 50

# 3. Zrestartuj wszystko
pm2 restart all
systemctl restart nginx

# 4. Jeśli nadal nie działa, sprawdź konfigurację
cd /var/www/trichology/backend
cat .env | grep -v PASSWORD  # Pokaż .env bez haseł
nginx -t  # Sprawdź konfigurację Nginx
```

### Kontakt i wsparcie

- Logi aplikacji: `pm2 logs trichology-backend`
- Logi serwera: `/var/log/nginx/error.log`
- Status usług: `systemctl status nginx postgresql`
- Dokumentacja projektu: sprawdź pliki `.md` w katalogu głównym

---

## 💡 Najlepsze praktyki

1. **Zawsze rób backup przed większymi zmianami**
2. **Testuj zmiany lokalnie przed wdrożeniem na produkcję**
3. **Używaj Git do śledzenia zmian**
4. **Sprawdzaj logi regularnie**
5. **Wdrażaj zmiany w godzinach o niskim ruchu (jeśli możliwe)**
6. **Miej plan rollback przed wdrożeniem**
7. **Dokumentuj zmiany w commitach**

---

**Ostatnia aktualizacja:** $(date)

