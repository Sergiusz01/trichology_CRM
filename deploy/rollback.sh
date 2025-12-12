#!/bin/bash
# Skrypt cofania zmian (rollback) aplikacji
# Użycie: ./rollback.sh [backup-date]
# Przykład: ./rollback.sh 20241124-120000

set -e

PROJECT_DIR="/var/www/trichology"
BACKUP_DIR="/var/backups/trichology"

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

echo -e "${BLUE}⏪ Rozpoczynam rollback aplikacji...${NC}"
echo ""

# Sprawdź czy podano datę backupu
if [ -z "$1" ]; then
    echo "Dostępne backupy:"
    ls -lh $BACKUP_DIR | grep -E "db_|files_" | tail -10
    echo ""
    echo "Użycie: ./rollback.sh [backup-date]"
    echo "Przykład: ./rollback.sh 20241124-120000"
    exit 1
fi

BACKUP_DATE=$1

# Sprawdź czy backup istnieje
if [ ! -f "$BACKUP_DIR/db_$BACKUP_DATE.sql.gz" ]; then
    error "Nie znaleziono backupu bazy danych: db_$BACKUP_DATE.sql.gz"
    exit 1
fi

if [ ! -f "$BACKUP_DIR/files_$BACKUP_DATE.tar.gz" ]; then
    error "Nie znaleziono backupu plików: files_$BACKUP_DATE.tar.gz"
    exit 1
fi

# Potwierdzenie
warn "UWAGA: Ta operacja nadpisze obecne pliki i bazę danych!"
read -p "Czy na pewno chcesz kontynuować? (tak/nie): " confirm

if [ "$confirm" != "tak" ]; then
    info "Rollback anulowany"
    exit 0
fi

# Backup przed rollbackiem (na wszelki wypadek)
info "Tworzę backup przed rollbackiem..."
DATE_NOW=$(date +%Y%m%d-%H%M%S)
mkdir -p $BACKUP_DIR/pre-rollback
pg_dump -U trichology_user trichology_db > $BACKUP_DIR/pre-rollback/db_before_rollback_$DATE_NOW.sql 2>/dev/null || warn "Nie udało się utworzyć backupu przed rollbackiem"

# Przywróć bazę danych
info "Przywracam bazę danych..."
gunzip -c $BACKUP_DIR/db_$BACKUP_DATE.sql.gz | psql -U trichology_user trichology_db > /dev/null 2>&1
if [ $? -eq 0 ]; then
    info "Baza danych przywrócona"
else
    error "Błąd podczas przywracania bazy danych!"
    exit 1
fi

# Przywróć pliki
info "Przywracam pliki aplikacji..."
cd $PROJECT_DIR/..
tar -xzf $BACKUP_DIR/files_$BACKUP_DATE.tar.gz
info "Pliki przywrócone"

# Przywróć .env jeśli istnieje
if [ -f "$BACKUP_DIR/env_backend_$BACKUP_DATE" ]; then
    cp $BACKUP_DIR/env_backend_$BACKUP_DATE $PROJECT_DIR/backend/.env
    info "Plik .env przywrócony"
fi

if [ -f "$BACKUP_DIR/env_frontend_$BACKUP_DATE" ]; then
    cp $BACKUP_DIR/env_frontend_$BACKUP_DATE $PROJECT_DIR/frontend/.env.production
    info "Plik .env.production przywrócony"
fi

# Przebuduj i zrestartuj
info "Przebudowuję aplikację..."
cd $PROJECT_DIR/backend
npm ci
npx prisma generate
npm run build
pm2 restart trichology-backend

cd ../frontend
npm ci
npm run build
systemctl reload nginx

echo ""
echo -e "${GREEN}✅ Rollback zakończony pomyślnie!${NC}"
echo ""
echo "📊 Status aplikacji:"
pm2 status

