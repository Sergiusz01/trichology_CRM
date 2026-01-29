param (
    [Parameter(Mandatory = $true)]
    [string]$Message
)

$serverIp = "91.99.237.141"
$tempPath = "c:\temp"

Write-Host "--- Rozpoczynam automatyczne wdrozenie ---" -ForegroundColor Cyan

# 1. Git Commit
Write-Host ">>> Zatwierdzanie zmian w Git..." -ForegroundColor Yellow
git add .
git commit -m "$Message"

# 2. Wykrywanie co sie zmienilo
$changes = git diff --name-only HEAD~1 HEAD
$backendChanged = $false
$frontendChanged = $false
$prismaChanged = $false

foreach ($file in $changes) {
    if ($file -like "backend/*") { $backendChanged = $true }
    if ($file -like "frontend/*") { $frontendChanged = $true }
    if ($file -like "backend/prisma/schema.prisma") { $prismaChanged = $true }
}

# 3. Wdrozenie Backendu
if ($backendChanged) {
    Write-Host ">>> Wykryto zmiany w Backendzie. Wdrazam..." -ForegroundColor Magenta
    if (Test-Path "$tempPath\backend-deploy") { Remove-Item -Recurse -Force "$tempPath\backend-deploy" }
    robocopy backend "$tempPath\backend-deploy" /E /XD node_modules dist .git /NFL /NDL /NJH /NJS /nc /ns /np
    
    Compress-Archive -Path "$tempPath\backend-deploy\*" -DestinationPath "$tempPath\backend.zip" -Force
    scp "$tempPath\backend.zip" "root@${serverIp}:~/"
    
    $backendCmd = "unzip -o ~/backend.zip -d ~/backend-src && cd ~/backend-src && npm install && npm run build && pm2 restart trichology-backend"
    ssh "root@${serverIp}" $backendCmd
    Write-Host "OK: Backend zaktualizowany!" -ForegroundColor Green
}

# 4. Aktualizacja Bazy Danych
if ($prismaChanged) {
    Write-Host ">>> Wykryto zmiany w bazie danych. Aktualizuje..." -ForegroundColor Yellow
    ssh "root@${serverIp}" "cd ~/backend-src && npx prisma db push"
    Write-Host "OK: Baza danych zaktualizowana!" -ForegroundColor Green
}

# 5. Wdrozenie Frontendu
if ($frontendChanged) {
    Write-Host ">>> Wykryto zmiany w Frontendzie. Wdrazam..." -ForegroundColor Blue
    if (Test-Path "$tempPath\frontend-deploy") { Remove-Item -Recurse -Force "$tempPath\frontend-deploy" }
    robocopy frontend "$tempPath\frontend-deploy" /E /XD node_modules dist .git /NFL /NDL /NJH /NJS /nc /ns /np
    
    Compress-Archive -Path "$tempPath\frontend-deploy\*" -DestinationPath "$tempPath\frontend.zip" -Force
    scp "$tempPath\frontend.zip" "root@${serverIp}:~/"
    
    $frontendCmd = "unzip -o ~/frontend.zip -d ~/frontend-src && cd ~/frontend-src && npm install && npm run build && cp -r dist/* /var/www/trichology/"
    ssh "root@${serverIp}" $frontendCmd
    Write-Host "OK: Frontend zaktualizowany!" -ForegroundColor Green
}

if (-not $backendChanged -and -not $frontendChanged) {
    Write-Host "Info: Nie wykryto zmian w kodzie aplikacji. Tylko commit wykonany." -ForegroundColor Gray
}

Write-Host "--- Gotowe! Aplikacja: http://${serverIp} ---" -ForegroundColor Cyan
