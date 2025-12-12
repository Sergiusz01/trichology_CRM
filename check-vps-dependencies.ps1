# Skrypt sprawdzania i naprawy bibliotek na VPS
# Użycie: .\check-vps-dependencies.ps1

$VPS_IP = "54.37.138.254"
$VPS_USER = "ubuntu"
$VPS_PASSWORD = "Sbfserb1"
$PROJECT_DIR = "/var/www/trichology"

Write-Host "🔗 Łączenie z serwerem VPS..." -ForegroundColor Cyan

# Funkcja do wykonywania komend przez SSH
function Invoke-SSHCommand {
    param(
        [string]$Command
    )
    
    $securePassword = ConvertTo-SecureString $VPS_PASSWORD -AsPlainText -Force
    $credential = New-Object System.Management.Automation.PSCredential($VPS_USER, $securePassword)
    
    # Użyj plink (PuTTY) lub ssh z przekierowaniem
    # Alternatywnie użyj sshpass jeśli jest dostępne
    $sshCommand = "echo '$VPS_PASSWORD' | sshpass -p '$VPS_PASSWORD' ssh -o StrictHostKeyChecking=no $VPS_USER@$VPS_IP `"$Command`""
    
    # Jeśli sshpass nie jest dostępne, użyj innego podejścia
    try {
        $result = Invoke-Expression $sshCommand 2>&1
        return $result
    } catch {
        # Alternatywne podejście - użyj plink lub bezpośredniego ssh
        Write-Host "Próba alternatywnego połączenia..." -ForegroundColor Yellow
        return $null
    }
}

# Sprawdź czy sshpass jest dostępne (wymaga instalacji)
Write-Host "📋 Sprawdzanie połączenia z serwerem..." -ForegroundColor Cyan

# Użyj prostszego podejścia - stwórz skrypt bash i prześlij go na serwer
$bashScript = @"
#!/bin/bash
set -e

PROJECT_DIR="/var/www/trichology"
cd `$PROJECT_DIR

echo "🔍 Sprawdzanie bibliotek..."

# BACKEND
echo ""
echo "📦 BACKEND - Sprawdzanie bibliotek"
cd backend

if [ ! -f "package.json" ]; then
    echo "❌ Brak package.json w backend!"
    exit 1
fi

echo "✓ Znaleziono package.json"

# Sprawdź node_modules
if [ ! -d "node_modules" ]; then
    echo "⚠ Brak node_modules - instalowanie..."
    npm ci
    echo "✓ Zainstalowano node_modules"
else
    echo "✓ node_modules istnieje"
    # Sprawdź czy trzeba zaktualizować
    if npm ci --dry-run 2>&1 | grep -q "added\|removed\|updated"; then
        echo "⚠ Wykryto różnice - reinstaluję..."
        rm -rf node_modules
        npm ci
        echo "✓ Zaktualizowano zależności"
    fi
fi

# Sprawdź Prisma
if [ ! -d "node_modules/.prisma" ] && [ ! -d "node_modules/@prisma/client" ]; then
    echo "⚠ Prisma Client nie jest wygenerowany - generuję..."
    npx prisma generate
    echo "✓ Wygenerowano Prisma Client"
fi

# Sprawdź błędy
if npm list --depth=0 2>&1 | grep -q "UNMET\|ERR\|npm ERR"; then
    echo "⚠ Wykryto błędy - naprawiam..."
    rm -rf node_modules package-lock.json
    npm install
    npx prisma generate
    echo "✓ Naprawiono błędy"
fi

# FRONTEND
echo ""
echo "📦 FRONTEND - Sprawdzanie bibliotek"
cd ../frontend

if [ ! -f "package.json" ]; then
    echo "❌ Brak package.json w frontend!"
    exit 1
fi

echo "✓ Znaleziono package.json"

# Sprawdź node_modules
if [ ! -d "node_modules" ]; then
    echo "⚠ Brak node_modules - instalowanie..."
    npm ci
    echo "✓ Zainstalowano node_modules"
else
    echo "✓ node_modules istnieje"
    # Sprawdź czy trzeba zaktualizować
    if npm ci --dry-run 2>&1 | grep -q "added\|removed\|updated"; then
        echo "⚠ Wykryto różnice - reinstaluję..."
        rm -rf node_modules
        npm ci
        echo "✓ Zaktualizowano zależności"
    fi
fi

# Sprawdź błędy
if npm list --depth=0 2>&1 | grep -q "UNMET\|ERR\|npm ERR"; then
    echo "⚠ Wykryto błędy - naprawiam..."
    rm -rf node_modules package-lock.json
    npm install
    echo "✓ Naprawiono błędy"
fi

echo ""
echo "✅ Sprawdzanie zakończone!"
echo ""
echo "📊 Podsumowanie:"
echo "Backend node_modules: `$([ -d "backend/node_modules" ] && echo "✓" || echo "✗")"
echo "Frontend node_modules: `$([ -d "frontend/node_modules" ] && echo "✓" || echo "✗")"
"@

# Zapisz skrypt tymczasowy
$tempScript = "temp_check_script.sh"
$bashScript | Out-File -FilePath $tempScript -Encoding utf8

Write-Host "📤 Przesyłanie skryptu na serwer..." -ForegroundColor Cyan

# Prześlij skrypt na serwer używając scp
$securePassword = ConvertTo-SecureString $VPS_PASSWORD -AsPlainText -Force
$credential = New-Object System.Management.Automation.PSCredential($VPS_USER, $securePassword)

# Użyj plink lub ssh z przekierowaniem hasła
# Najpierw spróbuj użyć sshpass jeśli jest dostępne
$sshpassAvailable = Get-Command sshpass -ErrorAction SilentlyContinue

if ($sshpassAvailable) {
    Write-Host "Używam sshpass do połączenia..." -ForegroundColor Green
    $env:SSHPASS = $VPS_PASSWORD
    sshpass -e scp -o StrictHostKeyChecking=no $tempScript "${VPS_USER}@${VPS_IP}:/tmp/check_script.sh"
    sshpass -e ssh -o StrictHostKeyChecking=no "${VPS_USER}@${VPS_IP}" "chmod +x /tmp/check_script.sh && /tmp/check_script.sh"
} else {
    Write-Host "⚠ sshpass nie jest dostępne. Użyj ręcznego połączenia:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "1. Skopiuj skrypt na serwer:" -ForegroundColor Cyan
    Write-Host "   scp $tempScript ${VPS_USER}@${VPS_IP}:/tmp/check_script.sh" -ForegroundColor White
    Write-Host ""
    Write-Host "2. Połącz się z serwerem:" -ForegroundColor Cyan
    Write-Host "   ssh ${VPS_USER}@${VPS_IP}" -ForegroundColor White
    Write-Host ""
    Write-Host "3. Uruchom skrypt:" -ForegroundColor Cyan
    Write-Host "   chmod +x /tmp/check_script.sh && /tmp/check_script.sh" -ForegroundColor White
    Write-Host ""
    
    # Alternatywnie, użyj bezpośredniego ssh z interaktywnym hasłem
    Write-Host "Lub użyj poniższego polecenia (będziesz musiał wpisać hasło):" -ForegroundColor Yellow
    Write-Host "ssh ${VPS_USER}@${VPS_IP} 'bash -s' < $tempScript" -ForegroundColor White
}

# Usuń tymczasowy plik
Remove-Item $tempScript -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "✅ Gotowe!" -ForegroundColor Green

