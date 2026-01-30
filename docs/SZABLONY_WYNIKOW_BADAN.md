# Szablony wyników badań – instrukcja

## Gdzie kliknąć

1. **Menu:** **Szablony wyników badań** (ikona Science, obok „Szablony konsultacji”).
2. **Nowy wynik:** **Pacjent → Wyniki badań → Dodaj wynik**. Na górze formularza: **Szablon wyników** (dropdown).

## Zarządzanie szablonami

- **Szablony wyników badań** – lista szablonów. **Nowy szablon** tworzy szablon, **Edytuj** go zmienia.
- W builderze: **Dodaj pole** – np. Cynk, Selen, Testosteron, DHEA-S. Dla każdego pola: **Etykieta**, **Klucz** (np. `zinc`, `selenium`), **Typ** (Liczba / Tekst / Wybór z listy), **Jednostka**, **Ref. dolna/górna**.
- **Klucze muszą być unikalne** w szablonie (tylko litery, cyfry, podkreślenia).
- **Ustaw jako domyślny** – ten szablon będzie proponowany przy nowych wynikach.

## Formularz wyniku

- **Bez szablonu** – formularz standardowy (morfologia, żelazo, witaminy, tarczyca, notatki).
- **Z szablonem** – formularz generowany z pól szablonu (wynik, jednostka, ref. dół/góra dla liczb). Notatki na dole.
- Zapis zapisuje **dynamicData** + **templateId**. Widok i PDF używają szablonu do wyświetlania.

## Stare wyniki

- Wyniki **bez** `templateId` (sprzed szablonów) działają jak dotąd. Widok używa stałych kolumn (morfologia, żelazo itd.).
- Nowe wyniki mogą używać szablonu albo formularza standardowego.

## Migracja

- Po wdrożeniu uruchom migrację Prisma: `npx prisma migrate deploy` (albo `prisma db push` w dev).
- Przy starcie backendu tworzony jest **domyślny szablon** „Domyślny (Morfologia, żelazo, witaminy, tarczyca)” – odpowiada dotychczasowemu formularzowi. Można go edytować i dodawać własne pola.
