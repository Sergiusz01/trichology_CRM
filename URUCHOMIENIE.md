# 🚀 Uruchomienie aplikacji

## ✅ Status:
- ✅ `concurrently` zainstalowane
- ✅ Migracje istnieją

## ⚠️ Przed uruchomieniem upewnij się, że:

1. **Hasło PostgreSQL jest zaktualizowane w `backend/.env`**
2. **Baza danych `trichology_db` istnieje**
3. **Migracje są uruchomione** (wygląda na to, że tak ✅)
4. **Seed został uruchomiony** (opcjonalnie, ale zalecane)

## 🎯 Uruchomienie aplikacji

### Opcja 1: Oba serwery jednocześnie (Zalecane)

```powershell
npm run dev
```

To uruchomi:
- **Backend** na porcie **3001**
- **Frontend** na porcie **5173**

### Opcja 2: Osobno (2 terminale)

**Terminal 1 - Backend:**
```powershell
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```powershell
cd frontend
npm run dev
```

## 🌐 Otwórz aplikację

Po uruchomieniu:
1. Otwórz przeglądarkę: **http://localhost:5173**
2. Zaloguj się:
   - **Email:** `admin@example.com`
   - **Hasło:** `admin123`

## 🔍 Sprawdzenie

Jeśli backend nie uruchamia się:
- Sprawdź czy PostgreSQL działa: `Test-NetConnection -ComputerName localhost -Port 5432`
- Sprawdź czy hasło w `backend/.env` jest poprawne
- Sprawdź czy baza `trichology_db` istnieje

Jeśli frontend nie uruchamia się:
- Sprawdź czy port 5173 nie jest zajęty
- Sprawdź czy wszystkie zależności są zainstalowane: `cd frontend && npm install`

## 📋 Jeśli seed nie został uruchomiony

Uruchom seed aby utworzyć dane testowe:

```powershell
cd backend
npm run seed
```

To utworzy:
- Admin: `admin@example.com` / `admin123`
- Lekarz: `doctor@example.com` / `doctor123`
- Przykładowego pacjenta
- Przykładową konsultację

