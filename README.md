# System Zarządzania Konsultacjami Trychologicznymi

Aplikacja webowa do zarządzania kartami konsultacyjnymi, wynikami laboratoryjnymi, zdjęciami skóry głowy i planami opieki dla trychologów.

## 🚀 Funkcjonalności

### Zarządzanie pacjentami
- Lista pacjentów z wyszukiwaniem i paginacją
- Tworzenie, edycja i archiwizacja pacjentów
- Szczegółowy widok pacjenta z wszystkimi danymi

### Konsultacje
- Pełny formularz konsultacji oparty na "Karcie konsultacyjnej"
- Wszystkie sekcje: wypadanie włosów, przetłuszczanie, łuszczenie, wywiad, trichoskopia, diagnostyka, rozpoznanie, zalecenia
- Eksport do PDF
- Historia konsultacji dla każdego pacjenta

### Wyniki laboratoryjne
- Wprowadzanie wyników badań (morfologia, hormony, witaminy, tarczyca, itp.)
- Automatyczne oznaczanie wartości jako LOW/NORMAL/HIGH na podstawie zakresów referencyjnych
- Wizualizacja z kolorowym kodowaniem
- Historia wyników dla każdego pacjenta

### Zdjęcia skóry głowy
- Upload zdjęć (obsługa mobilna)
- Oznaczanie obszarów problemowych (prostokąty, koła, wielokąty)
- Galeria zdjęć z filtrowaniem po dacie/konsultacji
- Adnotacje z etykietami

### Plany opieki
- Tworzenie tygodniowych planów opieki
- Dla każdego tygodnia: rutyna mycia, produkty miejscowe, suplementacja, zabiegi w klinice
- Eksport planu do PDF dla pacjenta
- System przypomnień email

### Autentykacja i autoryzacja
- Logowanie z JWT (access + refresh tokens)
- Role: ADMIN, DOCTOR, ASSISTANT
- Zabezpieczone endpointy

## 🛠️ Technologie

### Backend
- Node.js + Express + TypeScript
- Prisma ORM + PostgreSQL
- JWT autentykacja
- Multer do uploadu plików
- Puppeteer do generowania PDF
- Nodemailer do wysyłki emaili

### Frontend
- React + TypeScript + Vite
- Material-UI (MUI)
- React Router
- Axios
- React Hook Form

## 📋 Wymagania

- Node.js 18+
- PostgreSQL 14+
- npm lub yarn

## 🔧 Instalacja

1. **Sklonuj repozytorium i zainstaluj zależności:**
```bash
npm install
cd backend && npm install
cd ../frontend && npm install
```

2. **Skonfiguruj bazę danych PostgreSQL:**
   - Utwórz bazę danych (np. `trichology_db`)
   - Zapamiętaj dane dostępowe

3. **Skonfiguruj backend:**
```bash
cd backend
# Skopiuj plik .env.example do .env (jeśli nie istnieje)
# Edytuj .env i uzupełnij:
# - DATABASE_URL (connection string do PostgreSQL)
# - JWT_SECRET i JWT_REFRESH_SECRET (losowe sekrety)
# - SMTP ustawienia (opcjonalnie, jeśli chcesz używać emaili)
```

4. **Uruchom migracje i seed:**
```bash
cd backend
npx prisma migrate dev --name init
npx prisma generate
npm run seed
```

5. **Skonfiguruj frontend (opcjonalnie):**
```bash
cd frontend
# Jeśli potrzebujesz zmienić URL API, edytuj .env
```

## ▶️ Uruchomienie

### Tryb deweloperski (oba serwery jednocześnie)
```bash
# Z głównego katalogu projektu
npm run dev
```

### Osobno

**Backend:**
```bash
cd backend
npm run dev
# Serwer działa na http://localhost:3001
```

**Frontend:**
```bash
cd frontend
npm run dev
# Aplikacja działa na http://localhost:5173
```

## 🔐 Domyślne konta (po seed)

- **Administrator:**
  - Email: `admin@example.com`
  - Hasło: `admin123`

- **Lekarz:**
  - Email: `doctor@example.com`
  - Hasło: `doctor123`

## 📁 Struktura projektu

```
.
├── backend/
│   ├── src/
│   │   ├── routes/          # Endpointy API
│   │   ├── middleware/      # Auth, error handling
│   │   ├── services/        # PDF, email, reminders
│   │   ├── utils/           # Helper functions
│   │   └── scripts/         # Seed script
│   ├── prisma/
│   │   └── schema.prisma    # Schema bazy danych
│   └── storage/             # Uploadowane pliki
├── frontend/
│   ├── src/
│   │   ├── pages/           # Strony aplikacji
│   │   ├── components/      # Komponenty UI
│   │   ├── contexts/        # React contexts
│   │   └── services/        # API client
│   └── public/
└── README.md
```

## 📡 API Endpoints

### Autentykacja
- `POST /api/auth/login` - Logowanie
- `POST /api/auth/register` - Rejestracja (tylko admin)
- `POST /api/auth/refresh` - Odświeżanie tokenu
- `GET /api/auth/me` - Aktualny użytkownik

### Pacjenci
- `GET /api/patients` - Lista pacjentów
- `POST /api/patients` - Nowy pacjent
- `GET /api/patients/:id` - Szczegóły pacjenta
- `PUT /api/patients/:id` - Edycja pacjenta
- `DELETE /api/patients/:id` - Archiwizacja

### Konsultacje
- `GET /api/consultations/patient/:patientId` - Lista konsultacji
- `POST /api/consultations` - Nowa konsultacja
- `GET /api/consultations/:id` - Szczegóły konsultacji
- `PUT /api/consultations/:id` - Edycja konsultacji
- `GET /api/consultations/:id/pdf` - PDF konsultacji

### Wyniki badań
- `GET /api/lab-results/patient/:patientId` - Lista wyników
- `GET /api/lab-results/:id` - Szczegóły (z `template` gdy `templateId`)
- `POST /api/lab-results` - Nowy wynik (`templateId` + `dynamicData` opcjonalnie)
- `PUT /api/lab-results/:id` - Edycja wyniku
- `GET /api/lab-results/:id/pdf` - PDF wyniku

### Szablony wyników badań
- `GET /api/lab-result-templates` - Lista (global + użytkownika)
- `GET /api/lab-result-templates/:id` - Pojedynczy szablon
- `POST /api/lab-result-templates` - Utwórz
- `PUT /api/lab-result-templates/:id` - Edytuj
- `DELETE /api/lab-result-templates/:id` - Usuń (soft)

### Zdjęcia skóry głowy
- `POST /api/scalp-photos/patient/:patientId` - Upload zdjęcia
- `GET /api/scalp-photos/patient/:patientId` - Lista zdjęć
- `POST /api/scalp-photos/:id/annotations` - Dodaj adnotację

### Plany opieki
- `GET /api/care-plans/patient/:patientId` - Lista planów
- `POST /api/care-plans` - Nowy plan
- `GET /api/care-plans/:id/pdf` - PDF planu

### Email
- `POST /api/email/consultation/:id` - Wyślij konsultację emailem
- `POST /api/email/care-plan/:id` - Wyślij plan emailem

### Diagnostyka
- `GET /health` - Health check (poza /api, bez rate limit). Używaj do monitoringu i diagnostyki.

## 📋 Szablony wyników badań
- **docs/SZABLONY_WYNIKOW_BADAN.md** – instrukcja (gdzie kliknąć, zarządzanie szablonami, formularz, stare wyniki).
- Menu: **Szablony wyników badań**; formularz wyniku: dropdown **Szablon wyników** (bez szablonu = formularz standardowy).

## 🚀 Wdrożenie na VPS (tylko IP)

- **DEPLOYMENT.md** – Nginx tylko HTTP, CORS (`FRONTEND_URLS`), rozwiązywanie problemów.
- **INSTRUKCJA_AKTUALIZACJI.md** – skrypt `git-deploy.ps1`, ręczna aktualizacja, health check, PM2.
- Aplikacja działa **wyłącznie pod adresem IP** (http://91.99.237.141). Brak domeny, brak SSL – **brak ostrzeżenia o certyfikacie**.

## 🔒 Bezpieczeństwo

- Wszystkie endpointy wymagają autentykacji (oprócz login)
- Hasła hashowane z bcrypt
- JWT tokens z refresh mechanism
- CORS skonfigurowany dla frontendu
- Walidacja danych z Zod
- Bezpieczne przechowywanie plików

## 📝 Uwagi

- Aplikacja jest w języku polskim (UI, komunikaty, PDF)
- Wymaga skonfigurowania SMTP do pełnej funkcjonalności email
- Puppeteer wymaga Chrome/Chromium do generowania PDF
- W środowisku produkcyjnym należy:
  - Zmienić wszystkie sekrety JWT
  - Skonfigurować HTTPS
  - Użyć profesjonalnego hostingu dla PostgreSQL
  - Skonfigurować backup bazy danych
  - Rozważyć użycie S3 do przechowywania plików

## 📄 Licencja

Projekt prywatny - do użytku wewnętrznego.

