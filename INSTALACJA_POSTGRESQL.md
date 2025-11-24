# 📦 Instalacja PostgreSQL - Instrukcja

## Opcja 1: Instalacja PostgreSQL (Zalecane)

### Windows - Instalator

1. **Pobierz PostgreSQL:**
   - Wejdź na: https://www.postgresql.org/download/windows/
   - Kliknij "Download the installer"
   - Wybierz najnowszą wersję (np. PostgreSQL 15 lub 16)

2. **Zainstaluj:**
   - Uruchom instalator
   - Podczas instalacji:
     - **Port:** 5432 (domyślny)
     - **Superuser password:** Wymyśl i zapamiętaj hasło (np. `postgres123`)
     - **Locale:** Polish, Poland (lub pozostaw domyślne)

3. **Po instalacji:**
   - Sprawdź czy serwis PostgreSQL działa:
     ```powershell
     Get-Service -Name "*postgresql*"
     ```
   - Jeśli nie działa, uruchom:
     ```powershell
     Start-Service postgresql-x64-15  # (nazwa może się różnić)
     ```

4. **Utwórz bazę danych:**
   - Otwórz **pgAdmin** (zainstalowany razem z PostgreSQL)
   - Lub użyj psql z wiersza poleceń:
     ```powershell
     # Znajdź psql.exe (zwykle: C:\Program Files\PostgreSQL\15\bin\psql.exe)
     # Lub dodaj do PATH
     & "C:\Program Files\PostgreSQL\15\bin\psql.exe" -U postgres
     # W psql:
     CREATE DATABASE trichology_db;
     \q
     ```

## Opcja 2: Docker (Jeśli masz Docker Desktop)

```powershell
docker run --name postgres-trichology -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres:15
```

Następnie utwórz bazę:
```powershell
docker exec -it postgres-trichology psql -U postgres -c "CREATE DATABASE trichology_db;"
```

## Opcja 3: PostgreSQL Portable (Bez instalacji)

Możesz użyć wersji portable PostgreSQL, jeśli nie chcesz instalować:
- https://www.postgresql.org/download/windows/
- Wybierz "PostgreSQL Binaries" (wymaga ręcznej konfiguracji)

## ✅ Po instalacji

1. **Edytuj `backend/.env`:**
   ```
   DATABASE_URL="postgresql://postgres:TWOJE_HASLO@localhost:5432/trichology_db?schema=public"
   ```

2. **Uruchom migracje:**
   ```powershell
   cd backend
   npx prisma migrate dev --name init
   ```

3. **Utwórz dane testowe:**
   ```powershell
   npm run seed
   ```

## 🔍 Sprawdzenie czy PostgreSQL działa

```powershell
# Test połączenia
Test-NetConnection -ComputerName localhost -Port 5432

# Lub sprawdź serwis
Get-Service -Name "*postgresql*"
```
