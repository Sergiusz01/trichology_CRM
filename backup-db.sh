#!/bin/bash

# Skrypt do automatycznego backupu bazy danych
# Umieść w: ~/backup-db.sh
# Uruchom: chmod +x ~/backup-db.sh
# Dodaj do crona: crontab -e
# 0 2 * * * /home/ubuntu/backup-db.sh

# Kolory
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Konfiguracja
APP_DIR="$HOME/app"
BACKUP_DIR="$HOME/backups"
RETENTION_DAYS=7  # Usuń backupy starsze niż X dni

# Data
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="db_backup_${DATE}.sql.gz"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Backup Bazy Danych Trichology${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "Data: $(date '+%Y-%m-%d %H:%M:%S')\n"

# Sprawdź czy katalog backupów istnieje
if [ ! -d "$BACKUP_DIR" ]; then
    echo -e "${YELLOW}Tworzenie katalogu backupów: $BACKUP_DIR${NC}"
    mkdir -p "$BACKUP_DIR"
fi

# Przejdź do katalogu aplikacji
cd "$APP_DIR" || {
    echo -e "${RED}Błąd: Nie można przejść do katalogu $APP_DIR${NC}"
    exit 1
}

# Sprawdź czy kontenery działają
POSTGRES_STATUS=$(docker-compose -f docker-compose.prod.yml ps postgres | grep "Up")
if [ -z "$POSTGRES_STATUS" ]; then
    echo -e "${RED}Błąd: Kontener PostgreSQL nie działa!${NC}"
    exit 1
fi

# Wykonaj backup
echo -e "${YELLOW}Wykonywanie backupu...${NC}"
docker-compose -f docker-compose.prod.yml exec -T postgres \
    pg_dump -U trichology_user trichology_db | \
    gzip > "$BACKUP_DIR/$BACKUP_FILE"

# Sprawdź czy backup się udał
if [ $? -eq 0 ] && [ -f "$BACKUP_DIR/$BACKUP_FILE" ]; then
    BACKUP_SIZE=$(du -h "$BACKUP_DIR/$BACKUP_FILE" | cut -f1)
    echo -e "${GREEN}✓ Backup utworzony pomyślnie!${NC}"
    echo -e "  Plik: $BACKUP_FILE"
    echo -e "  Rozmiar: $BACKUP_SIZE"
    
    # Zapisz informację o backupie do logu
    echo "$(date '+%Y-%m-%d %H:%M:%S') - Backup: $BACKUP_FILE (${BACKUP_SIZE})" >> "$BACKUP_DIR/backup.log"
else
    echo -e "${RED}✗ Błąd podczas tworzenia backupu!${NC}"
    exit 1
fi

# Usuń stare backupy
echo -e "\n${YELLOW}Usuwanie backupów starszych niż $RETENTION_DAYS dni...${NC}"
DELETED=$(find "$BACKUP_DIR" -name "db_backup_*.sql.gz" -mtime +$RETENTION_DAYS -delete -print | wc -l)
if [ "$DELETED" -gt 0 ]; then
    echo -e "${GREEN}✓ Usunięto $DELETED starych backupów${NC}"
else
    echo -e "${GREEN}✓ Brak starych backupów do usunięcia${NC}"
fi

# Podsumowanie
echo -e "\n${GREEN}========================================${NC}"
TOTAL_BACKUPS=$(find "$BACKUP_DIR" -name "db_backup_*.sql.gz" | wc -l)
TOTAL_SIZE=$(du -sh "$BACKUP_DIR" | cut -f1)
echo -e "${GREEN}Liczba backupów: $TOTAL_BACKUPS${NC}"
echo -e "${GREEN}Całkowity rozmiar: $TOTAL_SIZE${NC}"
echo -e "${GREEN}========================================${NC}"

# Lista ostatnich backupów
echo -e "\n${YELLOW}Ostatnie 5 backupów:${NC}"
ls -lht "$BACKUP_DIR"/db_backup_*.sql.gz | head -5 | awk '{print $9, "(" $5 ")"}'

exit 0


