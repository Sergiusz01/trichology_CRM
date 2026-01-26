# Lista TODO – analiza CRM (trychologia)

**Uwaga:** Niniejszy dokument stanowi listę proponowanych zmian do zaakceptowania. Żadna zmiana nie została jeszcze wprowadzona w kodzie.

---

## 1. KRYTYCZNE – bezpieczeństwo i błędy

| # | Zadanie | Opis |
|---|---------|------|
| 1.1 | **Zabezpieczyć endpoint `/uploads`** | Obecnie `express.static` serwuje zdjęcia skóry głowy bez autoryzacji. Każdy z linkiem może zobaczyć dane medyczne. Należy dodać middleware `authenticate` i ewentualnie weryfikację, czy użytkownik ma dostęp do danego pacjenta (np. przez route `/api/scalp-photos/:id/file` zwracający plik). |
| 1.2 | **Usunąć domyślne dane logowania z UI** | Na stronie logowania wyświetlany jest tekst „Domyślne dane: admin@example.com / admin123”. W produkcji stanowi to ryzyko bezpieczeństwa. Usunąć lub pokazywać tylko w `NODE_ENV === 'development'`. |
| 1.3 | **Włączyć rate limiting na auth i API** | Middleware `authLimiter`, `apiLimiter`, `refreshLimiter` istnieją w `rateLimit.ts`, ale **nie są podłączone** w `index.ts`. Strony `/login`, `/register`, `/auth/refresh` oraz główne API powinny ich używać (np. `app.use('/api', apiLimiter)`, `authRoutes` z `authLimiter`). |
| 1.4 | **Naprawić obsługę błędów 401 w API** | Przy wygaśnięciu tokenu i nieudanym refresh używane jest `window.location.href = '/login'`, co powoduje pełne przeładowanie aplikacji. Preferowane: nawigacja przez React Router (`navigate('/login')`) i wyczyszczenie stanu (np. w AuthContext), aby uniknąć utraty kontekstu i dziwnego zachowania SPA. |

---

## 2. BACKEND – architektura i spójność

| # | Zadanie | Opis |
|---|---------|------|
| 2.1 | **Ujednolicić użycie Prisma Client** | W projekcie jest singleton w `prisma.ts`, ale `index.ts`, `auth.ts`, `middleware/auth.ts` oraz **wszystkie routery** (patients, visits, consultations, labResults, scalpPhotos, carePlans, email, emailTemplates, export, userProfile) tworzą `new PrismaClient()`. To może prowadzić do wyczerpania puli połączeń. Należy wszędzie importować `prisma` z `../prisma` (lub `./prisma`) i usunąć lokalne instancje. |
| 2.2 | **Poprawić formatowanie błędów Zod w errorHandler** | Dla `ZodError` zwracane jest `err.message`, które bywa mało czytelne. Lepiej użyć `err.flatten()` lub `err.format()` i zwracać do klienta np. `{ error: 'Błąd walidacji', details: ... }` z konkretnymi polami i komunikatami (np. „Imię jest wymagane”). |
| 2.3 | **Rozróżniać typy błędów Prisma w errorHandler** | `PrismaClientKnownRequestError` ma `code` (np. `P2002` – unique, `P2025` – not found). Wszystkie są teraz mapowane na 400. Dla „not found” odpowiedniejszy jest 404, dla konfliktów (np. duplikat email) – 409. |
| 2.4 | **Walidacja wizyt: data w przeszłości dla statusu Zaplanowana** | Wymaganie: dla statusu `ZAPLANOWANA` data wizyty nie może być w przeszłości. Obecnie brak tej walidacji w backendzie (route POST/PUT visits). Dodać ją po stronie API (Zod custom check lub osobna walidacja). |
| 2.5 | **Wizyty: sensowne przekazywanie danych przy PUT** | Frontend przy edycji wizyty wysyła w body także `patientId`. Backend go ignoruje (brak w `updateVisitSchema`), więc nie ma błędu, ale payload jest zbędny. Dla jasności i spójności API warto要么 nie wysyłać `patientId` w PUT, albo backend jawnie zwracać 400 przy próbie zmiany pacjenta. |

---

## 3. FRONTEND – obsługa błędów i UX

| # | Zadanie | Opis |
|---|---------|------|
| 3.1 | **Globalna obsługa błędów API (toasty)** | Część stron używa `setError` / `Alert`, inne tylko `console.error`. Nie ma jednego, spójnego sposobu informowania użytkownika o błędach (np. 4xx/5xx). Notistack (`SnackbarProvider`) jest w `main.tsx`, ale `ToastContext` nie jest używany. Należy: (a) wybrać jeden mechanizm (np. notistack), (b) dodać interceptora Axios, który przy błędach API (np. 4xx/5xx) wyświetla toast, chyba że dana strona sama obsługuje błąd (np. formularze). |
| 3.2 | **Błędy przy ładowaniu danych – feedback dla użytkownika** | W `PatientDetailPage` przy `fetchPatient` w `catch` jest tylko `console.error`. Użytkownik nie widzi komunikatu o niepowodzeniu. Analogicznie `PatientsPage`, `DashboardPage` itd. Dodać `setError` / toast i ewentualnie przycisk „Spróbuj ponownie”. |
| 3.3 | **Strona 404 (Not Found)** | Brak trasy `*` / catch-all. Przy wpisaniu nieistniejącego URL (np. `/nie-ma-takiej`) użytkownik może zobaczyć pustą stronę lub dziwne zachowanie. Dodać komponent „Strona nie znaleziona” i przekierowanie na `/` lub dedykowaną stronę 404. |
| 3.4 | **Ekran ładowania aplikacji (auth)** | W `App.tsx` przy `loading` (sprawdzanie auth) wyświetlane jest tylko „Ładowanie...” w zwykłym `div`. Brak layoutu (np. wyśrodkowany `CircularProgress`, tło). Dodać prosty, spójny ekran ładowania. |
| 3.5 | **Ujednolicić komunikaty sukcesu/błędów** | Część stron używa `Alert` (np. `PatientDetailPage`), inne `enqueueSnackbar` (np. `PatientFormPage`). Warto ujednolicić: np. sukces – toast, błędy formularzy – inline (Alert nad formularzem), błędy ładowania – toast + ewentualnie stan „błąd” na stronie. |

---

## 4. UI / UX – spójność i użyteczność

| # | Zadanie | Opis |
|---|---------|------|
| 4.1 | **Spójność wizualna (kolory, układ)** | `PatientDetailPage` i `DashboardPage` używają różnych palet (np. `#007AFF`, `#AF52DE`, `#f5f5f7`) i stylów kart. Theme MUI ma `primary` / `secondary`, ale wiele komponentów ma na sztywno kolory. Ujednolicić: bazować na `theme.palette` i ograniczyć hardkodowane hexe. |
| 4.2 | **Layout – aktywna pozycja w menu** | Dla „Panel główny” sprawdzane jest `location.pathname === '/'`, a trasa `/dashboard` też prowadzi do dashboardu. Upewnić się, że zarówno `/` jak i `/dashboard` poprawnie podświetlają „Panel główny” w menu. |
| 4.3 | **Layout – rola użytkownika** | Wyświetlane jest tylko „Lekarz” lub „Admin”. W schema jest też `ASSISTANT`. Dodać obsługę roli „Asystent” (lub inna etykieta) w UI. |
| 4.4 | **Nawigacja: link do „Wizyty” w menu** | Moduł wizyt jest w zakładce profilu pacjenta i na Dashboardzie, ale w głównym menu (Layout) nie ma bezpośredniego linku do „Wizyty” / „Zabiegi”. Rozważyć dodanie takiego linku (np. do widoku „Wszystkie nadchodzące wizyty”) lub pozostawić tylko w kontekście pacjenta – wtedy upewnić się, że nawigacja jest intuicyjna. |
| 4.5 | **Tabela wizyt – responsywność** | Na małych ekranach tabela z wieloma kolumnami (Data, Rodzaj zabiegu, Status, Seria, Cena, Notatki, Akcje) może być nieczytelna. Rozważyć: widok kartowy na mobile, przewijanie poziome z przypiętą pierwszą kolumną albo uproszczona lista. |
| 4.6 | **Breadcrumbs** | Brak breadcrumbs (np. Pacjenci > Jan Kowalski > Wizyty). W głębokich widokach (profil pacjenta → konsultacja, plan opieki itd.) trudniej się odnaleźć. Dodać prosty komponent breadcrumbs w Layout lub na stronach szczegółów. |
| 4.7 | **Potwierdzenia destrukcyjne (usuwanie)** | Dialogi „Czy na pewno chcesz usunąć?” są, ale warto upewnić się, że każde usunięcie (pacjent, wizyta, konsultacja, zdjęcie itd.) ma spójny, wyraźny komunikat i przyciski (Anuluj / Usuń). |

---

## 5. TECHNICZNE – zależności i konfiguracja

| # | Zadanie | Opis |
|---|---------|------|
| 5.1 | **Bootstrap vs MUI** | W `main.tsx` i `index.css` importowany jest Bootstrap. Aplikacja opiera się na MUI. Ryzyko konfliktów klas (np. `.btn`, `.card`) i niepotrzebny rozmiar bundle. Rozważyć usunięcie Bootstrap (i `react-bootstrap`), ewentualnie zostawić tylko wybrane style, jeśli coś z nich korzysta. |
| 5.2 | **ToastContext vs notistack** | `ToastContext` + `useToast` istnieją, ale nie są używane w `main.tsx`. Używany jest `SnackbarProvider` (notistack) i `useSnackbar`. ToastContext wygląda na martwy kod. Albo go usunąć, albo przestawić aplikację na `useToast` i wycofać notistack – jeden spójny mechanizm. |
| 5.3 | **Globalne przejścia CSS (`* { transition }`)** | W `index.css` jest `* { transition: ... }`. Może negatywnie wpływać na wydajność przy dużej liczbie elementów. Ogranić transition do konkretnych klas/komponentów (np. przyciski, karty). |
| 5.4 | **Duplikacja `visitStatusConfig`** | `visitStatusConfig` (statusy wizyt + kolory) jest zduplikowany w `PatientDetailPage` i `DashboardPage`. Wynieść do wspólnego modułu (np. `constants/visits` lub `utils/visitStatus`) i importować w obu miejscach. |

---

## 6. Dobre praktyki CRM i medyczne

| # | Zadanie | Opis |
|---|---------|------|
| 6.1 | **Audit log / kto co zmienił** | Istnieje `AuditLog` i `auditService`. Sprawdzić, czy kluczowe operacje (edycja pacjenta, konsultacji, wizyt, usunięcia) są logowane. Jeśli nie – dodać wywołania audit po takich akcjach. |
| 6.2 | **Dostęp do danych według roli** | `requireRole` jest w middleware. Warto zweryfikować, czy np. asystent nie może wykonać operacji zarezerwowanych dla lekarza/admina (np. usuwanie danych, eksport, szablony emaili). |
| 6.3 | **Walidacja po stronie frontendu (formularze)** | Część formularzy może nie walidować wymaganych pól przed wysłaniem. Wspomniana wcześniej analiza sugeruje React Hook Form + Zod. Rozważyć stopniowe dodawanie walidacji do kluczowych formularzy (pacjent, wizyta, konsultacja). |
| 6.4 | **Format daty/czasu** | Upewnić się, że wszędzie używana jest jedna konwencja (np. `date-fns` + `pl` locale) i że strefa czasowa jest jasno określona (np. lokalna użytkownika). Wizyty używają `datetime-local` i `formatDateTimeLocal` – to dobry kierunek; sprawdzić spójność w pozostałych miejscach. |

---

## 7. DODATKOWE (niski priorytet)

| # | Zadanie | Opis |
|---|---------|------|
| 7.1 | **Accessibility (a11y)** | Mało atrybutów `aria-*` i `role`. Dodać m.in. `aria-label` do przycisków ikon, `aria-live` tam, gdzie pojawiają się dynamiczne komunikaty, sensowne nagłówki i landmarki. |
| 7.2 | **Skeleton loaders** | Zamiast samego `CircularProgress` przy ładowaniu list/tabel rozważyć skeleton loaders (MUI `Skeleton`), żeby użytkownik widział szkielet layoutu. |
| 7.3 | **Optymalizacja bundle (code splitting)** | Strony ładowane są prawdopodobnie z jednego chunku. Rozważyć `React.lazy` + `Suspense` dla tras (np. `ConsultationFormPage`, `CarePlanFormPage`), aby zmniejszyć początkowy bundle. |
| 7.4 | **Paginacja / wirtualizacja długich list** | `PatientDetailPage` ładuje wszystkie wizyty, konsultacje, plany itd. Dla pacjentów z dużą historią lista może być długa. Rozważyć paginację lub wirtualizację (np. `react-window`) w zakładkach. |
| 7.5 | **`useEffect` i zależności** | `fetchPatient` w `PatientDetailPage` jest w `useEffect` zależnym od `[id, showArchived]`, ale wewnątrz wywołuje `fetchPatient`, który nie jest w deps. ESLint `exhaustive-deps` może zgłaszać ostrzeżenia. Poprawić deps lub opakować `fetchPatient` w `useCallback`. |

---

## Podsumowanie

- **Krytyczne:** 4 punkty (bezpieczeństwo, rate limiting, uploads, 401).
- **Backend:** 5 punktów (Prisma, Zod, errorHandler, walidacja wizyt).
- **Frontend – błędy i UX:** 5 punktów (toasty, 404, ładowanie, spójność komunikatów).
- **UI/UX:** 7 punktów (spójność, menu, role, wizyty, tabele, breadcrumbs, dialogi).
- **Techniczne:** 4 punkty (Bootstrap, ToastContext, CSS, DRY).
- **CRM / medyczne:** 4 punkty (audit, role, walidacja formularzy, daty).
- **Dodatkowe:** 5 punktów (a11y, skeletony, code splitting, paginacja, useEffect).

Łącznie **34 pozycje**. Rekomendacja: zacząć od sekcji 1 (krytyczne) i 2 (backend), potem 3 i 4, zgodnie z priorytetem biznesowym.

---

*Wygenerowano na podstawie analizy kodu. Przed wdrożeniem każdego punktu warto zweryfikować go w kontekście aktualnego stanu repozytorium.*
