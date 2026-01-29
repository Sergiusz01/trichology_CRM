# Wdrożenie na VPS (IP lub domena) + Nginx

Aplikacja powinna działać **stabilnie pod adresem IP** (np. `http://91.99.237.141`), bez zależności od DuckDNS czy innej domeny.

---

## 1. Zmienne środowiskowe

### Backend (`backend/.env`)

| Zmienna | Opis |
|--------|------|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET`, `JWT_REFRESH_SECRET` | Sekrety JWT |
| `FRONTEND_URL` | Jeden dozwolony origin (np. `http://localhost:5173`) |
| `FRONTEND_URLS` | Wiele originów, po przecinku – **zalecane na VPS** |

**CORS:** Backend akceptuje żądania tylko z adresów z `FRONTEND_URL` / `FRONTEND_URLS`. Dodatkowo zawsze dozwolone: `http://localhost:5173`, `http://127.0.0.1:5173`, `localhost:3000`, `127.0.0.1:3000`.

**Przykład na VPS (dostęp po IP, HTTP):**
```env
FRONTEND_URLS="http://91.99.237.141,http://localhost:5173"
```

**Z HTTPS (jak obecnie: IP + duckdns):**
```env
FRONTEND_URLS="https://91.99.237.141,https://trichology.duckdns.org,http://91.99.237.141"
```

Skopiuj szablon:
```bash
cp backend/.env.example backend/.env
# edytuj backend/.env
```

### Frontend

| Zmienna | Opis |
|--------|------|
| `VITE_API_URL` | **Tylko dev:** np. `http://localhost:3001`. **Produkcja za Nginx:** nie ustawiaj – używany jest względny `/api`. |

Przy Nginx front i API są pod tym samym hostem, więc względny `/api` unika CORS.

---

## 2. Nginx (reverse proxy)

**Aktualny VPS (91.99.237.141):** SSL Let's Encrypt tylko dla **trichology.duckdns.org**. Certyfikat nie obejmuje IP – przy **https://91.99.237.141** przeglądarka zgłasza „połączenie nieprywatne". **http://91.99.237.141** → 301 na **https://trichology.duckdns.org** (prywatne połączenie). Używaj domeny do HTTPS. Pełna config: **`nginx-trichology.conf`**.

Frontend: pliki statyczne. API: proxy do Node (port 3001). `/health`, `/public`, `/api`, `/uploads` do backendu.

```nginx
server {
    listen 80;
    server_name _;   # lub Twoja domena / IP

    root /var/www/trichology;
    index index.html;

    # Health check – proxy do backendu (diagnostyka, load balancer)
    location = /health {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # API
    location /api {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
    }

    # Uploads (backend serwuje /uploads)
    location /uploads {
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Public (np. logo)
    location /public {
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header Host $host;
    }

    # SPA – index.html dla ścieżek poza plikami
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

Zapisz np. jako `/etc/nginx/sites-available/trichology`, włącz i przeładuj:

```bash
sudo ln -sf /etc/nginx/sites-available/trichology /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

---

## 3. PM2 (backend)

Backend uruchamiany przez PM2, np.:

```bash
cd ~/backend-src
pm2 start ecosystem.config.js --name trichology-backend
# lub
pm2 start dist/index.js --name trichology-backend
```

**Restart po zmianach:**
```bash
pm2 restart trichology-backend
```

**Logi:**
```bash
pm2 logs trichology-backend --lines 50
```

**Start przy starcie systemu:**
```bash
pm2 startup
pm2 save
```

---

## 4. Diagnostyka i rozwiązywanie problemów

### Backend działa?

```bash
curl -s http://127.0.0.1:3001/health
```

Oczekiwana odpowiedź:
```json
{"status":"ok","timestamp":"...","service":"trichology-backend","corsOrigins":4}
```

Przez Nginx (z maszyny z dostępem do VPS):
```bash
curl -s http://<VPS_IP>/health
```

### Strona się nie otwiera / „nie zawsze”

1. **Sprawdź backend:** `curl http://<VPS_IP>/health` (lub `http://127.0.0.1:3001/health` na serwerze).
2. **Nginx:** `sudo nginx -t` i `sudo systemctl status nginx`.
3. **Firewall:** port 80 (i 443 przy HTTPS) otwarty.
4. **PM2:** `pm2 status` i `pm2 logs trichology-backend`.

### Błędy CORS w konsoli przeglądarki

- Frontend musi być używany pod adresem **dodanym do CORS** (np. `http://<VPS_IP>`).
- W `backend/.env` ustaw `FRONTEND_URLS="http://<VPS_IP>"` (oraz ewent. domenę). Origin w przeglądarce musi **dokładnie** się zgadzać (scheme, host, port).
- Przy Nginx: front i API pod tym samym hostem, względny `/api` – wtedy CORS nie jest potrzebny dla samego API, ale np. nadal dla dev na localhost.

### Wywołania `/api` nie działają (404, 502)

- Nginx: `location /api` musi proxy’ować na ten sam adres i port co backend (np. `http://127.0.0.1:3001`).
- Backend nasłuchuje na `PORT` z `.env` (domyślnie 3001).
- Frontend produkcyjny **bez** `VITE_API_URL` – requesty idą na względny `/api`.

### Restart aplikacji

```bash
# Backend
pm2 restart trichology-backend

# Nginx
sudo systemctl reload nginx
```

---

## 5. Skrypt wdrożenia (`git-deploy.ps1`)

Skrypt odwołuje się do **IP VPS** (np. `http://91.99.237.141`), nie do DuckDNS. Po wdrożeniu wyświetla:

```
--- Gotowe! Aplikacja: http://91.99.237.141 (lub https://<TWOJA_DOMENA> przy Nginx+SSL) ---
```

---

## 6. Podsumowanie

- **Dostęp po IP:** ustaw `FRONTEND_URLS="http://<VPS_IP>"`, front bez `VITE_API_URL`, Nginx jak wyżej.
- **Brak DuckDNS:** wszystko oparte o IP (i opcjonalnie własną domenę).
- **CORS:** tylko whitelista (localhost + adresy z env).
- **Health:** `GET /health` do diagnostyki i monitoringu.
- **Restart:** PM2 dla backendu, `systemctl reload nginx` dla Nginx.
