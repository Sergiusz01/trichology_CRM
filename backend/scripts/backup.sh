#!/bin/bash
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Trichology CRM – Automatyczny backup bazy danych + eksport pacjentów
#                   + upload na Google Drive
# Uruchamiany codziennie o 03:00 przez cron
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
set -euo pipefail

# ── Konfiguracja ──────────────────────────────────────────────────────
BACKUP_DIR="/root/backups"
EXPORT_DIR="/root/backups/exports"
BACKEND_DIR="/root/backend-src"
GDRIVE_REMOTE="gdrive"
GDRIVE_DB_FOLDER="trichology_backups"
GDRIVE_EXPORT_FOLDER="trichology_exports"
DATE=$(date +%Y-%m-%d_%H%M)
DB_NAME="trichology_db"
DB_FILENAME="${DB_NAME}_${DATE}.sql.gz"
LOCAL_RETENTION_DAYS=14
GDRIVE_RETENTION_DAYS=30
EXPORT_LOCAL_RETENTION_DAYS=3

# ── Tworzenie katalogów ──────────────────────────────────────────────
mkdir -p "${BACKUP_DIR}" "${EXPORT_DIR}"

# ══════════════════════════════════════════════════════════════════════
# CZĘŚĆ 1: Backup bazy danych (pg_dump)
# ══════════════════════════════════════════════════════════════════════
echo "[$(date)] ── CZĘŚĆ 1: Backup bazy danych ──"
echo "[$(date)] Rozpoczynam backup bazy ${DB_NAME}..."

su -c "pg_dump ${DB_NAME}" postgres | gzip > "${BACKUP_DIR}/${DB_FILENAME}"

# Weryfikacja
if [ ! -s "${BACKUP_DIR}/${DB_FILENAME}" ]; then
  echo "[$(date)] ERROR: Backup bazy pusty lub nieudany!" >&2
  rm -f "${BACKUP_DIR}/${DB_FILENAME}"
  exit 1
fi

FILE_SIZE=$(du -h "${BACKUP_DIR}/${DB_FILENAME}" | cut -f1)
echo "[$(date)] Backup DB OK: ${DB_FILENAME} (${FILE_SIZE})"

# Upload DB backup na Google Drive
if command -v rclone &>/dev/null; then
  echo "[$(date)] Wysyłam backup DB na Google Drive..."
  if rclone copy "${BACKUP_DIR}/${DB_FILENAME}" "${GDRIVE_REMOTE}:${GDRIVE_DB_FOLDER}/" --log-level INFO 2>&1; then
    echo "[$(date)] Google Drive upload DB OK"
  else
    echo "[$(date)] WARNING: Upload DB na Google Drive nie powiódł się!" >&2
  fi

  # Rotacja DB na Google Drive
  rclone delete "${GDRIVE_REMOTE}:${GDRIVE_DB_FOLDER}/" --min-age "${GDRIVE_RETENTION_DAYS}d" --log-level INFO 2>&1 || true
fi

# Rotacja lokalna DB
find "${BACKUP_DIR}" -maxdepth 1 -name "${DB_NAME}_*.sql.gz" -mtime +${LOCAL_RETENTION_DAYS} -delete

echo "[$(date)] Backup bazy zakończony ✅"

# ══════════════════════════════════════════════════════════════════════
# CZĘŚĆ 2: Eksport danych pacjentów do ZIP (PDF + zdjęcia)
# ══════════════════════════════════════════════════════════════════════
echo ""
echo "[$(date)] ── CZĘŚĆ 2: Eksport pacjentów (ZIP z PDF) ──"

if [ -d "${BACKEND_DIR}" ] && [ -f "${BACKEND_DIR}/package.json" ]; then
  cd "${BACKEND_DIR}"

  # Załaduj zmienne środowiskowe
  if [ -f .env ]; then
    set -a
    source .env
    set +a
  fi

  echo "[$(date)] Uruchamiam eksport pacjentów..."

  # Uruchom skrypt eksportu (ts-node lub skompilowany)
  EXPORT_OUTPUT=""
  if [ -f "dist/scripts/exportPatientsZip.js" ]; then
    EXPORT_OUTPUT=$(node dist/scripts/exportPatientsZip.js "${EXPORT_DIR}" 2>&1) || true
  elif command -v npx &>/dev/null; then
    EXPORT_OUTPUT=$(npx ts-node src/scripts/exportPatientsZip.ts "${EXPORT_DIR}" 2>&1) || true
  else
    echo "[$(date)] WARNING: Brak ts-node ani skompilowanego skryptu — pomijam eksport" >&2
  fi

  echo "${EXPORT_OUTPUT}"

  # Wyciągnij ścieżkę do ZIP z outputu
  ZIP_PATH=$(echo "${EXPORT_OUTPUT}" | grep "^ZIP_PATH=" | cut -d= -f2)

  if [ -n "${ZIP_PATH}" ] && [ -f "${ZIP_PATH}" ]; then
    ZIP_SIZE=$(du -h "${ZIP_PATH}" | cut -f1)
    echo "[$(date)] Eksport OK: $(basename ${ZIP_PATH}) (${ZIP_SIZE})"

    # Upload eksportu na Google Drive
    if command -v rclone &>/dev/null; then
      echo "[$(date)] Wysyłam eksport na Google Drive..."
      if rclone copy "${ZIP_PATH}" "${GDRIVE_REMOTE}:${GDRIVE_EXPORT_FOLDER}/" --log-level INFO 2>&1; then
        echo "[$(date)] Google Drive upload eksportu OK"
      else
        echo "[$(date)] WARNING: Upload eksportu na Google Drive nie powiódł się!" >&2
      fi

      # Rotacja eksportów na Google Drive (przechowuj ostatnie 7 dni)
      rclone delete "${GDRIVE_REMOTE}:${GDRIVE_EXPORT_FOLDER}/" --min-age "7d" --log-level INFO 2>&1 || true
    fi

    # Rotacja lokalna eksportów
    find "${EXPORT_DIR}" -name "eksport-pacjentow-*.zip" -mtime +${EXPORT_LOCAL_RETENTION_DAYS} -delete
    echo "[$(date)] Eksport pacjentów zakończony ✅"
  else
    echo "[$(date)] WARNING: Eksport pacjentów nie wygenerował pliku ZIP" >&2
  fi
else
  echo "[$(date)] WARNING: Nie znaleziono katalogu backendu (${BACKEND_DIR}) — pomijam eksport" >&2
fi

echo ""
echo "[$(date)] ══ Cały backup zakończony pomyślnie ══ ✅"
