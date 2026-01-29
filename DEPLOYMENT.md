# Wdrożenie na VPS – wyłącznie IP (91.99.237.141)

Aplikacja **nie używa domeny**; działa tylko pod adresem IP. SSL: **certyfikat self-signed dla IP** (Let's Encrypt nie wystawia certów na same IP).

---

## 1. Zmienne środowiskowe

### Backend (`backend/.env`)

| Zmienna | Opis |
|--------|------|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET`, `JWT_REFRESH_SECRET` | Sekrety JWT |
| `FRONTEND_URL` | Jeden dozwolony origin (np. `http://localhost:5173`) |
| `FRONTEND_URLS` | Wiele originów, po przecinku – **zalecane na VPS** |

**CORS:** Backend akceptuje żądania tylko z adresów z `FRONTEND_URL` / `FRONTEND_URLS`. Dodatkowo dozwolone: `http://localhost:5173`, `http://127.0.0.1:5173`, `localhost:3000`, `127.0.0.1:3000`.

**Przykład na VPS (tylko IP):**
```env
FRONTEND_URLS="https://91.99.237.141,http://91.99.237.141,http://localhost:5173"
```

Skopiuj szablon:
```bash
cp backend/.env.example backend/.env
# edytuj backend/.env
```

### Frontend

| Zmienna | Opis |
|--------|------|
| `VITE_API_URL` | **Tylko dev:** np. `http://localhost:3001`. **Produkcja:** nie ustawiaj – używany jest względny `/api`. |

---

## 2. SSL i Nginx (tylko IP)

- **Certyfikat:** self-signed dla `91.99.237.141` (skrypt `deploy-ssl-ip.sh`).
- **Let's Encrypt / DuckDNS:** trwale usunięte z konfiguracji.

### Wdrożenie SSL na VPS

1. Skopiuj na VPS: `nginx-trichology.conf` → `/tmp/trichology.conf`, `deploy-ssl-ip.sh` → `~/deploy-ssl-ip.sh`.
2. Na VPS:
   ```bash
   chmod +x ~/deploy-ssl-ip.sh
   ~/deploy-ssl-ip.sh
   ```
   Skrypt: tworzy `/etc/nginx/ssl/`, generuje cert self-signed dla IP, dhparam, instaluje config Nginx, **usuwa certyfikat Let's Encrypt** (dawna domena), restart Nginx.

3. **Przeglądarka:** przy pierwszym wejściu na **https://91.99.237.141** pojawi się ostrzeżenie (self-signed). Wybierz „Zaawansowane” → „Przejdź do 91.99.237.141 (niebezpieczne)” – połączenie jest szyfrowane.

### Pliki

- **`nginx-trichology.conf`** – Nginx tylko pod IP, SSL z `/etc/nginx/ssl/trichology-ip.{crt,key}`, `/health`, `/public`, `/api`, `/uploads`.
- **`deploy-ssl-ip.sh`** – generuje cert, usuwa LE, instaluje config.

---

## 3. PM2 (backend)

```bash
cd ~/backend-src
pm2 start dist/index.js --name trichology-backend
pm2 restart trichology-backend   # po zmianach
pm2 logs trichology-backend --lines 50
pm2 startup && pm2 save
```

---

## 4. Diagnostyka

```bash
curl -sk https://91.99.237.141/health
# {"status":"ok",...}
```

**CORS:** `FRONTEND_URLS` musi zawierać `https://91.99.237.141` i `http://91.99.237.141` (redirect 80→443).

**Restart:** `pm2 restart trichology-backend`, `systemctl reload nginx`.

---

## 5. Skrypt wdrożenia (`git-deploy.ps1`)

Po wdrożeniu wyświetla: **Aplikacja: https://91.99.237.141**

---

## 6. Podsumowanie

- **Dostęp:** **https://91.99.237.141** (ew. http → 301 na https).
- **Brak domeny.** Certyfikat self-signed dla IP; Let's Encrypt / DuckDNS usunięte.
- **CORS:** whitelist (localhost + IP z env).
- **Health:** `GET /health`.
