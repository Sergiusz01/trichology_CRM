# 🚀 Konfiguracja aplikacji - Krok po kroku

## ⚠️ WAŻNE: PostgreSQL musi być uruchomiony!

### Krok 1: Sprawdź/Instaluj PostgreSQL

**Opcja A: Jeśli masz już PostgreSQL**
- Upewnij się, że serwis PostgreSQL działa
- Sprawdź hasło użytkownika `postgres`

**Opcja B: Jeśli nie masz PostgreSQL**

1. **Pobierz i zainstaluj:**
   - https://www.postgresql.org/download/windows/
   - Podczas instalacji zapamiętaj hasło dla użytkownika `postgres`

2. **Lub użyj Docker (jeśli masz Docker):**
   ```powershell
   docker run --name postgres-trichology -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres:14
   ```

### Krok 2: Utwórz bazę danych

**Opcja A: Przez psql (wiersz poleceń)**
```powershell
# Znajdź ścieżkę do psql (zwykle w: C:\Program Files\PostgreSQL\14\bin\)
# Lub dodaj PostgreSQL do PATH
psql -U postgres
# W psql wpisz:
CREATE DATABASE trichology_db;
\q
```

**Opcja B: Przez pgAdmin (GUI)**
1. Otwórz pgAdmin
2. Połącz się z serwerem (użyj hasła użytkownika postgres)
3. Kliknij prawym na "Databases" → "Create" → "Database"
4. Nazwa: `trichology_db`
5. Kliknij "Save"

**Opcja C: Przez PowerShell (jeśli psql jest w PATH)**
```powershell
$env:PGPASSWORD="postgres"; psql -U postgres -c "CREATE DATABASE trichology_db;"
```

### Krok 3: Skonfiguruj backend/.env

Plik `.env` został już utworzony w katalogu `backend/`.

**WAŻNE:** Edytuj plik `backend/.env` i zmień:
```
DATABASE_URL="postgresql://postgres:POSTGRES_HASLO@localhost:5432/trichology_db?schema=public"
```

Zastąp `POSTGRES_HASLO` swoim rzeczywistym hasłem PostgreSQL!

### Krok 4: Uruchom migracje bazy danych

```powershell
cd backend
npx prisma migrate dev --name init
```

To utworzy wszystkie tabele w bazie danych.

### Krok 5: Wygeneruj Prisma Client

```powershell
npx prisma generate
```

### Krok 6: Utwórz przykładowe dane (seed)

```powershell
npm run seed
```

To utworzy:
- Użytkownika admin: `admin@example.com` / `admin123`
- Użytkownika lekarza: `doctor@example.com` / `doctor123`
- Przykładowego pacjenta
- Przykładową konsultację
- Przykładowe wyniki badań
- Przykładowy plan opieki

### Krok 7: Uruchom aplikację

**Opcja A: Oba serwery jednocześnie (z głównego katalogu)**
```powershell
cd ..
npm run dev
```

**Opcja B: Osobno (2 osobne terminale)**

**Terminal 1 - Backend:**
```powershell
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```powershell
cd frontend
npm run dev
```

### Krok 8: Otwórz aplikację w przeglądarce

1. Otwórz: **http://localhost:5173**
2. Zaloguj się:
   - **Email:** `admin@example.com`
   - **Hasło:** `admin123`

## ✅ Gotowe!

Możesz teraz:
- ✅ Przeglądać listę pacjentów
- ✅ Tworzyć nowe konsultacje z pełnym formularzem
- ✅ Dodawać wyniki badań laboratoryjnych
- ✅ Uploadować zdjęcia skóry głowy
- ✅ Tworzyć plany opieki
- ✅ Eksportować PDF

## 🔧 Rozwiązywanie problemów

### Błąd: "Cannot connect to database"
- Sprawdź czy PostgreSQL działa
- Sprawdź hasło w `DATABASE_URL` w `backend/.env`
- Sprawdź czy baza `trichology_db` istnieje

### Błąd: "Port 5432 already in use"
- PostgreSQL już działa - to dobrze!
- Sprawdź czy możesz się połączyć

### Błąd: "Port 3001 already in use" (backend)
- Zmień PORT w `backend/.env` na inny (np. 3002)
- Zaktualizuj `FRONTEND_URL` jeśli zmieniłeś port

### Błąd: "Port 5173 already in use" (frontend)
- Zmień port w `frontend/vite.config.ts`

### Błąd podczas migracji
- Upewnij się, że baza danych istnieje
- Sprawdź DATABASE_URL w `.env`
- Sprawdź uprawnienia użytkownika PostgreSQL

