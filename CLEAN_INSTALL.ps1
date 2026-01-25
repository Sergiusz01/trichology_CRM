Write-Host "Zamykanie wszystkich procesów Node.js (wymagane do odblokowania plików)..."
taskkill /F /IM node.exe
Start-Sleep -Seconds 2

Write-Host "Czyszczenie folderów node_modules..."
if (Test-Path "backend/node_modules") { Remove-Item -Path "backend/node_modules" -Recurse -Force }
if (Test-Path "backend/package-lock.json") { Remove-Item -Path "backend/package-lock.json" -Force }
if (Test-Path "frontend/node_modules") { Remove-Item -Path "frontend/node_modules" -Recurse -Force }
if (Test-Path "frontend/package-lock.json") { Remove-Item -Path "frontend/package-lock.json" -Force }

Write-Host "Instalacja zależności backendu..."
cd backend
npm install
cd ..

Write-Host "Instalacja zależności frontendu..."
cd frontend
npm install
cd ..

Write-Host "Cleanup and installation completed."
