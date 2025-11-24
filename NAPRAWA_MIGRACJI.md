# 🔧 Naprawa migracji - dodanie brakujących kolumn

## Problem:
Kolumna `scalpDiseases` (i prawdopodobnie inne) nie istnieje w bazie danych, ponieważ migracja nie została utworzona po aktualizacji schematu.

## Rozwiązanie:

### Krok 1: Zatrzymaj serwer backendu
Zatrzymaj serwer backendu (Ctrl+C w terminalu gdzie działa `npm run dev`).

### Krok 2: Utwórz i zastosuj migrację
Otwórz nowy terminal i wykonaj:

```powershell
cd backend
npx prisma migrate dev --name update_consultation_form_fields
```

To polecenie:
- Porówna aktualny schemat Prisma z bazą danych
- Utworzy nową migrację z wszystkimi zmianami (dodanie kolumn, zmiana typów z TEXT na JSONB)
- Zastosuje migrację do bazy danych
- Wygeneruje Prisma Client

### Krok 3: Uruchom ponownie serwer
```powershell
npm run dev
```

### Krok 4: Przetestuj zapis konsultacji

## Jeśli wystąpią błędy podczas migracji:

### Błąd: "Cannot apply migration because schema drift detected"
To oznacza, że baza danych różni się od migracji. Możesz:

1. **Sprawdź różnice:**
```powershell
npx prisma migrate diff --from-schema-datamodel prisma/schema.prisma --to-schema-datasource prisma/schema.prisma --script
```

2. **Zresetuj bazę danych (UWAGA: To usunie wszystkie dane!):**
```powershell
npx prisma migrate reset
```

3. **Lub utwórz migrację ręcznie:**
```powershell
npx prisma migrate dev --create-only --name update_consultation_form_fields
```
A potem edytuj plik migracji ręcznie.

## Sprawdzenie czy migracja zadziałała:

Po zastosowaniu migracji, sprawdź czy kolumny istnieją:
```powershell
npx prisma studio
```

Otwórz tabelę `Consultation` i sprawdź czy wszystkie kolumny są obecne.

