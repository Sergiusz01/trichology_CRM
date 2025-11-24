# Instrukcja konfiguracji i uruchomienia aplikacji

## Krok 1: Konfiguracja bazy danych PostgreSQL

### Sprawdź czy PostgreSQL jest zainstalowany i działa:

```powershell
# Sprawdź status PostgreSQL (jeśli masz go jako usługę)
Get-Service -Name postgresql*

# Lub sprawdź czy działa na porcie 5432
Test-NetConnection -ComputerName localhost -Port 5432
```

### Utwórz bazę danych:

**Opcja A: Przez psql (wiersz poleceń PostgreSQL)**
```powershell
# Połącz się z PostgreSQL (domyślnie użytkownik: postgres)
psql -U postgres

# W psql wykonaj:
CREATE DATABASE trichology_db;
\q
```

**Opcja B: Przez pgAdmin (GUI)**
1. Otwórz pgAdmin
2. Połącz się z serwerem PostgreSQL
3. Kliknij prawym przyciskiem na "Databases" → "Create" → "Database"
4. Nazwa: `trichology_db`
5. Kliknij "Save"

### Edytuj plik backend/.env

Otwórz plik `backend/.env` i ustaw prawidłowy DATABASE_URL:

```
DATABASE_URL="postgresql://UZYTKOWNIK:HASLO@localhost:5432/trichology_db?schema=public"
```

**Przykłady:**
- Jeśli użytkownik to `postgres` i hasło to `postgres`:
  ```
  DATABASE_URL="postgresql://postgres:postgres@localhost:5432/trichology_db?schema=public"
  ```

- Jeśli użytkownik to `admin` i hasło to `mojehaslo123`:
  ```
  DATABASE_URL="postgresql://admin:mojehaslo123@localhost:5432/trichology_db?schema=public"
  ```

## Krok 2: Uruchom migracje bazy danych

```powershell
cd backend
npx prisma migrate dev --name init
```

To utworzy wszystkie tabele w bazie danych.

## Krok 3: Uruchom seed (przykładowe dane)

```powershell
cd backend
npm run seed
```

To utworzy:
- Użytkownika admin: `admin@example.com` / `admin123`
- Użytkownika lekarza: `doctor@example.com` / `doctor123`
- Przykładowego pacjenta
- Przykładową konsultację
- Przykładowy wynik laboratoryjny
- Przykładowy plan opieki

## Krok 4: Utwórz katalogi na pliki

```powershell
cd backend
New-Item -ItemType Directory -Force -Path "storage\uploads"
New-Item -ItemType Directory -Force -Path "storage\pdfs"
```

## Krok 5: Uruchom aplikację

### Oba serwery jednocześnie (z głównego katalogu):

```powershell
cd ..
npm run dev
```

### Lub osobno:

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

## Krok 6: Otwórz aplikację w przeglądarce

1. Otwórz: http://localhost:5173
2. Zaloguj się:
   - Email: `admin@example.com`
   - Hasło: `admin123`

## Rozwiązywanie problemów

### Błąd: "Can't reach database server"

**Rozwiązanie:**
1. Sprawdź czy PostgreSQL działa:
   ```powershell
   Get-Service -Name postgresql*
   ```
2. Jeśli nie działa, uruchom usługę:
   ```powershell
   Start-Service -Name postgresql-x64-14  # (lub inna wersja)
   ```
3. Sprawdź czy port 5432 jest otwarty
4. Sprawdź DATABASE_URL w `.env`

### Błąd: "password authentication failed"

**Rozwiązanie:**
1. Sprawdź hasło w pliku `backend/.env`
2. Jeśli nie znasz hasła, możesz je zresetować w pgAdmin lub przez psql

### Błąd: "database does not exist"

**Rozwiązanie:**
1. Utwórz bazę danych (patrz Krok 1)
2. Sprawdź nazwę bazy w DATABASE_URL

### Błąd: "Prisma Client not generated"

**Rozwiązanie:**
```powershell
cd backend
npx prisma generate
```

### Błąd portu zajętego

**Rozwiązanie:**
- Backend domyślnie na porcie 3001 - zmień w `.env` jeśli zajęty
- Frontend domyślnie na porcie 5173 - zmień w `vite.config.ts` jeśli zajęty

## Testowanie funkcjonalności

Po zalogowaniu możesz:

1. **Zarządzanie pacjentami:**
   - Kliknij "Pacjenci" w menu
   - Zobaczysz przykładowego pacjenta "Jan Nowak"
   - Kliknij na pacjenta, aby zobaczyć szczegóły

2. **Tworzenie konsultacji:**
   - W szczegółach pacjenta kliknij "Nowa konsultacja"
   - Wypełnij formularz (wszystkie sekcje są dostępne w accordion)
   - Zapisz konsultację

3. **Eksport PDF:**
   - W widoku konsultacji kliknij "Pobierz PDF"
   - PDF będzie zawierał wszystkie wypełnione sekcje

4. **Wyniki laboratoryjne:**
   - W szczegółach pacjenta przejdź do zakładki "Wyniki badań"
   - Zobaczysz przykładowy wynik z automatycznym oznaczaniem LOW/NORMAL/HIGH

5. **Plany opieki:**
   - W szczegółach pacjenta przejdź do zakładki "Plany opieki"
   - Zobaczysz przykładowy 8-tygodniowy plan
   - Możesz pobrać PDF planu

## Następne kroki

- Dodaj więcej pacjentów
- Utwórz nowe konsultacje z pełnymi danymi
- Przetestuj upload zdjęć skóry głowy
- Skonfiguruj SMTP do wysyłki emaili (opcjonalnie)

