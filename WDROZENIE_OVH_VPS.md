# 🚀 Wdrożenie na VPS OVH.pl - Instrukcja krok po kroku

Kompleksowy przewodnik wdrożenia aplikacji trychologicznej na VPS OVH.pl.

## 📋 Spis treści

1. [Wymagania wstępne](#wymagania-wstępne)
2. [Szybka instalacja (Skrypt)](#szybka-instalacja-skrypt)
3. [Konfiguracja bazy danych](#konfiguracja-bazy-danych)
4. [Wdrożenie aplikacji](#wdrożenie-aplikacji)
5. [Konfiguracja domeny i SSL](#konfiguracja-domeny-i-ssl)
6. [Backup i monitoring](#backup-i-monitoring)

---

## 🛒 Wymagania wstępne

1. **VPS OVH**:
   - System: **Ubuntu 22.04 LTS**
   - Plan: Starter lub Value
   - Dostęp root (IP i hasło)

2. **Domena (Opcjonalnie)**:
   - Jeśli nie masz domeny, będziesz używać adresu IP serwera.
   - **Uwaga:** Bez domeny nie będziesz mieć kłódki (HTTPS/SSL), przeglądarka może wyświetlać ostrzeżenie "Niezabezpieczona".

3. **Lokalne pliki**:
   - Folder `deploy/` w tym projekcie zawiera gotowe skrypty konfiguracyjne.

---

## 🚀 Szybka instalacja (Skrypt)

Zamiast wpisywać dziesiątki komend ręcznie, przygotowaliśmy skrypt automatyzujący instalację środowiska.

### Krok 1: Połączenie z serwerem

Uruchom terminal (PowerShell lub CMD) i połącz się z serwerem:

```powershell
ssh root@twoj-ip-serwera
# Wpisz hasło z maila od OVH
```

### Krok 2: Przygotowanie serwera

Na serwerze (jako root):

1. **Zaktualizuj system:**
   ```bash
   apt update && apt upgrade -y
   apt install -y git
   ```

2. **Pobierz repozytorium (lub prześlij pliki):**
   
   Jeśli masz kod na GitHub/GitLab:
   ```bash
   git clone https://github.com/twoj-login/twoje-repo.git /var/www/trichology
   ```
   
   *Alternatywnie, prześlij pliki z komputera lokalnego (w nowym oknie terminala):*
   ```powershell
   # Uruchom z lokalnego folderu projektu
   scp -r . root@twoj-ip-serwera:/var/www/trichology
   ```

3. **Uruchom skrypt instalacyjny:**

   Wróć do terminala serwera:
   ```bash
   cd /var/www/trichology/deploy
   chmod +x setup.sh
   ./setup.sh
   ```

   *Ten skrypt zainstaluje: Node.js, PostgreSQL, Nginx, PM2, Firewall i skonfiguruje podstawowe zabezpieczenia.*

---

## 🗄️ Konfiguracja bazy danych

Skrypt zainstalował PostgreSQL, teraz musimy utworzyć bazę i użytkownika.

```bash
# Zaloguj się do PostgreSQL
sudo -u postgres psql

# W konsoli psql wykonaj (zmień hasło na własne!):
CREATE DATABASE trichology_db;
CREATE USER trichology_user WITH PASSWORD 'twoje-silne-haslo';
GRANT ALL PRIVILEGES ON DATABASE trichology_db TO trichology_user;
ALTER USER trichology_user CREATEDB;
\q
```

---

## 📦 Wdrożenie aplikacji

### Krok 1: Backend

1. Przejdź do katalogu backendu:
   ```bash
   cd /var/www/trichology/backend
   ```

2. Skonfiguruj zmienne środowiskowe:
   ```bash
   cp .env.example .env
   nano .env
   ```
   *Uzupełnij dane (DATABASE_URL, JWT_SECRET, SMTP itp.).*
   *- `DATABASE_URL`: Użyj 'localhost' (np. `postgresql://user:pass@localhost:5432/db`).*
   *- `FRONTEND_URL`: Wpisz `http://TWOJE_IP_SERWERA` (np. `http://51.123.45.67`).*

3. Instalacja i budowanie:
   ```bash
   npm ci
   npx prisma generate
   npx prisma migrate deploy
   npm run build
   ```

4. Uruchomienie z PM2:
   ```bash
   # Użyj przygotowanego pliku konfiguracyjnego
   pm2 start ../deploy/ecosystem.config.js
   pm2 save
   pm2 startup
   ```

### Krok 2: Frontend

1. Przejdź do katalogu frontendu:
   ```bash
   cd /var/www/trichology/frontend
   ```

2. Skonfiguruj zmienne:
   ```bash
   nano .env.production
   ```
   Wpisz: `VITE_API_URL=http://TWOJE_IP_SERWERA` (np. `http://51.123.45.67`)

3. Instalacja i budowanie:
   ```bash
   npm ci
   npm run build
   ```

---

## 🌐 Konfiguracja Nginx (Dostęp przez IP)

1. Skopiuj gotową konfigurację:
   ```bash
   cp /var/www/trichology/deploy/nginx.conf /etc/nginx/sites-available/trichology
   ```
   *Domyślna konfiguracja jest już ustawiona pod dostęp przez IP.*

2. Aktywuj stronę:
   ```bash
   ln -s /etc/nginx/sites-available/trichology /etc/nginx/sites-enabled/
   rm /etc/nginx/sites-enabled/default
   nginx -t
   systemctl reload nginx
   ```

3. **Gotowe!** Aplikacja powinna być dostępna pod adresem: `http://TWOJE_IP_SERWERA`

*Uwaga: Pomiń krok "Certyfikat SSL", ponieważ certyfikaty działają tylko z domenami.*

---

## 💾 Backup i monitoring

### Skrypty backupu

W katalogu `scripts/` znajdują się skrypty backupu. Skonfiguruj Cron, aby uruchamiał je automatycznie:

```bash
crontab -e
```

Dodaj:
```
0 2 * * * /var/www/trichology/backend/scripts/backup.sh
```

---

## 🆘 Rozwiązywanie problemów

- **Logi aplikacji**: `pm2 logs trichology-backend`
- **Logi Nginx**: `tail -f /var/log/nginx/error.log`
- **Status usług**: `systemctl status nginx postgresql`

---

## 🔄 Aktualizacja i naprawa błędów

Po wdrożeniu aplikacji, gdy będziesz chciał aktualizować kod lub naprawiać błędy, zobacz:

📖 **[AKTUALIZACJA_VPS.md](./AKTUALIZACJA_VPS.md)** - Kompleksowy przewodnik dotyczący:
- Aktualizacji kodu na VPS
- Wdrażania zmian
- Naprawy błędów
- Sprawdzania logów
- Rollback (cofanie zmian)
- Skrypty pomocnicze w katalogu `deploy/`

### Szybki start - aktualizacja:

```bash
# Na serwerze VPS
cd /var/www/trichology

# Użyj gotowego skryptu wdrożenia
chmod +x deploy/deploy.sh
./deploy/deploy.sh
```

### Sprawdzenie statusu:

```bash
chmod +x deploy/status.sh
./deploy/status.sh
```