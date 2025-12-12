#!/bin/bash
# Skrypt pełnego backupu aplikacji (baza danych + pliki)
# Użycie: ./backup-full.sh

set -e

PROJECT_DIR="/var/www/trichology"
BACKUP_DIR="/var/backups/trichology"
DATE=$(date +%Y%m%d-%H%M%S)

# Kolorowe komunikaty
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

info() {
    echo -e "${GREEN}✓${NC} $1"
}

warn() {
    echo -e "${YELLOW}⚠${NC} $1"
}

error() {
    echo -e "${RED}✗${NC} $1"
}

echo -e "${BLUE}💾 Rozpoczynam pełny backup aplikacji...${NC}"
echo ""

# Utwórz katalog backupu jeśli nie istnieje
mkdir -p $BACKUP_DIR

# Backup bazy danych
info "Tworzę backup bazy danych..."
if pg_dump -U trichology_user trichology_db > $BACKUP_DIR/db_$DATE.sql 2>/dev/null; then
    info "Backup bazy danych utworzony: db_$DATE.sql"
    # Kompresuj
    gzip $BACKUP_DIR/db_$DATE.sql
    info "Backup bazy danych skompresowany"
else
    error "Błąd podczas tworzenia backupu bazy danych!"
    exit 1
fi

# Backup plików (bez node_modules)
info "Tworzę backup plików aplikacji..."
cd $PROJECT_DIR/..
if tar -czf $BACKUP_DIR/files_$DATE.tar.gz \
    --exclude='node_modules' \
    --exclude='.git' \
    --exclude='dist' \
    --exclude='*.log' \
    trichology/ 2>/dev/null; then
    info "Backup plików utworzony: files_$DATE.tar.gz"
else
    error "Błąd podczas tworzenia backupu plików!"
    exit 1
fi

# Backup .env (ważne pliki konfiguracyjne)
info "Tworzę backup plików konfiguracyjnych..."
if [ -f "$PROJECT_DIR/backend/.env" ]; then
    cp $PROJECT_DIR/backend/.env $BACKUP_DIR/env_backend_$DATE
    info "Backup .env utworzony"
fi

if [ -f "$PROJECT_DIR/frontend/.env.production" ]; then
    cp $PROJECT_DIR/frontend/.env.production $BACKUP_DIR/env_frontend_$DATE
    info "Backup .env.production utworzony"
fi

# Podsumowanie
echo ""
echo -e "${BLUE}════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ Backup zakończony pomyślnie!${NC}"
echo -e "${BLUE}════════════════════════════════════════${NC}"
echo ""
echo "📁 Lokalizacja backupów: $BACKUP_DIR"
echo ""
echo "📦 Utworzone pliki:"
ls -lh $BACKUP_DIR | grep $DATE
echo ""

# Usuń stare backupy (starsze niż 7 dni)
info "Usuwam backupy starsze niż 7 dni..."
find $BACKUP_DIR -type f -mtime +7 -delete
info "Czyszczenie zakończone"

echo ""
echo "💡 Aby przywrócić backup:"
echo "   Baza danych: gunzip < $BACKUP_DIR/db_$DATE.sql.gz | psql -U trichology_user trichology_db"
echo "   Pliki: tar -xzf $BACKUP_DIR/files_$DATE.tar.gz -C /tmp/"

