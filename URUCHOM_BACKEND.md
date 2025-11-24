# ⚠️ Backend nie działa!

## Problem:
Backend nie odpowiada na porcie 3001, dlatego logowanie nie działa.

## Rozwiązanie:

### Krok 1: Uruchom backend

W terminalu:
```powershell
cd backend
npm run dev
```

Powinieneś zobaczyć:
```
🚀 Server running on port 3001
📝 Environment: development
```

### Krok 2: Sprawdź czy działa

W innym terminalu:
```powershell
Test-NetConnection -ComputerName localhost -Port 3001
```

Lub w przeglądarce:
- Otwórz: http://localhost:3001/health
- Powinieneś zobaczyć: `{"status":"ok","timestamp":"..."}`

### Krok 3: Uruchom frontend (jeśli jeszcze nie działa)

W osobnym terminalu:
```powershell
cd frontend
npm run dev
```

### Krok 4: Uruchom oba jednocześnie (Zalecane)

Z głównego katalogu:
```powershell
npm run dev
```

To uruchomi backend i frontend jednocześnie.

## ✅ Po uruchomieniu:

1. Backend: http://localhost:3001
2. Frontend: http://localhost:5173
3. Zaloguj się:
   - Email: `admin@example.com`
   - Hasło: `admin123`

## 🔍 Jeśli backend się nie uruchamia:

### Błąd: "Cannot connect to database"
- Sprawdź czy PostgreSQL działa
- Sprawdź hasło w `backend/.env`
- Sprawdź czy baza `trichology_db` istnieje

### Błąd: "Port 3001 already in use"
- Zmień PORT w `backend/.env` na inny (np. 3002)
- Zaktualizuj `VITE_API_URL` w frontendzie

### Błąd: "JWT_SECRET is not set"
- Sprawdź czy w `backend/.env` są ustawione:
  ```
  JWT_SECRET=...
  JWT_REFRESH_SECRET=...
  ```

