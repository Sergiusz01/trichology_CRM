#!/bin/bash
# Skrypt szybkiego wdrożenia aplikacji na VPS
# Użycie: ./deploy.sh

set -e  # Zatrzymaj przy pierwszym błędzie

echo "🚀 Rozpoczynam wdrożenie aplikacji..."

PROJECT_DIR="/var/www/trichology"
cd $PROJECT_DIR

# Kolorowe komunikaty
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Funkcja do wyświetlania komunikatów
info() {
    echo -e "${GREEN}✓${NC} $1"
}

warn() {
    echo -e "${YELLOW}⚠${NC} $1"
}

error() {
    echo -e "${RED}✗${NC} $1"
}

# Sprawdź czy jesteśmy w odpowiednim katalogu
if [ ! -d "backend" ] || [ ! -d "frontend" ]; then
    error "Nie znaleziono katalogów backend/frontend. Upewnij się, że jesteś w katalogu projektu."
    exit 1
fi

# BACKEND
info "Aktualizuję backend..."
cd backend

# Sprawdź czy .env istnieje
if [ ! -f ".env" ]; then
    warn "Plik .env nie istnieje! Tworzenie z .env.example..."
    if [ -f ".env.example" ]; then
        cp .env.example .env
        warn "Pamiętaj, aby skonfigurować plik .env!"
    else
        error "Brak pliku .env i .env.example!"
        exit 1
    fi
fi

# Instalacja zależności
info "Instaluję zależności backendu..."
npm ci

# Prisma
info "Generuję Prisma Client..."
npx prisma generate

info "Uruchamiam migracje bazy danych..."
npx prisma migrate deploy || warn "Migracje mogą wymagać uwagi"

# Budowanie
info "Buduję backend..."
npm run build

# Restart PM2
info "Restartuję backend w PM2..."
pm2 restart trichology-backend || pm2 start dist/index.js --name trichology-backend

# FRONTEND
info "Aktualizuję frontend..."
cd ../frontend

# Sprawdź .env.production
if [ ! -f ".env.production" ]; then
    warn "Plik .env.production nie istnieje!"
    if [ -f ".env.example" ]; then
        cp .env.example .env.production
        warn "Pamiętaj, aby skonfigurować .env.production!"
    fi
fi

# Instalacja zależności
info "Instaluję zależności frontendu..."
npm ci

# Budowanie
info "Buduję frontend..."
npm run build

# Sprawdź czy dist istnieje
if [ ! -d "dist" ]; then
    error "Błąd budowania frontendu - brak katalogu dist!"
    exit 1
fi

# NGINX
info "Przeładowuję Nginx..."
nginx -t && systemctl reload nginx || error "Błąd konfiguracji Nginx!"

# Status
echo ""
info "Wdrożenie zakończone!"
echo ""
echo "📊 Status aplikacji:"
pm2 status
echo ""
echo "🌐 Sprawdź aplikację w przeglądarce"
echo "📝 Logi: pm2 logs trichology-backend"

