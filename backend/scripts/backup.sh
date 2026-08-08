#!/bin/bash
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Trichology CRM – Automatyczny backup bazy danych + upload na Google Drive
# Uruchamiany codziennie o 03:00 przez cron
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
set -euo pipefail

# ── Konfiguracja ──────────────────────────────────────────────────────
BACKUP_DIR="/root/backups"
GDRIVE_REMOTE="gdrive"
GDRIVE_FOLDER="trichology_backups"
DATE=$(date +%Y-%m-%d_%H%M)
DB_NAME="trichology_db"
FILENAME="${DB_NAME}_${DATE}.sql.gz"
LOCAL_RETENTION_DAYS=14
GDRIVE_RETENTION_DAYS=30

# ── Tworzenie katalogu ────────────────────────────────────────────────
mkdir -p "${BACKUP_DIR}"

# ── 1. Dump bazy danych + kompresja ──────────────────────────────────
echo "[$(date)] Rozpoczynam backup bazy ${DB_NAME}..."

su -c "pg_dump ${DB_NAME}" postgres | gzip > "${BACKUP_DIR}/${FILENAME}"

# Weryfikacja
if [ ! -s "${BACKUP_DIR}/${FILENAME}" ]; then
  echo "[$(date)] ERROR: Backup pusty lub nieudany!" >&2
  rm -f "${BACKUP_DIR}/${FILENAME}"
  exit 1
fi

FILE_SIZE=$(du -h "${BACKUP_DIR}/${FILENAME}" | cut -f1)
echo "[$(date)] Backup OK: ${FILENAME} (${FILE_SIZE})"

# ── 2. Upload na Google Drive ────────────────────────────────────────
echo "[$(date)] Wysyłam na Google Drive (${GDRIVE_REMOTE}:${GDRIVE_FOLDER})..."

if command -v rclone &>/dev/null; then
  if rclone copy "${BACKUP_DIR}/${FILENAME}" "${GDRIVE_REMOTE}:${GDRIVE_FOLDER}/" --log-level INFO 2>&1; then
    echo "[$(date)] Google Drive upload OK: ${FILENAME}"
  else
    echo "[$(date)] WARNING: Upload na Google Drive nie powiódł się!" >&2
    # Nie przerywaj – lokalny backup i tak jest zachowany
  fi

  # ── 3. Rotacja na Google Drive (usuń starsze niż N dni) ───────────
  echo "[$(date)] Rotacja Google Drive (usuwam starsze niż ${GDRIVE_RETENTION_DAYS} dni)..."
  rclone delete "${GDRIVE_REMOTE}:${GDRIVE_FOLDER}/" --min-age "${GDRIVE_RETENTION_DAYS}d" --log-level INFO 2>&1 || true
else
  echo "[$(date)] WARNING: rclone nie zainstalowany – pomijam upload na Google Drive" >&2
fi

# ── 4. Rotacja lokalna (usuń starsze niż N dni) ─────────────────────
echo "[$(date)] Rotacja lokalna (usuwam starsze niż ${LOCAL_RETENTION_DAYS} dni)..."
find "${BACKUP_DIR}" -name "${DB_NAME}_*.sql.gz" -mtime +${LOCAL_RETENTION_DAYS} -delete

echo "[$(date)] Backup zakończony pomyślnie ✅"
