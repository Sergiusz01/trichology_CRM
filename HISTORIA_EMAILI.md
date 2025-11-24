# 📧 Historia wysłanych emaili

## ✅ Co zostało dodane:

### 1. Model bazy danych
- **EmailHistory** - przechowuje historię wszystkich wysłanych emaili
- Zapisuje: temat, treść, odbiorcę, załączniki, status (SENT/FAILED), datę wysłania

### 2. Automatyczne logowanie
- Wszystkie wysłane emaile są automatycznie zapisywane w historii
- Zapisuje się zarówno udane (SENT), jak i nieudane (FAILED) próby wysłania
- Dla nieudanych zapisuje się komunikat błędu

### 3. Interfejs przeglądania
- Strona historii emaili dla konkretnego pacjenta
- Strona globalnej historii wszystkich emaili
- Szczegóły każdego emaila (temat, treść, załączniki, status)

## 📍 Gdzie znajdziesz historię:

### Opcja 1: Historia dla konkretnego pacjenta
1. Otwórz szczegóły pacjenta (`/patients/:id`)
2. Kliknij przycisk **"Historia emaili"**
3. Zobaczysz wszystkie emaile wysłane do tego pacjenta

### Opcja 2: Globalna historia
1. W menu bocznym kliknij **"Historia emaili"**
2. Zobaczysz wszystkie wysłane emaile (wszystkich pacjentów)

## 📋 Co jest zapisywane:

Dla każdego wysłanego emaila:
- ✅ Data i godzina wysłania
- ✅ Adres email odbiorcy
- ✅ Temat wiadomości
- ✅ Pełna treść wiadomości
- ✅ Kto wysłał (nazwa użytkownika)
- ✅ Status (Wysłany / Błąd)
- ✅ Liczba załączników
- ✅ Nazwy załączników
- ✅ Powiązana konsultacja (jeśli dotyczy)
- ✅ Powiązany plan opieki (jeśli dotyczy)
- ✅ Komunikat błędu (jeśli wysyłka się nie powiodła)

## 🔍 Funkcje:

- **Filtrowanie:** Historia dla konkretnego pacjenta lub globalna
- **Paginacja:** 10, 25 lub 50 emaili na stronę
- **Szczegóły:** Kliknij ikonę oka, aby zobaczyć pełną treść emaila
- **Status:** Kolorowe oznaczenia (zielony = wysłany, czerwony = błąd)
- **Załączniki:** Lista wszystkich załączników dla każdego emaila

## 📊 Przykładowe użycie:

1. **Sprawdź co wysłałeś do pacjenta:**
   - Otwórz pacjenta → "Historia emaili"
   - Zobacz wszystkie wysłane emaile z datami

2. **Sprawdź czy email został wysłany:**
   - Status "Wysłany" = email dotarł
   - Status "Błąd" = sprawdź komunikat błędu

3. **Zobacz treść wysłanego emaila:**
   - Kliknij ikonę oka przy emailu
   - Zobacz pełną treść i załączniki

## ⚠️ Uwagi:

- Historia jest zapisywana automatycznie przy każdym wysłaniu
- Nie można edytować ani usuwać historii (archiwum)
- Historia jest powiązana z pacjentem - jeśli usuniesz pacjenta, historia też zostanie usunięta
- Błędy wysyłania są również zapisywane w historii

## 🎯 Gotowe do użycia!

Po uruchomieniu migracji (`npx prisma migrate dev`) historia będzie działać automatycznie dla wszystkich nowych emaili.

