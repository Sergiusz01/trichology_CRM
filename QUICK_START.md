# Szybki start - Konfiguracja i uruchomienie

## ✅ Krok 1: Sprawdź PostgreSQL

Upewnij się, że masz zainstalowany i uruchomiony PostgreSQL.

**Sprawdź czy działa:**
```powershell
# W PowerShell
Test-NetConnection -ComputerName localhost -Port 5432
```

Jeśli nie masz PostgreSQL:
- Pobierz z: https://www.postgresql.org/download/windows/
- Lub użyj Docker: `docker run --name postgres -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres`

## ✅ Krok 2: Utwórz bazę danych

**Opcja A: Przez psql**
```powershell
psql -U postgres
# W psql:
CREATE DATABASE trichology_db;
\q
```

**Opcja B: Przez pgAdmin**
1. Otwórz pgAdmin
2. Utwórz bazę danych o nazwie `trichology_db`

## ✅ Krok 3: Skonfiguruj backend/.env

Otwórz plik `backend/.env` i ustaw DATABASE_URL:

```
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/trichology_db?schema=public"
```

**Zmień `postgres:postgres` na swoje dane dostępowe!**

## ✅ Krok 4: Uruchom migracje

```powershell
cd backend
npx prisma migrate dev --name init
```

## ✅ Krok 5: Utwórz przykładowe dane

```powershell
cd backend
npm run seed
```

## ✅ Krok 6: Utwórz katalogi na pliki

```powershell
cd backend
New-Item -ItemType Directory -Force -Path "storage\uploads"
New-Item -ItemType Directory -Force -Path "storage\pdfs"
```

## ✅ Krok 7: Uruchom aplikację

**Opcja A: Oba serwery jednocześnie**
```powershell
cd ..
npm run dev
```

**Opcja B: Osobno (2 terminale)**

Terminal 1:
```powershell
cd backend
npm run dev
```

Terminal 2:
```powershell
cd frontend
npm run dev
```

## ✅ Krok 8: Otwórz aplikację

1. Otwórz przeglądarkę: http://localhost:5173
2. Zaloguj się:
   - **Email:** `admin@example.com`
   - **Hasło:** `admin123`

## 🎯 Gotowe!

Możesz teraz:
- Przeglądać pacjentów
- Tworzyć konsultacje
- Dodawać wyniki badań
- Tworzyć plany opieki
- Eksportować PDF

## ⚠️ Rozwiązywanie problemów

### Błąd połączenia z bazą danych
- Sprawdź czy PostgreSQL działa
- Sprawdź DATABASE_URL w `.env`
- Sprawdź czy baza `trichology_db` istnieje

### Błąd portu zajętego
- Zmień PORT w `backend/.env` (domyślnie 3001)
- Zmień port w `frontend/vite.config.ts` (domyślnie 5173)

### Błąd "Cannot find module"
- Uruchom `npm install` w odpowiednim katalogu

