# 🔧 Naprawa błędu 500 przy zapisywaniu konsultacji

## Problem:
Błąd 500 (Internal Server Error) przy próbie zapisania konsultacji przez endpoint `POST /api/consultations`.

## Możliwe przyczyny:

1. **Nieprawidłowy format danych dla Prisma** - pola JSON mogą być niepoprawnie konwertowane
2. **Brakujące wymagane pola** - `patientId` lub `doctorId` może być nieprawidłowe
3. **Nieprawidłowe typy danych** - niektóre pola mogą mieć zły typ (np. tablica zamiast stringa)

## Co zostało naprawione:

### 1. Lepsze logowanie błędów
- Dodano szczegółowe logi błędów Prisma
- Logi pokazują, które pole powoduje problem
- Logi pokazują wartość, która została przekazana

### 2. Poprawiona konwersja danych
- Funkcja `prepareDataForDb` poprawnie konwertuje JSON stringi na tablice JavaScript
- Puste wartości są ustawiane na `null`
- Nieprawidłowe wartości są usuwane

### 3. Weryfikacja przed zapisem
- Sprawdzanie czy pacjent istnieje
- Sprawdzanie czy wszystkie wymagane pola są obecne

## Jak zdiagnozować problem:

1. **Sprawdź logi backendu** - zobaczysz dokładny komunikat błędu Prisma
2. **Sprawdź odpowiedź API** - błąd powinien zawierać szczegóły
3. **Sprawdź konsolę przeglądarki** - zobaczysz pełny komunikat błędu

## Następne kroki:

Jeśli błąd nadal występuje, sprawdź:
- Logi backendu - jaki jest dokładny komunikat błędu Prisma?
- Czy wszystkie pola w formularzu są wypełnione poprawnie?
- Czy pacjent istnieje w bazie danych?

