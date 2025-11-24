# 🔧 Rozwiązywanie błędu logowania

## ✅ Co zostało sprawdzone:

1. ✅ **Seed został uruchomiony** - użytkownicy istnieją w bazie danych
2. ✅ **Dane logowania:**
   - Admin: `admin@example.com` / `admin123`
   - Lekarz: `doctor@example.com` / `doctor123`

## 🔍 Możliwe przyczyny błędu:

### 1. Backend nie działa

**Sprawdź:**
```powershell
Test-NetConnection -ComputerName localhost -Port 3001
```

**Rozwiązanie:**
- Uruchom backend: `cd backend && npm run dev`
- Sprawdź czy nie ma błędów w terminalu backendu

### 2. Nieprawidłowy URL API w frontendzie

Frontend domyślnie używa: `http://localhost:3001`

**Sprawdź:**
- Czy backend działa na porcie 3001
- Czy w `frontend/.env` (jeśli istnieje) jest ustawione `VITE_API_URL`

**Rozwiązanie:**
Utwórz plik `frontend/.env`:
```
VITE_API_URL=http://localhost:3001
```

### 3. Problem z CORS

**Sprawdź:**
- Czy w `backend/src/index.ts` jest ustawione `FRONTEND_URL`
- Czy frontend działa na porcie 5173

**Rozwiązanie:**
W `backend/.env` upewnij się, że:
```
FRONTEND_URL=http://localhost:5173
```

### 4. Problem z bazą danych

**Sprawdź:**
- Czy PostgreSQL działa
- Czy hasło w `backend/.env` jest poprawne
- Czy baza `trichology_db` istnieje

**Rozwiązanie:**
```powershell
cd backend
npx prisma studio
```
To otworzy Prisma Studio - sprawdź czy użytkownicy istnieją.

### 5. Problem z tokenami JWT

**Sprawdź:**
- Czy w `backend/.env` są ustawione:
  ```
  JWT_SECRET=...
  JWT_REFRESH_SECRET=...
  ```

**Rozwiązanie:**
Upewnij się, że te zmienne są w pliku `.env`.

## 🧪 Testowanie logowania:

### Test 1: Sprawdź czy backend odpowiada

```powershell
curl http://localhost:3001/api/auth/login -Method POST -ContentType "application/json" -Body '{"email":"admin@example.com","password":"admin123"}'
```

Lub w przeglądarce (DevTools → Network):
- Otwórz http://localhost:5173
- Spróbuj się zalogować
- Sprawdź zakładkę Network - zobacz jaki błąd zwraca backend

### Test 2: Sprawdź logi backendu

W terminalu gdzie działa backend zobacz:
- Czy przychodzą requesty do `/api/auth/login`
- Jakie błędy są wyświetlane

### Test 3: Sprawdź konsolę przeglądarki

W przeglądarce (F12 → Console):
- Zobacz czy są błędy JavaScript
- Sprawdź czy requesty są wysyłane

## 📋 Krok po kroku - Diagnostyka:

1. **Uruchom backend:**
   ```powershell
   cd backend
   npm run dev
   ```
   Sprawdź czy widzisz: `🚀 Server running on port 3001`

2. **Uruchom frontend (w innym terminalu):**
   ```powershell
   cd frontend
   npm run dev
   ```
   Sprawdź czy widzisz: `Local: http://localhost:5173`

3. **Otwórz przeglądarkę:**
   - http://localhost:5173
   - Otwórz DevTools (F12)
   - Przejdź do zakładki Network
   - Spróbuj się zalogować
   - Sprawdź request do `/api/auth/login` - jaki status i odpowiedź?

4. **Sprawdź odpowiedź backendu:**
   - W zakładce Network kliknij na request `/api/auth/login`
   - Sprawdź Response - jaki błąd?

## 🎯 Najczęstsze błędy:

### "Network Error" / "Failed to fetch"
- Backend nie działa
- Backend działa na innym porcie
- Problem z CORS

### "401 Unauthorized"
- Nieprawidłowy email lub hasło
- Użytkownik nie istnieje w bazie

### "500 Internal Server Error"
- Problem z bazą danych
- Problem z konfiguracją backendu
- Sprawdź logi backendu

### "Cannot connect to database"
- PostgreSQL nie działa
- Nieprawidłowe hasło w `.env`
- Baza danych nie istnieje

## 💡 Szybkie rozwiązanie:

Jeśli nic nie pomaga, spróbuj:

1. **Zrestartuj wszystko:**
   ```powershell
   # Zatrzymaj backend i frontend (Ctrl+C)
   # Uruchom ponownie:
   npm run dev
   ```

2. **Wyczyść cache przeglądarki:**
   - Ctrl+Shift+Delete
   - Wyczyść cache i cookies

3. **Sprawdź czy seed działa:**
   ```powershell
   cd backend
   npm run seed
   ```

4. **Sprawdź użytkowników w bazie:**
   ```powershell
   cd backend
   npx prisma studio
   ```
   Otwórz http://localhost:5555 i sprawdź tabelę `User`

