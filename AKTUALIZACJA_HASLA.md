# 🔐 Aktualizacja hasła PostgreSQL w .env

## Krok 1: Sprawdź swoje hasło PostgreSQL

Jeśli nie pamiętasz hasła:
- Sprawdź w pgAdmin (jeśli używasz GUI)
- Lub użyj hasła które ustawiłeś podczas instalacji PostgreSQL

## Krok 2: Edytuj backend/.env

Otwórz plik `backend/.env` i znajdź linię:
```
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/trichology_db?schema=public"
```

Zmień `postgres:postgres` na `postgres:TWOJE_HASLO`

Przykład (jeśli Twoje hasło to `mojehaslo123`):
```
DATABASE_URL="postgresql://postgres:mojehaslo123@localhost:5432/trichology_db?schema=public"
```

## Krok 3: Zapisz plik

Zapisz plik `.env` i wróć do terminala.

## Alternatywa: Użyj PowerShell do aktualizacji

Jeśli znasz hasło, możesz użyć tego polecenia (zamień `TWOJE_HASLO` na rzeczywiste hasło):

```powershell
cd backend
$newPassword = "TWOJE_HASLO"
$content = Get-Content .env
$content = $content -replace 'postgresql://postgres:.*@localhost', "postgresql://postgres:$newPassword@localhost"
$content | Set-Content .env
```

