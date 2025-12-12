#!/bin/bash
# Skrypt sprawdzania i naprawy bibliotek na backend i frontend
# Użycie: ./check-and-fix-dependencies.sh

set -e

PROJECT_DIR="/var/www/trichology"
cd $PROJECT_DIR

# Kolorowe komunikaty
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

info() {
    echo -e "${GREEN}✓${NC} $1"
}

warn() {
    echo -e "${YELLOW}⚠${NC} $1"
}

error() {
    echo -e "${RED}✗${NC} $1"
}

section() {
    echo -e "${BLUE}════════════════════════════════════════${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}════════════════════════════════════════${NC}"
    echo ""
}

# Sprawdź czy jesteśmy w odpowiednim katalogu
if [ ! -d "backend" ] || [ ! -d "frontend" ]; then
    error "Nie znaleziono katalogów backend/frontend. Upewnij się, że jesteś w katalogu projektu."
    exit 1
fi

section "🔍 Sprawdzanie i naprawa bibliotek"

# ============================================
# BACKEND
# ============================================
section "📦 BACKEND - Sprawdzanie bibliotek"

cd backend

# Sprawdź czy package.json istnieje
if [ ! -f "package.json" ]; then
    error "Brak pliku package.json w backend!"
    exit 1
fi

info "Znaleziono package.json"

# Sprawdź czy node_modules istnieje
if [ ! -d "node_modules" ]; then
    warn "Brak katalogu node_modules - instalowanie..."
    npm ci
    info "Zainstalowano node_modules"
else
    info "Katalog node_modules istnieje"
    
    # Sprawdź czy package-lock.json jest zgodny z package.json
    if [ -f "package-lock.json" ]; then
        info "Sprawdzam zgodność package-lock.json z package.json..."
        
        # Sprawdź czy są różnice (używając npm ci --dry-run)
        if npm ci --dry-run 2>&1 | grep -q "added\|removed\|updated"; then
            warn "Wykryto różnice w zależnościach - reinstaluję..."
            rm -rf node_modules
            npm ci
            info "Zainstalowano zaktualizowane zależności"
        else
            info "Zależności są zgodne"
        fi
    else
        warn "Brak package-lock.json - tworzenie..."
        npm install
        info "Utworzono package-lock.json"
    fi
fi

# Sprawdź czy wszystkie wymagane moduły są zainstalowane
info "Sprawdzam czy wszystkie moduły są zainstalowane..."
MISSING_MODULES=$(node -e "
const pkg = require('./package.json');
const fs = require('fs');
const missing = [];
const allDeps = {...pkg.dependencies, ...pkg.devDependencies};
for (const [name, version] of Object.entries(allDeps)) {
    try {
        require.resolve(name);
    } catch (e) {
        missing.push(name);
    }
}
if (missing.length > 0) {
    console.log(missing.join(' '));
} else {
    console.log('OK');
}
" 2>/dev/null || echo "ERROR")

if [ "$MISSING_MODULES" != "OK" ] && [ "$MISSING_MODULES" != "ERROR" ]; then
    warn "Brakujące moduły: $MISSING_MODULES"
    info "Instaluję brakujące moduły..."
    npm install $MISSING_MODULES
    info "Zainstalowano brakujące moduły"
elif [ "$MISSING_MODULES" == "ERROR" ]; then
    warn "Nie można sprawdzić modułów - próbuję reinstalacji..."
    rm -rf node_modules
    npm ci
    info "Zreinstalowano wszystkie moduły"
else
    info "Wszystkie moduły są zainstalowane"
fi

# Sprawdź Prisma Client
info "Sprawdzam Prisma Client..."
if [ ! -d "node_modules/.prisma" ] && [ ! -d "node_modules/@prisma/client" ]; then
    warn "Prisma Client nie jest wygenerowany - generuję..."
    npx prisma generate
    info "Wygenerowano Prisma Client"
else
    info "Prisma Client jest zainstalowany"
fi

# Sprawdź błędy w instalacji
info "Sprawdzam błędy w instalacji..."
if npm list --depth=0 2>&1 | grep -q "UNMET\|ERR\|npm ERR"; then
    warn "Wykryto błędy w instalacji - naprawiam..."
    rm -rf node_modules package-lock.json
    npm install
    npx prisma generate
    info "Naprawiono błędy instalacji"
else
    info "Brak błędów w instalacji"
fi

# ============================================
# FRONTEND
# ============================================
section "📦 FRONTEND - Sprawdzanie bibliotek"

cd ../frontend

# Sprawdź czy package.json istnieje
if [ ! -f "package.json" ]; then
    error "Brak pliku package.json w frontend!"
    exit 1
fi

info "Znaleziono package.json"

# Sprawdź czy node_modules istnieje
if [ ! -d "node_modules" ]; then
    warn "Brak katalogu node_modules - instalowanie..."
    npm ci
    info "Zainstalowano node_modules"
else
    info "Katalog node_modules istnieje"
    
    # Sprawdź czy package-lock.json jest zgodny z package.json
    if [ -f "package-lock.json" ]; then
        info "Sprawdzam zgodność package-lock.json z package.json..."
        
        # Sprawdź czy są różnice
        if npm ci --dry-run 2>&1 | grep -q "added\|removed\|updated"; then
            warn "Wykryto różnice w zależnościach - reinstaluję..."
            rm -rf node_modules
            npm ci
            info "Zainstalowano zaktualizowane zależności"
        else
            info "Zależności są zgodne"
        fi
    else
        warn "Brak package-lock.json - tworzenie..."
        npm install
        info "Utworzono package-lock.json"
    fi
fi

# Sprawdź czy wszystkie wymagane moduły są zainstalowane
info "Sprawdzam czy wszystkie moduły są zainstalowane..."
MISSING_MODULES_FRONTEND=$(node -e "
const pkg = require('./package.json');
const fs = require('fs');
const missing = [];
const allDeps = {...pkg.dependencies, ...pkg.devDependencies};
for (const [name, version] of Object.entries(allDeps)) {
    try {
        require.resolve(name);
    } catch (e) {
        missing.push(name);
    }
}
if (missing.length > 0) {
    console.log(missing.join(' '));
} else {
    console.log('OK');
}
" 2>/dev/null || echo "ERROR")

if [ "$MISSING_MODULES_FRONTEND" != "OK" ] && [ "$MISSING_MODULES_FRONTEND" != "ERROR" ]; then
    warn "Brakujące moduły: $MISSING_MODULES_FRONTEND"
    info "Instaluję brakujące moduły..."
    npm install $MISSING_MODULES_FRONTEND
    info "Zainstalowano brakujące moduły"
elif [ "$MISSING_MODULES_FRONTEND" == "ERROR" ]; then
    warn "Nie można sprawdzić modułów - próbuję reinstalacji..."
    rm -rf node_modules
    npm ci
    info "Zreinstalowano wszystkie moduły"
else
    info "Wszystkie moduły są zainstalowane"
fi

# Sprawdź błędy w instalacji
info "Sprawdzam błędy w instalacji..."
if npm list --depth=0 2>&1 | grep -q "UNMET\|ERR\|npm ERR"; then
    warn "Wykryto błędy w instalacji - naprawiam..."
    rm -rf node_modules package-lock.json
    npm install
    info "Naprawiono błędy instalacji"
else
    info "Brak błędów w instalacji"
fi

# ============================================
# PODSUMOWANIE
# ============================================
section "✅ Podsumowanie"

cd $PROJECT_DIR

echo -e "${GREEN}✓${NC} Backend:"
echo "  - node_modules: $([ -d "backend/node_modules" ] && echo "✓" || echo "✗")"
echo "  - package-lock.json: $([ -f "backend/package-lock.json" ] && echo "✓" || echo "✗")"
echo "  - Prisma Client: $([ -d "backend/node_modules/.prisma" ] || [ -d "backend/node_modules/@prisma/client" ] && echo "✓" || echo "✗")"
echo ""
echo -e "${GREEN}✓${NC} Frontend:"
echo "  - node_modules: $([ -d "frontend/node_modules" ] && echo "✓" || echo "✗")"
echo "  - package-lock.json: $([ -f "frontend/package-lock.json" ] && echo "✓" || echo "✗")"
echo ""

info "Sprawdzanie zakończone!"
echo ""
echo "📝 Następne kroki:"
echo "  1. Sprawdź logi: pm2 logs trichology-backend"
echo "  2. Zrestartuj backend: pm2 restart trichology-backend"
echo "  3. Zbuduj frontend: cd frontend && npm run build"
echo "  4. Przeładuj Nginx: systemctl reload nginx"

