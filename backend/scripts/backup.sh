#!/bin/bash

# Skrypt do automatycznego backupu bazy danych
# Użyj z cron: 0 2 * * * /path/to/backup.sh

set -e

# Konfiguracja
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="${BACKUP_DIR:-./backups}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
DATABASE_URL="${DATABASE_URL}"

# Utwórz katalog backup jeśli nie istnieje
mkdir -p "$BACKUP_DIR"

# Backup PostgreSQL
echo "Tworzenie backupu bazy danych..."
pg_dump "$DATABASE_URL" > "$BACKUP_DIR/backup_$DATE.sql"

# Kompresja (opcjonalnie)
if command -v gzip &> /dev/null; then
    echo "Kompresowanie backupu..."
    gzip "$BACKUP_DIR/backup_$DATE.sql"
    BACKUP_FILE="$BACKUP_DIR/backup_$DATE.sql.gz"
else
    BACKUP_FILE="$BACKUP_DIR/backup_$DATE.sql"
fi

echo "Backup utworzony: $BACKUP_FILE"

# Usuń backupy starsze niż RETENTION_DAYS
echo "Usuwanie starych backupów (starszych niż $RETENTION_DAYS dni)..."
find "$BACKUP_DIR" -name "backup_*.sql*" -mtime +$RETENTION_DAYS -delete

# Opcjonalnie: Prześlij do S3/Backblaze
# if [ -n "$AWS_S3_BUCKET" ]; then
#     echo "Przesyłanie do S3..."
#     aws s3 cp "$BACKUP_FILE" "s3://$AWS_S3_BUCKET/backups/"
# fi

# Opcjonalnie: Prześlij do Backblaze B2
# if [ -n "$B2_BUCKET" ]; then
#     echo "Przesyłanie do Backblaze B2..."
#     b2 upload-file "$B2_BUCKET" "$BACKUP_FILE" "backups/backup_$DATE.sql.gz"
# fi

echo "Backup zakończony pomyślnie!"







