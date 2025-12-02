# ✅ Checklist Wdrożenia na VPS

Użyj tej checklisty, aby upewnić się, że wszystkie kroki zostały wykonane poprawnie.

---

## 📋 Przygotowanie Lokalne (na Twoim komputerze)

### Konfiguracja projektu
- [ ] Projekt jest w katalogu: `C:\Users\SEEGIUSZ\OneDrive\Pulpit\formularz`
- [ ] Git jest zainicjalizowany (`git init`)
- [ ] Wszystkie zmiany są committowane (`git add .` + `git commit`)
- [ ] Utworzone repozytorium GitHub
- [ ] Kod jest wysłany na GitHub (`git push origin main`)

### Wygenerowanie sekretów
- [ ] Wygenerowane 3 losowe ciągi znaków (po 32 znaki każdy):
  - [ ] DB_PASSWORD
  - [ ] JWT_SECRET  
  - [ ] JWT_REFRESH_SECRET
- [ ] Sekrety zapisane w bezpiecznym miejscu

### Email (Gmail)
- [ ] Włączona weryfikacja dwuetapowa na koncie Gmail
- [ ] Wygenerowane hasło aplikacji Gmail
- [ ] Hasło aplikacji zapisane

---

## 🖥️ Konfiguracja VPS

### Pierwsze połączenie
- [ ] Połączenie SSH działa: `ssh ubuntu@54.37.138.254`
- [ ] Hasło działa: `ue9neKBATu5N`
- [ ] Zmienione hasło użytkownika ubuntu (opcjonalnie)

### Instalacja podstawowych narzędzi
- [ ] Uruchomiony skrypt `setup-vps.sh`
- [ ] Docker zainstalowany (sprawdź: `docker --version`)
- [ ] Docker Compose zainstalowany (sprawdź: `docker-compose --version`)
- [ ] Node.js zainstalowany (sprawdź: `node --version`)
- [ ] Nginx zainstalowany (sprawdź: `nginx -v`)
- [ ] Firewall (UFW) skonfigurowany (sprawdź: `sudo ufw status`)
- [ ] Fail2ban uruchomiony (sprawdź: `sudo systemctl status fail2ban`)

### Struktura katalogów
- [ ] Katalog `~/app` utworzony
- [ ] Katalog `~/backups` utworzony
- [ ] Katalog `/var/www/trichology` utworzony

---

## 📦 Wdrożenie Aplikacji

### Transfer kodu
- [ ] Kod sklonowany z GitHub do `~/app`
  ```bash
  cd ~/app
  git clone https://github.com/TWOJA_NAZWA/trichology-app.git .
  ```

### Konfiguracja środowiska
- [ ] Plik `env.production.template` skopiowany do `.env.production`
- [ ] W pliku `.env.production` wypełnione wszystkie wartości:
  - [ ] DB_NAME
  - [ ] DB_USER
  - [ ] DB_PASSWORD (silne hasło)
  - [ ] JWT_SECRET (32 znaki)
  - [ ] JWT_REFRESH_SECRET (32 znaki)
  - [ ] FRONTEND_URL (http://54.37.138.254)
  - [ ] SMTP_HOST (smtp.gmail.com)
  - [ ] SMTP_PORT (587)
  - [ ] SMTP_USER (Twój Gmail)
  - [ ] SMTP_PASS (hasło aplikacji Gmail)
  - [ ] EMAIL_FROM (Twój Gmail)
  - [ ] VITE_API_URL (http://54.37.138.254:3001)

### Konfiguracja Nginx
- [ ] Plik `nginx-trichology.conf` skopiowany do `/etc/nginx/sites-available/trichology`
- [ ] Symlink utworzony: `/etc/nginx/sites-enabled/trichology`
- [ ] Domyślna konfiguracja usunięta: `/etc/nginx/sites-enabled/default`
- [ ] Konfiguracja Nginx poprawna (sprawdź: `sudo nginx -t`)
- [ ] Nginx zrestartowany (sprawdź: `sudo systemctl restart nginx`)

### Uprawnienia skryptów
- [ ] `chmod +x deploy.sh`
- [ ] `chmod +x backup-db.sh`
- [ ] `chmod +x quick-update.sh`

### Pierwsze wdrożenie
- [ ] Uruchomiony skrypt `./deploy.sh`
- [ ] Frontend zbudowany pomyślnie
- [ ] Kontenery Docker uruchomione
- [ ] Baza danych działa (sprawdź logi)
- [ ] Backend działa (sprawdź logi)
- [ ] Migracje bazy danych wykonane

### Seed danych
- [ ] Uruchomiony seed: `docker-compose -f docker-compose.prod.yml exec backend npx tsx src/scripts/seed.ts`
- [ ] Utworzony użytkownik admin

---

## ✅ Weryfikacja Działania

### Status systemowy
- [ ] Kontenery działają: `docker-compose -f docker-compose.prod.yml ps`
  - [ ] `trichology-db` - status: Up
  - [ ] `trichology-backend` - status: Up
- [ ] Nginx działa: `sudo systemctl status nginx`
- [ ] Brak błędów w logach backendu: `docker-compose -f docker-compose.prod.yml logs backend`

### Testy API
- [ ] Health endpoint odpowiada: `curl http://localhost:3001/health`
  - Oczekiwany wynik: HTTP 200
- [ ] Health endpoint przez Nginx: `curl http://localhost/api/health`
  - Oczekiwany wynik: HTTP 200

### Testy w przeglądarce
- [ ] Frontend ładuje się: http://54.37.138.254
- [ ] Strona logowania wyświetla się poprawnie
- [ ] Brak błędów w konsoli przeglądarki (F12)
- [ ] Backend API odpowiada: http://54.37.138.254/api/health

### Test logowania
- [ ] Można zalogować się na konto:
  - Email: `admin@example.com`
  - Hasło: `admin123`
- [ ] Po zalogowaniu wyświetla się panel główny
- [ ] **ZMIENIONE HASŁO ADMINA** (bardzo ważne!)

### Test funkcjonalności
- [ ] Możliwość dodania nowego pacjenta
- [ ] Możliwość utworzenia konsultacji
- [ ] Upload zdjęć działa
- [ ] Generowanie PDF działa

---

## 🔧 Konfiguracja Automatyzacji

### Automatyczne backupy
- [ ] Skrypt backup uruchomiony ręcznie: `~/backup-db.sh`
- [ ] Backup utworzony w katalogu `~/backups`
- [ ] Dodany task do crontab:
  ```bash
  crontab -e
  # Dodano: 0 2 * * * /home/ubuntu/backup-db.sh
  ```
- [ ] Cron działa: `sudo systemctl status cron`

---

## 🔐 Bezpieczeństwo (Opcjonalne)

### Podstawowe zabezpieczenia
- [ ] Zmienione domyślne hasło SSH
- [ ] Skonfigurowane klucze SSH (zamiast hasła)
- [ ] Fail2ban monitoruje próby logowania
- [ ] Firewall pozwala tylko na porty: 22, 80, 443

### SSL/HTTPS (jeśli masz domenę)
- [ ] Domena wskazuje na IP: 54.37.138.254
- [ ] Zainstalowany Certbot
- [ ] Uzyskany certyfikat SSL: `sudo certbot --nginx -d twoja-domena.pl`
- [ ] Automatyczne odnowienie działa: `sudo certbot renew --dry-run`
- [ ] Zaktualizowane URL w `.env.production`:
  - [ ] FRONTEND_URL=https://twoja-domena.pl
  - [ ] VITE_API_URL=https://twoja-domena.pl/api

---

## 📊 Monitoring i Maintenance

### Logi
- [ ] Wiem jak sprawdzić logi backendu
- [ ] Wiem jak sprawdzić logi bazy danych
- [ ] Wiem jak sprawdzić logi Nginx

### Podstawowe komendy
- [ ] Wiem jak zrestartować aplikację: `docker-compose -f docker-compose.prod.yml restart`
- [ ] Wiem jak zaktualizować aplikację: `./deploy.sh`
- [ ] Wiem jak zrobić backup: `~/backup-db.sh`
- [ ] Wiem jak przywrócić backup z pliku SQL

### Monitoring miejsca
- [ ] Sprawdzony rozmiar dysku: `df -h`
- [ ] Sprawdzony rozmiar katalogów: `du -sh ~/app/*`
- [ ] Sprawdzony rozmiar Docker: `docker system df`

---

## 📈 Następne Kroki (Opcjonalne)

### Ulepszenia
- [ ] Zakup i konfiguracja domeny
- [ ] Konfiguracja SSL (Let's Encrypt)
- [ ] Konfiguracja CDN (np. Cloudflare)
- [ ] Monitoring (np. Uptime Robot, Grafana)
- [ ] CI/CD (GitHub Actions dla automatycznych deploymentów)
- [ ] Backup do zewnętrznego storage (S3, Backblaze)

### Dokumentacja
- [ ] Przeczytana pełna instrukcja: `INSTRUKCJA_WDROZENIA_VPS.md`
- [ ] Zapisane hasła w bezpiecznym miejscu (menedżer haseł)
- [ ] Udokumentowane procedury dla zespołu

---

## 🎉 Gotowe!

Jeśli wszystkie checkboxy są zaznaczone, Twoja aplikacja jest gotowa do użycia w środowisku produkcyjnym!

**Data wdrożenia:** ___________________

**Wdrożenie wykonał:** ___________________

**Uwagi:** 
___________________________________________________________________
___________________________________________________________________
___________________________________________________________________

---

## 🆘 W razie problemów

1. **Sprawdź logi:**
   ```bash
   docker-compose -f docker-compose.prod.yml logs -f
   ```

2. **Zrestartuj aplikację:**
   ```bash
   cd ~/app
   docker-compose -f docker-compose.prod.yml restart
   ```

3. **Pełne przebudowanie:**
   ```bash
   cd ~/app
   ./deploy.sh
   ```

4. **Sprawdź dokumentację:** `INSTRUKCJA_WDROZENIA_VPS.md`


