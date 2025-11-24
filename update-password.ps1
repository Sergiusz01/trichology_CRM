# Skrypt do aktualizacji hasla PostgreSQL w .env

Write-Host "Aktualizacja hasla PostgreSQL w backend\.env" -ForegroundColor Cyan
Write-Host ""

$envFile = "backend\.env"
if (-not (Test-Path $envFile)) {
    Write-Host "Blad: Plik $envFile nie istnieje!" -ForegroundColor Red
    exit 1
}

Write-Host "Podaj haslo PostgreSQL (zostanie ukryte podczas wpisywania):" -ForegroundColor Yellow
$haslo = Read-Host -AsSecureString
$hasloPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($haslo))

if ([string]::IsNullOrWhiteSpace($hasloPlain)) {
    Write-Host "Blad: Haslo nie moze byc puste!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Aktualizowanie pliku .env..." -ForegroundColor Cyan

$content = Get-Content $envFile -Raw
$oldPattern = 'postgresql://postgres:[^@]+@'
$newUrl = "postgresql://postgres:$hasloPlain@"
$content = $content -replace $oldPattern, $newUrl

$content | Set-Content $envFile -NoNewline

Write-Host "Haslo zaktualizowane!" -ForegroundColor Green
Write-Host ""
Write-Host "Nastepne kroki:" -ForegroundColor Cyan
Write-Host "1. Utworz baze danych: CREATE DATABASE trichology_db;" -ForegroundColor White
Write-Host "2. Uruchom: cd backend && npx prisma migrate dev --name init" -ForegroundColor White
Write-Host "3. Uruchom: npm run seed" -ForegroundColor White
Write-Host ""

