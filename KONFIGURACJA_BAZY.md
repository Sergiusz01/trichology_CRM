# 🗄️ Konfiguracja bazy danych - Krok po kroku

## ✅ PostgreSQL działa!

PostgreSQL jest uruchomiony na porcie 5432.

## 🔐 Krok 1: Zaktualizuj hasło w backend/.env

**WAŻNE:** Musisz zaktualizować hasło PostgreSQL w pliku `backend/.env`.

### Opcja A: Edytuj ręcznie

1. Otwórz plik `backend/.env` w edytorze tekstu
2. Znajdź linię:
   ```
   DATABASE_URL="postgresql://postgres:postgres@localhost:5432/trichology_db?schema=public"
   ```
3. Zmień `postgres:postgres` na `postgres:TWOJE_HASLO`
   - Przykład: `postgresql://postgres:mojehaslo123@localhost:5432/trichology_db?schema=public`
4. Zapisz plik

### Opcja B: Użyj PowerShell (jeśli znasz hasło)

```powershell
cd backend
$haslo = Read-Host "Podaj haslo PostgreSQL" -AsSecureString
$hasloPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($haslo))
$content = Get-Content .env -Raw
$content = $content -replace 'postgresql://postgres:[^@]+@', "postgresql://postgres:$hasloPlain@"
$content | Set-Content .env -NoNewline
```

## 📋 Krok 2: Utwórz bazę danych

### Opcja A: Przez pgAdmin (GUI - Najłatwiejsze)

1. Otwórz **pgAdmin**
2. Połącz się z serwerem PostgreSQL (użyj hasła które ustawiłeś)
3. Kliknij prawym przyciskiem na **"Databases"**
4. Wybierz **"Create"** → **"Database..."**
5. W polu **"Database"** wpisz: `trichology_db`
6. Kliknij **"Save"**

### Opcja B: Przez psql (wiersz poleceń)

Znajdź psql.exe (zwykle w: `C:\Program Files\PostgreSQL\15\bin\psql.exe`)

```powershell
# Z hasłem w zmiennej środowiskowej
$env:PGPASSWORD="TWOJE_HASLO"
& "C:\Program Files\PostgreSQL\15\bin\psql.exe" -U postgres -c "CREATE DATABASE trichology_db;"

# Lub interaktywnie
& "C:\Program Files\PostgreSQL\15\bin\psql.exe" -U postgres
# W psql wpisz:
CREATE DATABASE trichology_db;
\q
```

### Opcja C: Przez Prisma (automatycznie)

Po zaktualizowaniu hasła w `.env`, Prisma może utworzyć bazę automatycznie podczas migracji.

## ✅ Krok 3: Uruchom migracje

Po zaktualizowaniu hasła i utworzeniu bazy danych:

```powershell
cd backend
npx prisma migrate dev --name init
```

To utworzy wszystkie tabele w bazie danych.

## ✅ Krok 4: Wygeneruj Prisma Client

```powershell
npx prisma generate
```

## ✅ Krok 5: Utwórz dane testowe

```powershell
npm run seed
```

To utworzy:
- Admin: `admin@example.com` / `admin123`
- Lekarz: `doctor@example.com` / `doctor123`
- Przykładowego pacjenta
- Przykładową konsultację

## ✅ Krok 6: Uruchom aplikację

```powershell
cd ..
npm run dev
```

Następnie otwórz: **http://localhost:5173**

## 🔍 Sprawdzenie

Aby sprawdzić czy wszystko działa:

```powershell
cd backend
npx prisma studio
```

To otworzy Prisma Studio - interfejs do przeglądania bazy danych.

