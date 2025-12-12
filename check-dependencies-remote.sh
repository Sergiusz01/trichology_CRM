#!/bin/bash
set -e

PROJECT_DIR="/var/www/trichology"
cd $PROJECT_DIR

echo "🔍 Sprawdzanie bibliotek na VPS..."
echo ""

# BACKEND
echo "════════════════════════════════════════"
echo "📦 BACKEND - Sprawdzanie bibliotek"
echo "════════════════════════════════════════"
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
    echo "Sprawdzam zgodność zależności..."
    if npm ci --dry-run 2>&1 | grep -q "added\|removed\|updated"; then
        echo "⚠ Wykryto różnice - reinstaluję..."
        rm -rf node_modules
        npm ci
        echo "✓ Zaktualizowano zależności"
    else
        echo "✓ Zależności są zgodne"
    fi
fi

# Sprawdź Prisma
echo "Sprawdzam Prisma Client..."
if [ ! -d "node_modules/.prisma" ] && [ ! -d "node_modules/@prisma/client" ]; then
    echo "⚠ Prisma Client nie jest wygenerowany - generuję..."
    npx prisma generate
    echo "✓ Wygenerowano Prisma Client"
else
    echo "✓ Prisma Client jest zainstalowany"
fi

# Sprawdź błędy
echo "Sprawdzam błędy w instalacji..."
if npm list --depth=0 2>&1 | grep -q "UNMET\|ERR\|npm ERR"; then
    echo "⚠ Wykryto błędy - naprawiam..."
    rm -rf node_modules package-lock.json
    npm install
    npx prisma generate
    echo "✓ Naprawiono błędy"
else
    echo "✓ Brak błędów w instalacji"
fi

# FRONTEND
echo ""
echo "════════════════════════════════════════"
echo "📦 FRONTEND - Sprawdzanie bibliotek"
echo "════════════════════════════════════════"
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
    echo "Sprawdzam zgodność zależności..."
    if npm ci --dry-run 2>&1 | grep -q "added\|removed\|updated"; then
        echo "⚠ Wykryto różnice - reinstaluję..."
        rm -rf node_modules
        npm ci
        echo "✓ Zaktualizowano zależności"
    else
        echo "✓ Zależności są zgodne"
    fi
fi

# Sprawdź błędy
echo "Sprawdzam błędy w instalacji..."
if npm list --depth=0 2>&1 | grep -q "UNMET\|ERR\|npm ERR"; then
    echo "⚠ Wykryto błędy - naprawiam..."
    rm -rf node_modules package-lock.json
    npm install
    echo "✓ Naprawiono błędy"
else
    echo "✓ Brak błędów w instalacji"
fi

echo ""
echo "════════════════════════════════════════"
echo "✅ Podsumowanie"
echo "════════════════════════════════════════"
cd $PROJECT_DIR
echo ""
echo "Backend:"
echo "  - node_modules: $([ -d "backend/node_modules" ] && echo "✓" || echo "✗")"
echo "  - package-lock.json: $([ -f "backend/package-lock.json" ] && echo "✓" || echo "✗")"
echo "  - Prisma Client: $([ -d "backend/node_modules/.prisma" ] || [ -d "backend/node_modules/@prisma/client" ] && echo "✓" || echo "✗")"
echo ""
echo "Frontend:"
echo "  - node_modules: $([ -d "frontend/node_modules" ] && echo "✓" || echo "✗")"
echo "  - package-lock.json: $([ -f "frontend/package-lock.json" ] && echo "✓" || echo "✗")"
echo ""
echo "📝 Następne kroki:"
echo "  1. Sprawdź logi: pm2 logs trichology-backend"
echo "  2. Zrestartuj backend: pm2 restart trichology-backend"
echo "  3. Zbuduj frontend: cd frontend && npm run build"
echo "  4. Przeładuj Nginx: systemctl reload nginx"

