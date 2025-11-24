# 🎯 Następne kroki - Masz PostgreSQL!

## ✅ Status:
- ✅ PostgreSQL zainstalowany i działa
- ⚠️ Musisz zaktualizować hasło w `backend/.env`

## 🔐 KROK 1: Zaktualizuj hasło PostgreSQL

### Sposób 1: Użyj skryptu (Najłatwiejsze)

```powershell
.\update-password.ps1
```

Skrypt poprosi Cię o hasło PostgreSQL (będzie ukryte podczas wpisywania) i automatycznie zaktualizuje plik `.env`.

### Sposób 2: Edytuj ręcznie

1. Otwórz plik `backend/.env` w Notatniku lub innym edytorze
2. Znajdź linię:
   ```
   DATABASE_URL="postgresql://postgres:postgres@localhost:5432/trichology_db?schema=public"
   ```
3. Zmień `postgres:postgres` na `postgres:TWOJE_HASLO`
   - Przykład: Jeśli Twoje hasło to `mojehaslo123`, zmień na:
   ```
   DATABASE_URL="postgresql://postgres:mojehaslo123@localhost:5432/trichology_db?schema=public"
   ```
4. Zapisz plik

## 📋 KROK 2: Utwórz bazę danych

### Opcja A: Przez pgAdmin (Najłatwiejsze)

1. Otwórz **pgAdmin** (zainstalowany razem z PostgreSQL)
2. Połącz się z serwerem (użyj swojego hasła PostgreSQL)
3. Kliknij prawym na **"Databases"** → **"Create"** → **"Database..."**
4. W polu **"Database"** wpisz: `trichology_db`
5. Kliknij **"Save"**

### Opcja B: Przez psql

Znajdź psql.exe (zwykle: `C:\Program Files\PostgreSQL\15\bin\psql.exe` lub `C:\Program Files\PostgreSQL\16\bin\psql.exe`)

```powershell
# Z hasłem w zmiennej środowiskowej
$env:PGPASSWORD="TWOJE_HASLO"
& "C:\Program Files\PostgreSQL\15\bin\psql.exe" -U postgres -c "CREATE DATABASE trichology_db;"
```

Lub interaktywnie:
```powershell
& "C:\Program Files\PostgreSQL\15\bin\psql.exe" -U postgres
# W psql wpisz:
CREATE DATABASE trichology_db;
\q
```

## ✅ KROK 3: Uruchom migracje

```powershell
cd backend
npx prisma migrate dev --name init
```

To utworzy wszystkie tabele w bazie danych.

## ✅ KROK 4: Wygeneruj Prisma Client

```powershell
npx prisma generate
```

## ✅ KROK 5: Utwórz dane testowe

```powershell
npm run seed
```

To utworzy:
- **Admin:** `admin@example.com` / `admin123`
- **Lekarz:** `doctor@example.com` / `doctor123`
- **Asystent:** `assistant@example.com` / `assistant123`
- Przykładowego pacjenta
- Przykładową konsultację
- Przykładowe wyniki badań
- Przykładowy plan opieki

## ✅ KROK 6: Uruchom aplikację

```powershell
cd ..
npm run dev
```

To uruchomi:
- **Backend** na porcie **3001**
- **Frontend** na porcie **5173**

## 🌐 KROK 7: Otwórz aplikację

1. Otwórz przeglądarkę: **http://localhost:5173**
2. Zaloguj się:
   - **Email:** `admin@example.com`
   - **Hasło:** `admin123`

## 🎉 Gotowe!

Możesz teraz:
- ✅ Przeglądać pacjentów
- ✅ Tworzyć konsultacje z pełnym formularzem
- ✅ Dodawać wyniki badań laboratoryjnych
- ✅ Uploadować zdjęcia skóry głowy
- ✅ Tworzyć plany opieki
- ✅ Eksportować PDF

## 🔍 Sprawdzenie bazy danych

Aby zobaczyć dane w bazie:

```powershell
cd backend
npx prisma studio
```

To otworzy Prisma Studio - interfejs graficzny do przeglądania bazy danych.

## ❓ Problemy?

### Błąd: "Authentication failed"
- Sprawdź czy hasło w `backend/.env` jest poprawne
- Sprawdź czy używasz właściwego użytkownika (domyślnie `postgres`)

### Błąd: "Database does not exist"
- Upewnij się, że utworzyłeś bazę `trichology_db`
- Sprawdź czy nazwa bazy w `DATABASE_URL` jest poprawna

### Błąd podczas migracji
- Sprawdź czy baza danych istnieje
- Sprawdź czy masz uprawnienia do tworzenia tabel
- Sprawdź czy PostgreSQL działa: `Test-NetConnection -ComputerName localhost -Port 5432`

