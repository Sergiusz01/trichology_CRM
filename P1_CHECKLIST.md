# P1 Checklist – Trichology CRM

## 1. Timezones & date handling (visits, consultations, reports)

| # | Zadanie | Pliki | Uwagi |
|---|---------|-------|-------|
| 1.1 | Usunąć hack „treat datetime-local as UTC” | `backend/src/routes/visits.ts` (POST, PUT), `frontend/src/pages/VisitFormPage.tsx` | Obecnie: parsowanie YYYY-MM-DDTHH:mm jako `Date.UTC(...)` i `getUTC*` przy wyświetlaniu. |
| 1.2 | Zdefiniować strefę UI: Europe/Warsaw | Nowy moduł `backend/src/utils/warsawTz.ts`, `frontend/src/utils/warsawTz.ts` (lub współdzielony) | Parsowanie „local Warsaw” → UTC, formatowanie UTC → Warsaw. Użyć `date-fns-tz` (lub `Intl`). |
| 1.3 | Zapisywać w DB wyłącznie UTC | Już tak jest (Prisma `DateTime`); upewnić się, że zapis z 1.2 jest w UTC | Brak zmian w schemacie. |
| 1.4 | Filtrowanie „today” / „upcoming” w strefie Warsaw | `backend/src/routes/visits.ts` (GET /upcoming), `backend/src/routes/dashboard.ts` (upcomingVisits, weekly revenue) | „Today” i „start/end of week” liczone w Europe/Warsaw. |
| 1.5 | Jednolity format dat w UI (Warsaw) | `frontend/src/utils/dateFormat.ts`, `DashboardPage` (formatVisitTime/Date), `PatientDetailPage` (wizyty), `VisitFormPage` | Wszystkie `getUTC*` zastąpić formatowaniem z Warsaw. |

**Podejście:**  
- Backend: `date-fns-tz` – `zonedTimeToUtc` przy zapisie wizyt, „today” / „start of week” w Warsaw.  
- Frontend: `date-fns-tz` – `utcToZonedTime` + `format` lub `Intl` z `timeZone: 'Europe/Warsaw'` przy wyświetlaniu; `formatDateTimeLocal` zwraca Warsaw.  
- API nadal zwraca ISO stringi (UTC).

---

## 2. UI consistency (Bootstrap → MUI)

| # | Zadanie | Pliki | Uwagi |
|---|---------|-------|-------|
| 2.1 | Usunąć import Bootstrap CSS | `frontend/src/main.tsx`, `frontend/src/index.css` | Usunąć `import 'bootstrap/...'` i `@import 'bootstrap/...'`. |
| 2.2 | Usunąć nadpisania `.btn`, `.card`, `.table` | `frontend/src/index.css` | Sekcje „Override Bootstrap…”. |
| 2.3 | Usunąć zależności | `frontend/package.json` | `bootstrap`, `react-bootstrap`. |
| 2.4 | Zweryfikować brak użycia react-bootstrap | `frontend/src` | Grep: brak komponentów RB; tylko MUI. |

**Podejście:**  
Aplikacja używa wyłącznie MUI. Bootstrap jest tylko w CSS i nadpisaniach. Usuwamy Bootstrap i dopasowujemy index.css (zachowując np. mobile fixy, font).

---

## 3. Consistent API contracts (typing)

| # | Zadanie | Pliki | Uwagi |
|---|---------|-------|-------|
| 3.1 | Wspólne typy dla API | `frontend/src/types/api.ts` (nowy) | Np. `Patient`, `Visit`, `Consultation`, `DashboardStats`, `UpcomingVisit`, `ApiError`. |
| 3.2 | Typowane odpowiedzi w frontendzie | `DashboardPage`, `PatientsPage`, `VisitFormPage`, `PatientDetailPage`, api hooks | Zastąpić `any` typami z `api.ts`. |
| 3.3 | Jednolity format błędów API | `backend` middleware + `errorHandler` | `{ code, message, details? }`, komunikaty po polsku. |
| 3.4 | Użycie błędów w UI | `frontend/src/services/api.ts` (formatErrorMessage) | Odczytywać `code`/`message`/`details`. |

**Podejście:**  
Dodać `frontend/src/types/api.ts`, stopniowo typować wywołania. Nie wdrażać pełnej walidacji zod po stronie frontu w P1 – ewentualnie lekki zod tylko tam, gdzie już używany.

---

## 4. Backend reliability

| # | Zadanie | Pliki | Uwagi |
|---|---------|-------|-------|
| 4.1 | Request-id middleware | `backend/src/middleware/requestId.ts`, `backend/src/index.ts` | Generowanie `X-Request-Id`, przekazanie do `req`, opcjonalnie `res` header. |
| 4.2 | Request-id w logach | `backend/src/utils/logger.ts` | Przyjmować `requestId`, dopisywać do każdego logu. |
| 4.3 | Request-id w odpowiedziach błędów | `backend/src/middleware/errorHandler.ts` | Zwracać `requestId` w JSON przy 4xx/5xx. |
| 4.4 | Błędy: stack tylko w dev | `errorHandler` | Produkcja: bez `stack`, tylko ogólne komunikaty (np. „Wystąpił nieoczekiwany błąd”). |
| 4.5 | Limity rozmiaru JSON / uploadów | `backend/src/index.ts` (express.json), multer (scalp, email) | `express.json({ limit: '1mb' })`, multer już ma limit; ewentualnie jeden wspólny config. |

**Podejście:**  
Prosty middleware `requestId` (uuid v4 lub `crypto.randomUUID`), logger rozszerzony o `requestId`, errorHandler ujednolicony i „production-safe”.

---

## 5. Performance / UX (małe usprawnienia)

| # | Zadanie | Pliki | Uwagi |
|---|---------|-------|-------|
| 5.1 | Ograniczyć zbędne refetch | `DashboardPage` (fetchDashboardData) | Już jest dedupe (`isFetchingRef`). Upewnić się, że brak podwójnego fetch przy mount. |
| 5.2 | Widget „Nadchodzące wizyty” – loading | `DashboardPage` | Gdy `loading`: skeleton tylko dla sekcji wizyt (np. listy placeholder), nie tylko full-page spinner. |
| 5.3 | Widget „Nadchodzące wizyty” – empty state | `DashboardPage` | Gdy 0 wizyt: zawsze pokazywać sekcję z komunikatem „Brak nadchodzących wizyt” (po polsku). |
| 5.4 | Łagodna obsługa błędów widgetu | `DashboardPage` | Przy błędzie dashboardu: np. „Nie udało się załadować wizyt” + retry, bez rozwalania całej strony. |

**Podejście:**  
Bez react-query w P1. Dopracować stan ładowania/błędów/pustych danych w istniejącym fetchu dashboardu.

---

## Kolejność implementacji

1. **P1.4** – request-id, errorHandler, limity (backend) – brak zależności od dat.
2. **P1.2** – usunięcie Bootstrapu – szybkie, niezależne.
3. **P1.1** – timezones i daty (backend + frontend).
4. **P1.5** – widget wizyt (skeleton, empty, error).
5. **P1.3** – typy API i spójne błędy – można robić równolegle z 1.4/1.5.

---

## Kryteria akceptacji (skrót)

- Daty wizyt poprawne w Europe/Warsaw, także przy DST.  
- Jedna, dominująca biblioteka UI (MUI); Bootstrap usunięty.  
- Główne endpointy używają wspólnych typów; błędy w formacie `code`/`message`/`details`.  
- Logi zawierają `request-id`; produkcja bez stacków w odpowiedzi.  
- `npm run dev` i `npm run build` dla frontendu i backendu przechodzą.

---

## Zaimplementowano (P1)

- **P1.4**: `requestId` middleware, `X-Request-Id` header, errorHandler z `code`/`message`/`details`/`requestId`, stack tylko w dev, `express.json`/`urlencoded` limit 1mb.
- **P1.2**: Usunięto Bootstrap CSS, `react-bootstrap` i `bootstrap` z `package.json`; nadpisania `.btn`/`.card`/`.table` usunięte z `index.css`.
- **P1.1**: `backend/src/utils/warsawTz.ts` (`parseWarsawToUtc`, `startOfTodayWarsaw`, `weekRangeWarsaw`); `visits` i `dashboard` używają Warsaw; frontend `dateFormat` (formatDate, formatDateTime, formatTime, formatDateShort, formatDateTimeLocal, formatDateInput) w Europe/Warsaw; `VisitFormPage` i `PatientDetailPage` zaktualizowane.
- **P1.5**: Sekcja „Nadchodzące wizyty” zawsze widoczna; empty state „Brak nadchodzących wizyt” + CTA „Dodaj wizytę” gdy 0 wizyt.
- **P1.3**: `frontend/src/types/api.ts` (ApiError, PatientBase, UpcomingVisit, DashboardStats, WeeklyRevenue, RecentActivity); `DashboardPage` używa tych typów.
