# 🚀 Szybki Start - Wdrożenie na VPS

Ten dokument zawiera skrócone instrukcje dla szybkiego wdrożenia. Szczegółowe informacje znajdziesz w pliku `INSTRUKCJA_WDROZENIA_VPS.md`.

## 📋 Dane VPS

- **IP:** 54.37.138.254
- **User:** ubuntu
- **Hasło:** ue9neKBATu5N

---

## 🎯 Krok 1: Przygotowanie kodu lokalnie

### A. Konfiguracja Git (jeśli nie masz repozytorium)

```powershell
# W katalogu projektu
git init
git add .
git commit -m "Initial commit"

# Utwórz repozytorium na GitHub i połącz
git remote add origin https://github.com/TWOJA_NAZWA/trichology-app.git
git push -u origin main
```

### B. Wygeneruj sekrety

```powershell
# Uruchom 3 razy dla różnych sekretów
-join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | % {[char]$_})
```

Zapisz wygenerowane wartości - będą potrzebne w kroku 3.

---

## 🎯 Krok 2: Konfiguracja VPS

### Połącz się z serwerem

```powershell
ssh ubuntu@54.37.138.254
# Hasło: ue9neKBATu5N
```

### Uruchom skrypt konfiguracyjny

```bash
# Pobierz skrypt konfiguracyjny
wget https://raw.githubusercontent.com/TWOJA_NAZWA/trichology-app/main/setup-vps.sh

# LUB jeśli nie masz jeszcze na GitHub, skopiuj zawartość pliku setup-vps.sh
# i wklej:
nano setup-vps.sh
# Wklej zawartość, zapisz (Ctrl+X, Y, Enter)

# Uruchom skrypt
sudo bash setup-vps.sh

# Po zakończeniu wyloguj się i zaloguj ponownie
exit
ssh ubuntu@54.37.138.254
```

---

## 🎯 Krok 3: Wdrożenie aplikacji

### Sklonuj projekt

```bash
cd ~/app
git clone https://github.com/TWOJA_NAZWA/trichology-app.git .
```

### Skonfiguruj środowisko

```bash
# Skopiuj przykładowy plik konfiguracji
cp .env.production.example .env.production

# Edytuj i wypełnij danymi
nano .env.production
```

**Wypełnij następujące wartości:**
- `DB_PASSWORD` - silne hasło bazy danych
- `JWT_SECRET` - pierwszy wygenerowany sekret
- `JWT_REFRESH_SECRET` - drugi wygenerowany sekret
- `SMTP_USER` - Twój email Gmail
- `SMTP_PASS` - hasło aplikacji Gmail (nie zwykłe hasło!)
- `EMAIL_FROM` - Twój email Gmail

**Jak uzyskać hasło aplikacji Gmail:**
1. https://myaccount.google.com/security
2. Włącz weryfikację dwuetapową
3. https://myaccount.google.com/apppasswords
4. Wygeneruj hasło dla aplikacji

### Skonfiguruj Nginx

```bash
# Skopiuj konfigurację
sudo cp nginx-trichology.conf /etc/nginx/sites-available/trichology

# Aktywuj konfigurację
sudo ln -s /etc/nginx/sites-available/trichology /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Sprawdź konfigurację
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

### Uruchom aplikację

```bash
# Nadaj uprawnienia skryptom
chmod +x deploy.sh
chmod +x backup-db.sh
chmod +x quick-update.sh

# Pierwsze wdrożenie
./deploy.sh
```

Poczekaj około 2-3 minuty na:
- Instalację zależności
- Budowanie frontendu
- Budowanie kontenerów Docker
- Uruchomienie bazy danych
- Migracje

### Utwórz pierwszego użytkownika

```bash
# Uruchom skrypt seed (tworzy użytkownika admin)
docker-compose -f docker-compose.prod.yml exec backend npx tsx src/scripts/seed.ts
```

---

## 🎯 Krok 4: Weryfikacja

### Sprawdź status

```bash
# Status kontenerów
docker-compose -f docker-compose.prod.yml ps

# Logi
docker-compose -f docker-compose.prod.yml logs --tail=50 backend

# Test API
curl http://localhost:3001/health
```

### Otwórz w przeglądarce

- **Frontend:** http://54.37.138.254
- **Backend:** http://54.37.138.254/api/health

### Zaloguj się

**Dane logowania (domyślne):**
- Email: `admin@example.com`
- Hasło: `admin123`

⚠️ **ZMIEŃ HASŁO NATYCHMIAST!**

---

## 🔄 Aktualizacja (w przyszłości)

### Na swoim komputerze

```powershell
git add .
git commit -m "Opis zmian"
git push origin main
```

### Na serwerze

```bash
ssh ubuntu@54.37.138.254
cd ~/app
./deploy.sh
```

Gotowe! 🎉

---

## 📝 Konfiguracja automatycznych backupów

```bash
# Dodaj backup do crona
crontab -e

# Dodaj na końcu pliku (backup codziennie o 2:00):
0 2 * * * /home/ubuntu/backup-db.sh

# Zapisz i wyjdź
```

---

## 🆘 Najczęstsze problemy

### Problem: Backend nie odpowiada

```bash
docker-compose -f docker-compose.prod.yml logs backend
docker-compose -f docker-compose.prod.yml restart backend
```

### Problem: Frontend wyświetla błąd połączenia

Sprawdź zmienną `VITE_API_URL` w `.env.production` i przebuduj frontend:

```bash
cd ~/app
nano .env.production  # Popraw VITE_API_URL
./deploy.sh
```

### Problem: Nie mogę się zalogować

```bash
# Sprawdź czy użytkownik istnieje
docker-compose -f docker-compose.prod.yml exec backend npx tsx src/scripts/checkUsers.ts

# Jeśli nie, utwórz ponownie
docker-compose -f docker-compose.prod.yml exec backend npx tsx src/scripts/seed.ts
```

### Problem: Brak miejsca na dysku

```bash
# Wyczyść Docker
docker system prune -a

# Wyczyść stare backupy
find ~/backups -name "*.sql.gz" -mtime +30 -delete

# Wyczyść logi
sudo truncate -s 0 /var/log/nginx/*.log
```

---

## 📚 Przydatne komendy

```bash
# Status wszystkich kontenerów
docker-compose -f docker-compose.prod.yml ps

# Logi na żywo
docker-compose -f docker-compose.prod.yml logs -f

# Restart aplikacji
docker-compose -f docker-compose.prod.yml restart

# Zatrzymanie aplikacji
docker-compose -f docker-compose.prod.yml stop

# Uruchomienie aplikacji
docker-compose -f docker-compose.prod.yml up -d

# Wejście do kontenera backend
docker-compose -f docker-compose.prod.yml exec backend sh

# Dostęp do bazy danych
docker-compose -f docker-compose.prod.yml exec postgres psql -U trichology_user -d trichology_db
```

---

## 🔐 Bezpieczeństwo (Następne kroki)

### 1. Kup domenę i skonfiguruj SSL

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d twoja-domena.pl
```

### 2. Zmień hasło SSH

```bash
passwd
```

### 3. Skonfiguruj klucze SSH (zamiast hasła)

Na swoim komputerze:
```powershell
ssh-keygen
ssh-copy-id ubuntu@54.37.138.254
```

---

**Potrzebujesz pomocy?** Sprawdź szczegółową instrukcję w `INSTRUKCJA_WDROZENIA_VPS.md`


