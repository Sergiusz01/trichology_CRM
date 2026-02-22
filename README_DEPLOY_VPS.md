# Wdrażanie aplikacji Trichology CRM na VPS

Poniższa instrukcja krok po kroku opisuje proces przygotowania i wdrożenia aplikacji z nowym UI motywu "2026 Light Clinic" opartym o MUI, z całkowitym usunięciem Bootstrapa.

## 1. Zbudowanie projektów (lokalnie)

Przed wdrożeniem upewnij się, że kod działa poprawnie i buduje się bez błędów.

**Frontend:**
```bash
cd frontend
npm install
npm run build
```
Zbudowane pliki znajdą się w folderze `dist`.

**Backend:**
```bash
cd backend
npm install
npm run build
```
Zbudowane pliki pojawią się w folderze `dist`.

## 2. Przesłanie plików na serwer (VPS)

1. Połącz się przez SSH lub FTP/SFTP ze swoim VPS.
2. Skopiuj wygenerowane katalogi produkcyjne:
   - Frontend: `frontend/dist`
   - Backend: kod źródłowy (razem z `package.json`, `.env`, `prisma/`) lub tylko zmapowany build.
3. Rekomendowana struktura na VPS:
   ```
   /var/www/trichology_crm/
   ├── frontend/
   │   └── dist/
   └── backend/
       ├── dist/
       ├── node_modules/
       ├── prisma/
       ├── .env
       └── package.json
   ```

## 3. Konfiguracja Backendu (PM2)

Zainstaluj produkcyjne zależności dla backendu na serwerze i zrestartuj instancję za pomocą menedżera PM2.

```bash
cd /var/www/trichology_crm/backend
npm install --production

# Aktualizacja schematu bazy danych (jeżeli były zmiany)
npx prisma migrate deploy

# Uruchomienie lub restart backendu
pm2 start dist/index.js --name "trichology-api"
# lub jeśli aplikacja już działa
pm2 restart trichology-api
```

## 4. Konfiguracja Frontend (Nginx)

Nowy ujednolicony interfejs MUI będzie działał we wszystkich przeglądarkach jako pliki statyczne. Skorzystaj z Nginx, aby zaserwować aplikację:

```nginx
server {
    listen 80;
    server_name twojadomena.pl; # lub IP VPS

    # Frontend
    location / {
        root /var/www/trichology_crm/frontend/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # API Backend
    location /api {
        proxy_pass http://localhost:3000; # Port, na którym działa backend
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Po aktualizacji pamiętaj o wymuszeniu pełnego restartu nginx:
```bash
sudo nginx -t
sudo systemctl reload nginx
```

## Podsumowanie Gwarancji Kompatybilności

*   Żadne endpointy API, modele Prisma (`schema.prisma`), ani procedury autoryzacji JWT nie uległy zmianie podczas powstawania standardu 2026 Light Clinic.
*   Frontend korzysta z identycznych payloadów JSON. Konfiguracje `.env` używane dotychczas wciąż w pełni współpracują.
*   Logowanie, widok rejestru, interakcja z listą pacjentów, a także galerie zdjęć (Scalp Photos) funkcjonują pod istniejącą procedurą.

Aplikacja "just works"!
