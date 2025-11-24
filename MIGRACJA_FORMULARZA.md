# 🔧 Instrukcja utworzenia migracji dla zaktualizowanego formularza

## Problem:
Kolumny z nowego formularza konsultacji (np. `scalpDiseases`) nie istnieją w bazie danych, ponieważ migracja nie została utworzona lub zastosowana.

## Rozwiązanie:

### 1. Zatrzymaj serwer backendu
Zatrzymaj serwer backendu (Ctrl+C w terminalu).

### 2. Utwórz nową migrację
```powershell
cd backend
npx prisma migrate dev --name update_consultation_form_fields
```

To utworzy nową migrację, która doda wszystkie brakujące pola do tabeli `Consultation`.

### 3. Uruchom ponownie serwer
```powershell
npm run dev
```

## Jeśli wystąpią błędy:

Jeśli migracja nie może być utworzona automatycznie, możesz spróbować:

1. **Sprawdź status migracji:**
```powershell
npx prisma migrate status
```

2. **Zresetuj bazę danych (UWAGA: To usunie wszystkie dane!):**
```powershell
npx prisma migrate reset
```

3. **Lub utwórz migrację ręcznie:**
```powershell
npx prisma migrate dev --create-only --name update_consultation_form_fields
```

A potem edytuj plik migracji ręcznie, aby dodać wszystkie brakujące kolumny.

