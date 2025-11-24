# 📧 Konfiguracja Email - Instrukcja

## ✅ Sprawdzanie konfiguracji

### Krok 1: Sprawdź zmienne środowiskowe

W pliku `backend/.env` powinny być ustawione:

```env
SMTP_HOST=h70.seohost.pl
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=sergiusz@stonehenge.pl
SMTP_PASS=Sbfserb1!
EMAIL_FROM=sergiusz@stonehenge.pl
```

### Krok 2: Uruchom test połączenia

```powershell
cd backend
npm run test-email
```

To sprawdzi:
- ✅ Czy wszystkie zmienne są ustawione
- ✅ Czy połączenie z serwerem SMTP działa
- ✅ Czy konfiguracja jest poprawna

### Krok 3: Wyślij testowy email

```powershell
npm run test-email twoj-email@example.com
```

To wyśle testowy email na podany adres.

## 🔧 Konfiguracja SMTP_SECURE

Wartość `SMTP_SECURE` zależy od portu:

- **Port 465** (SSL/TLS): `SMTP_SECURE=true`
- **Port 587** (STARTTLS): `SMTP_SECURE=false` lub `SMTP_SECURE=tls`
- **Port 25** (bez szyfrowania): `SMTP_SECURE=false`

Dla Twojego serwera (port 587) użyj:
```
SMTP_SECURE=false
```

## 🌐 Testowanie przez API

### Test połączenia (GET)
```powershell
# Wymaga zalogowania - użyj tokena z /api/auth/login
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:3001/api/email/test-connection
```

### Test wysyłania emaila (POST)
```powershell
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"to":"test@example.com"}' \
  http://localhost:3001/api/email/test
```

## ⚠️ Problemy i rozwiązania

### Błąd: "Invalid login"
- Sprawdź czy `SMTP_USER` i `SMTP_PASS` są poprawne
- Sprawdź czy konto email nie wymaga "hasła aplikacji" (Gmail)

### Błąd: "Connection timeout"
- Sprawdź czy `SMTP_HOST` jest poprawny
- Sprawdź czy port nie jest zablokowany przez firewall
- Sprawdź czy serwer SMTP jest dostępny

### Błąd: "Certificate error"
- Dla portu 587 ustaw `SMTP_SECURE=false`
- Kod automatycznie użyje STARTTLS

### Błąd: "Authentication failed"
- Sprawdź dane logowania
- Dla Gmail: użyj "hasła aplikacji" zamiast zwykłego hasła
- Sprawdź czy konto nie jest zablokowane

## 📋 Sprawdzenie konfiguracji w kodzie

Kod automatycznie wykrywa:
- Port 465 → używa SSL/TLS (secure: true)
- Port 587 → używa STARTTLS (secure: false, requireTLS: true)
- Wartość "SSL/TLS" w SMTP_SECURE → traktowana jako true dla portu 465

## 🎯 Aktualna konfiguracja

Z pliku `.env`:
- ✅ Host: `h70.seohost.pl`
- ✅ Port: `587`
- ⚠️ Secure: `SSL/TLS` (powinno być `false` dla portu 587)
- ✅ User: `sergiusz@stonehenge.pl`
- ✅ From: `sergiusz@stonehenge.pl`

**Rekomendacja:** Zmień `SMTP_SECURE=SSL/TLS` na `SMTP_SECURE=false` w pliku `backend/.env`

