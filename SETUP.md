# Instrukcja szybkiego startu

## Krok po kroku

### 1. Przygotowanie bazy danych

```bash
# Zainstaluj PostgreSQL jeśli nie masz
# Utwórz bazę danych:
createdb trichology_db

# Lub przez psql:
psql -U postgres
CREATE DATABASE trichology_db;
\q
```

### 2. Konfiguracja backendu

```bash
cd backend

# Utwórz plik .env (skopiuj z .env.example jeśli istnieje)
# Wypełnij DATABASE_URL:
DATABASE_URL="postgresql://username:password@localhost:5432/trichology_db?schema=public"

# Wygeneruj losowe sekrety JWT (możesz użyć: openssl rand -base64 32)
JWT_SECRET="twoj-sekret-tutaj"
JWT_REFRESH_SECRET="twoj-refresh-sekret-tutaj"
```

### 3. Migracje i seed

```bash
cd backend

# Uruchom migracje
npx prisma migrate dev --name init

# Wygeneruj Prisma Client
npx prisma generate

# Uruchom seed (utworzy przykładowe dane)
npm run seed
```

### 4. Uruchomienie

**Opcja A: Oba serwery jednocześnie (z głównego katalogu)**
```bash
npm run dev
```

**Opcja B: Osobno**

Terminal 1 - Backend:
```bash
cd backend
npm run dev
```

Terminal 2 - Frontend:
```bash
cd frontend
npm run dev
```

### 5. Logowanie

Otwórz przeglądarkę: http://localhost:5173

Zaloguj się:
- Email: `admin@example.com`
- Hasło: `admin123`

## Rozwiązywanie problemów

### Błąd połączenia z bazą danych
- Sprawdź czy PostgreSQL działa: `pg_isready`
- Sprawdź DATABASE_URL w .env
- Sprawdź czy baza danych istnieje

### Błąd "Cannot find module"
- Uruchom `npm install` w odpowiednim katalogu (backend/frontend)

### Błąd portu zajętego
- Zmień PORT w backend/.env (domyślnie 3001)
- Zmień port w frontend/vite.config.ts (domyślnie 5173)

### Puppeteer nie działa (generowanie PDF)
- Zainstaluj zależności systemowe dla Puppeteer
- Na Ubuntu/Debian: `sudo apt-get install -y chromium-browser`
- Na macOS: Puppeteer powinien działać od razu
- Na Windows: Zainstaluj Chrome

## Następne kroki

1. Skonfiguruj SMTP w backend/.env jeśli chcesz używać emaili
2. Dodaj więcej użytkowników przez endpoint `/api/auth/register` (wymaga uprawnień admin)
3. Rozpocznij dodawanie pacjentów i konsultacji


