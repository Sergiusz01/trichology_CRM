#!/bin/bash
# Skrypt sprawdzania statusu aplikacji na VPS
# Użycie: ./status.sh

PROJECT_DIR="/var/www/trichology"

# Kolorowe komunikaty
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}════════════════════════════════════════${NC}"
echo -e "${BLUE}   📊 Status aplikacji trychologicznej${NC}"
echo -e "${BLUE}════════════════════════════════════════${NC}"
echo ""

# PM2 Status
echo -e "${BLUE}🔵 PM2 (Backend):${NC}"
pm2 status
echo ""

# Nginx Status
echo -e "${BLUE}🌐 Nginx:${NC}"
if systemctl is-active --quiet nginx; then
    echo -e "${GREEN}✓${NC} Nginx działa"
else
    echo -e "${RED}✗${NC} Nginx nie działa!"
fi
echo ""

# PostgreSQL Status
echo -e "${BLUE}🗄️ PostgreSQL:${NC}"
if systemctl is-active --quiet postgresql; then
    echo -e "${GREEN}✓${NC} PostgreSQL działa"
    # Sprawdź połączenie
    if sudo -u postgres psql -c "SELECT 1;" > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} Połączenie z bazą danych działa"
    else
        echo -e "${RED}✗${NC} Problem z połączeniem do bazy danych"
    fi
else
    echo -e "${RED}✗${NC} PostgreSQL nie działa!"
fi
echo ""

# Ostatnie logi backendu
echo -e "${BLUE}📝 Ostatnie logi backendu (10 linii):${NC}"
pm2 logs trichology-backend --lines 10 --nostream 2>/dev/null || echo "Brak logów"
echo ""

# Użycie dysku
echo -e "${BLUE}💾 Użycie dysku:${NC}"
df -h / | tail -1
echo ""

# Użycie pamięci
echo -e "${BLUE}🧠 Użycie pamięci:${NC}"
free -h | grep Mem
echo ""

# Porty
echo -e "${BLUE}🔌 Porty:${NC}"
echo "Port 3001 (Backend):"
netstat -tuln | grep :3001 || echo "  Nie słucha"
echo "Port 80 (Nginx):"
netstat -tuln | grep :80 || echo "  Nie słucha"
echo ""

echo -e "${BLUE}════════════════════════════════════════${NC}"

