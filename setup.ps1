# Skrypt pomocniczy do konfiguracji aplikacji

Write-Host "Konfiguracja aplikacji trychologicznej" -ForegroundColor Green
Write-Host ""

# Sprawdz czy .env istnieje
if (-not (Test-Path "backend\.env")) {
    Write-Host "Tworzenie pliku backend\.env..." -ForegroundColor Yellow
    $envContent = @"
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/trichology_db?schema=public"
JWT_SECRET="dev-secret-key-change-in-production-12345"
JWT_REFRESH_SECRET="dev-refresh-secret-key-change-in-production-12345"
JWT_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
UPLOAD_DIR=./storage/uploads
MAX_FILE_SIZE=10485760
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
EMAIL_FROM=noreply@trichology-clinic.pl
PDF_OUTPUT_DIR=./storage/pdfs
"@
    $envContent | Out-File -FilePath "backend\.env" -Encoding utf8
    Write-Host "Utworzono backend\.env" -ForegroundColor Green
    Write-Host "WAZNE: Edytuj backend\.env i zmien haslo PostgreSQL w DATABASE_URL!" -ForegroundColor Yellow
} else {
    Write-Host "Plik backend\.env juz istnieje" -ForegroundColor Green
}

# Utworz katalogi storage
Write-Host ""
Write-Host "Tworzenie katalogow storage..." -ForegroundColor Cyan
New-Item -ItemType Directory -Force -Path "backend\storage\uploads" | Out-Null
New-Item -ItemType Directory -Force -Path "backend\storage\pdfs" | Out-Null
Write-Host "Katalogi utworzone" -ForegroundColor Green

# Sprawdz PostgreSQL
Write-Host ""
Write-Host "Sprawdzanie PostgreSQL..." -ForegroundColor Cyan
$pgTest = Test-NetConnection -ComputerName localhost -Port 5432 -InformationLevel Quiet -WarningAction SilentlyContinue
if ($pgTest) {
    Write-Host "PostgreSQL dziala na porcie 5432" -ForegroundColor Green
} else {
    Write-Host "PostgreSQL nie dziala na porcie 5432" -ForegroundColor Red
    Write-Host "Zobacz INSTALACJA_POSTGRESQL.md aby zainstalowac PostgreSQL" -ForegroundColor Yellow
}

# Nastepne kroki
Write-Host ""
Write-Host "Nastepne kroki:" -ForegroundColor Cyan
Write-Host "1. Upewnij sie, ze PostgreSQL dziala" -ForegroundColor White
Write-Host "2. Utworz baze danych: CREATE DATABASE trichology_db;" -ForegroundColor White
Write-Host "3. Edytuj backend\.env i zmien haslo w DATABASE_URL" -ForegroundColor White
Write-Host "4. Uruchom: cd backend" -ForegroundColor White
Write-Host "5. Uruchom: npx prisma migrate dev --name init" -ForegroundColor White
Write-Host "6. Uruchom: npm run seed" -ForegroundColor White
Write-Host "7. Uruchom aplikacje: npm run dev (z glownego katalogu)" -ForegroundColor White
Write-Host ""
