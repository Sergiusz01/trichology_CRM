# 🛠️ Skrypty wdrożenia i zarządzania

Ten katalog zawiera skrypty pomocnicze do zarządzania aplikacją na VPS.

## 📋 Dostępne skrypty

### 1. `deploy.sh` - Szybkie wdrożenie

Automatyzuje proces aktualizacji i wdrożenia aplikacji.

**Użycie:**
```bash
cd /var/www/trichology
chmod +x deploy/deploy.sh
./deploy/deploy.sh
```

**Co robi:**
- Instaluje zależności (backend i frontend)
- Generuje Prisma Client
- Uruchamia migracje bazy danych
- Buduje aplikację
- Restartuje PM2 i Nginx

### 2. `status.sh` - Sprawdzanie statusu

Wyświetla kompleksowy status aplikacji i usług.

**Użycie:**
```bash
chmod +x deploy/status.sh
./deploy/status.sh
```

**Wyświetla:**
- Status PM2 (backend)
- Status Nginx
- Status PostgreSQL
- Ostatnie logi
- Użycie zasobów (dysk, pamięć)
- Porty w użyciu

### 3. `backup-full.sh` - Pełny backup

Tworzy backup bazy danych i plików aplikacji.

**Użycie:**
```bash
chmod +x deploy/backup-full.sh
./deploy/backup-full.sh
```

**Tworzy:**
- Backup bazy danych (skompresowany SQL)
- Backup plików aplikacji (bez node_modules)
- Backup plików konfiguracyjnych (.env)

**Lokalizacja backupów:** `/var/backups/trichology/`

**Automatyczne czyszczenie:** Usuwa backupy starsze niż 7 dni

### 4. `rollback.sh` - Cofanie zmian

Przywraca aplikację do poprzedniej wersji z backupu.

**Użycie:**
```bash
chmod +x deploy/rollback.sh

# Najpierw zobacz dostępne backupy
./deploy/rollback.sh

# Następnie przywróć konkretny backup
./deploy/rollback.sh 20241124-120000
```

**UWAGA:** Ta operacja nadpisze obecne pliki i bazę danych!

**Co robi:**
- Tworzy backup przed rollbackiem (na wszelki wypadek)
- Przywraca bazę danych
- Przywraca pliki aplikacji
- Przywraca pliki konfiguracyjne
- Przebudowuje i restartuje aplikację

## 🔧 Konfiguracja

Przed użyciem skryptów upewnij się, że:

1. **Projekt jest w `/var/www/trichology`**
   - Jeśli projekt jest w innym miejscu, edytuj zmienną `PROJECT_DIR` w skryptach

2. **Użytkownik bazy danych to `trichology_user`**
   - Jeśli używasz innego użytkownika, edytuj skrypty backupu/rollbacku

3. **Nazwa bazy danych to `trichology_db`**
   - Jeśli używasz innej nazwy, edytuj skrypty

4. **PM2 proces nazywa się `trichology-backend`**
   - Jeśli używasz innej nazwy, edytuj skrypty

## 📝 Przykładowy workflow

### Aktualizacja aplikacji:

```bash
# 1. Zrób backup przed zmianami
./deploy/backup-full.sh

# 2. Zaktualizuj kod (git pull lub scp)
cd /var/www/trichology
git pull
# lub
# scp -r . root@serwer:/var/www/trichology

# 3. Wdróż zmiany
./deploy/deploy.sh

# 4. Sprawdź status
./deploy/status.sh

# 5. Sprawdź logi
pm2 logs trichology-backend
```

### Naprawa błędów:

```bash
# 1. Sprawdź status
./deploy/status.sh

# 2. Sprawdź logi
pm2 logs trichology-backend --lines 100

# 3. Jeśli trzeba, zrób rollback
./deploy/rollback.sh 20241124-120000
```

## ⚠️ Ważne uwagi

1. **Zawsze rób backup przed większymi zmianami**
2. **Testuj skrypty na środowisku testowym przed użyciem na produkcji**
3. **Sprawdzaj logi po każdym wdrożeniu**
4. **Miej plan rollback przed wdrożeniem**

## 🆘 Rozwiązywanie problemów

### Skrypt nie działa - "Permission denied"

```bash
chmod +x deploy/*.sh
```

### Błąd "No such file or directory"

Upewnij się, że jesteś w katalogu `/var/www/trichology` lub edytuj `PROJECT_DIR` w skryptach.

### Błąd połączenia z bazą danych

Sprawdź:
- Czy PostgreSQL działa: `systemctl status postgresql`
- Czy użytkownik i hasło są poprawne w `.env`
- Czy baza danych istnieje: `psql -U trichology_user -l`

## 📚 Więcej informacji

Zobacz główny dokument: **[AKTUALIZACJA_VPS.md](../AKTUALIZACJA_VPS.md)**

