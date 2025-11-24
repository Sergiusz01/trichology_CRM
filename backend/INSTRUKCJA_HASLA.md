# 🔐 Aktualizacja hasła PostgreSQL - WYMAGANE!

## ⚠️ Błąd: "Authentication failed"

Hasło w pliku `backend/.env` jest nieprawidłowe. Musisz je zaktualizować przed uruchomieniem migracji.

## Sposób 1: Użyj skryptu (Najłatwiejsze)

Z głównego katalogu projektu:
```powershell
cd ..
.\update-password.ps1
```

Skrypt poprosi Cię o hasło PostgreSQL i automatycznie zaktualizuje plik `.env`.

## Sposób 2: Edytuj ręcznie

1. Otwórz plik `backend/.env` w Notatniku lub innym edytorze
2. Znajdź linię:
   ```
   DATABASE_URL="postgresql://postgres:postgres@localhost:5432/trichology_db?schema=public"
   ```
3. Zmień `postgres:postgres` na `postgres:TWOJE_HASLO`
   - Przykład: Jeśli Twoje hasło to `mojehaslo123`:
   ```
   DATABASE_URL="postgresql://postgres:mojehaslo123@localhost:5432/trichology_db?schema=public"
   ```
4. **Zapisz plik**

## Sposób 3: Użyj PowerShell (jeśli znasz hasło)

```powershell
cd backend
$haslo = "TWOJE_HASLO"  # Zastąp TWOJE_HASLO swoim hasłem
$content = Get-Content .env -Raw
$content = $content -replace 'postgresql://postgres:[^@]+@', "postgresql://postgres:$haslo@"
$content | Set-Content .env -NoNewline
```

## ✅ Po aktualizacji hasła

Uruchom ponownie:
```powershell
npx prisma migrate dev --name init
```

## 🔍 Jak sprawdzić swoje hasło PostgreSQL?

- Jeśli używasz pgAdmin: hasło które podajesz przy logowaniu
- Jeśli używałeś instalatora: hasło które ustawiłeś podczas instalacji
- Jeśli nie pamiętasz: możesz zresetować hasło w pgAdmin lub przez psql

