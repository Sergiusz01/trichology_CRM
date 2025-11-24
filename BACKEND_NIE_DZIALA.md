# ⚠️ Backend nie działa - Rozwiązanie

## ✅ Co zostało sprawdzone:

1. ✅ **Użytkownicy istnieją w bazie:**
   - `admin@example.com` - hasło `admin123` ✅ POPRAWNE
   - `doctor@example.com` - hasło `doctor123` ✅ POPRAWNE

2. ❌ **Backend NIE działa na porcie 3001**

## 🚀 Rozwiązanie - Uruchom backend:

### Krok 1: Uruchom backend

W terminalu (w katalogu `backend`):
```powershell
npm run dev
```

Powinieneś zobaczyć:
```
🚀 Server running on port 3001
📝 Environment: development
```

### Krok 2: Sprawdź czy działa

W innym terminalu lub przeglądarce:
```powershell
# PowerShell
Test-NetConnection -ComputerName localhost -Port 3001

# Lub w przeglądarce:
http://localhost:3001/health
```

Powinieneś zobaczyć: `{"status":"ok","timestamp":"..."}`

### Krok 3: Uruchom frontend (jeśli jeszcze nie działa)

W osobnym terminalu:
```powershell
cd frontend
npm run dev
```

### Krok 4: Lub uruchom oba jednocześnie

Z głównego katalogu projektu:
```powershell
cd ..
npm run dev
```

To uruchomi backend i frontend jednocześnie.

## ✅ Po uruchomieniu:

1. **Backend:** http://localhost:3001
2. **Frontend:** http://localhost:5173
3. **Zaloguj się:**
   - Email: `admin@example.com`
   - Hasło: `admin123`

## 🔍 Jeśli backend się nie uruchamia:

### Błąd: "Cannot connect to database"
```powershell
# Sprawdź użytkowników:
cd backend
npm run check-users

# Jeśli błąd - sprawdź .env:
Get-Content .env | Select-String "DATABASE_URL"
```

### Błąd: "Port 3001 already in use"
- Zmień PORT w `backend/.env` na inny (np. 3002)
- Zaktualizuj `VITE_API_URL` w `frontend/.env` (jeśli istnieje)

### Błąd: "JWT_SECRET is not set"
Sprawdź czy w `backend/.env` są:
```
JWT_SECRET=dev-secret-key-change-in-production-12345
JWT_REFRESH_SECRET=dev-refresh-secret-key-change-in-production-12345
```

## 📋 Szybka diagnostyka:

```powershell
# 1. Sprawdź użytkowników
cd backend
npm run check-users

# 2. Sprawdź czy backend działa
Test-NetConnection -ComputerName localhost -Port 3001

# 3. Uruchom backend
npm run dev
```

## 🎯 Najważniejsze:

**Backend MUSI działać, żeby logowanie działało!**

Uruchom backend i spróbuj zalogować się ponownie.

