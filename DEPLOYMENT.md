# Wdrożenie na VPS – wyłącznie IP (91.99.237.141), tylko HTTP

Aplikacja **nie używa domeny**; działa tylko pod adresem IP. **Brak HTTPS** – Nginx serwuje wyłącznie HTTP (port 80). **Brak certyfikatów = brak ostrzeżenia** „certyfikat nie jest zaufany” w przeglądarce.

---

## 1. Zmienne środowiskowe

### Backend (`backend/.env`)

| Zmienna | Opis |
|--------|------|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET`, `JWT_REFRESH_SECRET` | Sekrety JWT |
| `FRONTEND_URL` | Jeden dozwolony origin (np. `http://localhost:5173`) |
| `FRONTEND_URLS` | Wiele originów, po przecinku – **zalecane na VPS** |

**CORS:** Backend akceptuje żądania tylko z adresów z `FRONTEND_URL` / `FRONTEND_URLS`. Dodatkowo dozwolone: localhost (5173, 3000).

**Przykład na VPS (tylko IP, HTTP):**
```env
FRONTEND_URLS="http://91.99.237.141,http://localhost:5173"
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

## 2. Nginx (tylko HTTP, bez SSL)

- **`nginx-trichology.conf`** – jeden blok `server` na porcie 80, bez `listen 443`, bez certyfikatów.
- Lokacje: `/health`, `/public`, `/api`, `/uploads`, SPA (`/` → `index.html`).

Wdrożenie:
```bash
# skopiuj nginx-trichology.conf na VPS
sudo cp /path/to/nginx-trichology.conf /etc/nginx/sites-available/trichology
sudo ln -sf /etc/nginx/sites-available/trichology /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

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
curl -s http://91.99.237.141/health
# {"status":"ok",...}
```

**CORS:** `FRONTEND_URLS` musi zawierać `http://91.99.237.141`.

**Restart:** `pm2 restart trichology-backend`, `systemctl reload nginx`.

---

## 5. Skrypt wdrożenia (`git-deploy.ps1`)

Po wdrożeniu wyświetla: **Aplikacja: http://91.99.237.141**

---

## 6. Opcjonalnie: HTTPS bez ostrzeżenia (import certyfikatu)

Jeśli chcesz **szyfrowanie** i **brak komunikatu** bez domeny: użyj Nginx z SSL (self-signed), wygeneruj cert jak w `deploy-ssl-ip.sh`, a na **każdym komputerze klienckim** zaimportuj `trichology-ip.crt` do **Zaufane główne urzędy certyfikacji** (Windows: `certmgr.msc` → Zaufane główne urzędy certyfikacji → Certyfikaty → Akcje → Wszystkie zadania → Import). Po imporcie przeglądarka przestanie pokazywać ostrzeżenie dla `https://91.99.237.141`.

---

## 7. Cache i HSTS (strona wcześniej na HTTPS)

Serwer wymusza **no-cache** dla `/` i `/index.html`. Urządzenia, które wcześniej odwiedzały aplikację po **HTTPS**, mogą nadal wymuszać https lub używać starego cache. Instrukcja czyszczenia na każdym urządzeniu: **`WYCZYSC_CACHE_I_HSTS.md`**.

---

## 8. Podsumowanie

- **Dostęp:** **http://91.99.237.141** – bez ostrzeżeń o certyfikacie.
- **Brak domeny, brak SSL.** Połączenie nieszyfrowane (HTTP). Dla sieci wewnętrznej / VPN zwykle akceptowalne.
- **CORS:** whitelist (localhost + IP z env).
- **Health:** `GET /health`.
- **Cache / HSTS:** zob. `WYCZYSC_CACHE_I_HSTS.md`.
