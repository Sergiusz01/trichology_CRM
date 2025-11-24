# 🚀 START TUTAJ - Instrukcja uruchomienia aplikacji

## ✅ Co już zostało zrobione:

1. ✅ Zainstalowano zależności (backend i frontend)
2. ✅ Utworzono plik `backend/.env` z konfiguracją
3. ✅ Utworzono katalogi storage

## ⚠️ Co musisz zrobić TERAZ:

### KROK 1: Zainstaluj i uruchom PostgreSQL

**PostgreSQL nie działa na porcie 5432!**

**Opcja A: Instalacja PostgreSQL (Zalecane)**
1. Pobierz z: https://www.postgresql.org/download/windows/
2. Zainstaluj (zapamiętaj hasło użytkownika `postgres`)
3. Uruchom pgAdmin lub użyj psql do utworzenia bazy danych

**Opcja B: Docker (jeśli masz Docker Desktop)**
```powershell
docker run --name postgres-trichology -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres:15
```

**Szczegółowe instrukcje:** Zobacz plik `INSTALACJA_POSTGRESQL.md`

### KROK 2: Utwórz bazę danych

**Przez pgAdmin (GUI):**
1. Otwórz pgAdmin
2. Połącz się z serwerem (użyj hasła użytkownika postgres)
3. Kliknij prawym na "Databases" → "Create" → "Database"
4. Nazwa: `trichology_db`
5. Kliknij "Save"

**Przez psql (wiersz poleceń):**
```powershell
# Znajdź psql.exe (zwykle: C:\Program Files\PostgreSQL\15\bin\psql.exe)
& "C:\Program Files\PostgreSQL\15\bin\psql.exe" -U postgres
# W psql wpisz:
CREATE DATABASE trichology_db;
\q
```

**Przez Docker:**
```powershell
docker exec -it postgres-trichology psql -U postgres -c "CREATE DATABASE trichology_db;"
```

### KROK 3: Edytuj backend/.env

Otwórz plik `backend/.env` i zmień:
```
DATABASE_URL="postgresql://postgres:TWOJE_HASLO@localhost:5432/trichology_db?schema=public"
```

Zastąp `TWOJE_HASLO` swoim rzeczywistym hasłem PostgreSQL!

### KROK 4: Uruchom migracje bazy danych

```powershell
cd backend
npx prisma migrate dev --name init
```

To utworzy wszystkie tabele w bazie danych.

### KROK 5: Wygeneruj Prisma Client

```powershell
npx prisma generate
```

### KROK 6: Utwórz dane testowe

```powershell
npm run seed
```

To utworzy:
- Admin: `admin@example.com` / `admin123`
- Lekarz: `doctor@example.com` / `doctor123`
- Przykładowego pacjenta
- Przykładową konsultację

### KROK 7: Uruchom aplikację

**Z głównego katalogu projektu:**
```powershell
cd ..
npm run dev
```

To uruchomi jednocześnie backend (port 3001) i frontend (port 5173).

**Lub osobno (2 terminale):**

Terminal 1 - Backend:
```powershell
cd backend
npm run dev
```

Terminal 2 - Frontend:
```powershell
cd frontend
npm run dev
```

### KROK 8: Otwórz aplikację

1. Otwórz przeglądarkę: **http://localhost:5173**
2. Zaloguj się:
   - **Email:** `admin@example.com`
   - **Hasło:** `admin123`

## 🎯 Gotowe!

Możesz teraz:
- ✅ Przeglądać pacjentów
- ✅ Tworzyć konsultacje z pełnym formularzem
- ✅ Dodawać wyniki badań
- ✅ Uploadować zdjęcia skóry głowy
- ✅ Tworzyć plany opieki
- ✅ Eksportować PDF

## 🔧 Problemy?

### PostgreSQL nie działa
- Sprawdź czy serwis PostgreSQL jest uruchomiony
- Sprawdź czy port 5432 nie jest zajęty przez inną aplikację
- Zobacz `INSTALACJA_POSTGRESQL.md`

### Błąd połączenia z bazą danych
- Sprawdź hasło w `backend/.env`
- Sprawdź czy baza `trichology_db` istnieje
- Sprawdź czy PostgreSQL działa

### Port zajęty
- Backend: Zmień PORT w `backend/.env`
- Frontend: Zmień port w `frontend/vite.config.ts`

## 📚 Więcej informacji

- `KONFIGURACJA_KROK_PO_KROKU.md` - Szczegółowa konfiguracja
- `INSTALACJA_POSTGRESQL.md` - Instalacja PostgreSQL
- `QUICK_START.md` - Szybki start

