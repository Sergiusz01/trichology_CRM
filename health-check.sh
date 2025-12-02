#!/bin/bash

# Skrypt sprawdzania stanu aplikacji
# Uruchom: ./health-check.sh

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Health Check - Trichology App${NC}"
echo -e "${BLUE}========================================${NC}\n"

# Sprawdzenie czy jesteśmy w katalogu projektu
if [ ! -f "docker-compose.prod.yml" ]; then
    echo -e "${RED}Błąd: Uruchom skrypt w katalogu ~/app${NC}"
    exit 1
fi

ERRORS=0

# 1. Status kontenerów Docker
echo -e "${YELLOW}1. Sprawdzanie kontenerów Docker...${NC}"
POSTGRES_STATUS=$(docker-compose -f docker-compose.prod.yml ps postgres | grep "Up")
BACKEND_STATUS=$(docker-compose -f docker-compose.prod.yml ps backend | grep "Up")

if [ -n "$POSTGRES_STATUS" ]; then
    echo -e "  ${GREEN}✓ PostgreSQL: działa${NC}"
else
    echo -e "  ${RED}✗ PostgreSQL: nie działa${NC}"
    ERRORS=$((ERRORS + 1))
fi

if [ -n "$BACKEND_STATUS" ]; then
    echo -e "  ${GREEN}✓ Backend: działa${NC}"
else
    echo -e "  ${RED}✗ Backend: nie działa${NC}"
    ERRORS=$((ERRORS + 1))
fi

# 2. Status Nginx
echo -e "\n${YELLOW}2. Sprawdzanie Nginx...${NC}"
if systemctl is-active --quiet nginx; then
    echo -e "  ${GREEN}✓ Nginx: aktywny${NC}"
else
    echo -e "  ${RED}✗ Nginx: nieaktywny${NC}"
    ERRORS=$((ERRORS + 1))
fi

# 3. Test Health Endpoint
echo -e "\n${YELLOW}3. Testowanie API...${NC}"
HEALTH_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/health)
if [ "$HEALTH_CODE" = "200" ]; then
    echo -e "  ${GREEN}✓ Backend API: odpowiada (HTTP 200)${NC}"
else
    echo -e "  ${RED}✗ Backend API: nie odpowiada (HTTP $HEALTH_CODE)${NC}"
    ERRORS=$((ERRORS + 1))
fi

NGINX_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/api/health)
if [ "$NGINX_HEALTH" = "200" ]; then
    echo -e "  ${GREEN}✓ Nginx Proxy: działa (HTTP 200)${NC}"
else
    echo -e "  ${YELLOW}⚠ Nginx Proxy: problem (HTTP $NGINX_HEALTH)${NC}"
fi

# 4. Połączenie z bazą danych
echo -e "\n${YELLOW}4. Sprawdzanie bazy danych...${NC}"
DB_CHECK=$(docker-compose -f docker-compose.prod.yml exec -T postgres pg_isready -U trichology_user 2>&1)
if echo "$DB_CHECK" | grep -q "accepting connections"; then
    echo -e "  ${GREEN}✓ PostgreSQL: przyjmuje połączenia${NC}"
else
    echo -e "  ${RED}✗ PostgreSQL: problem z połączeniem${NC}"
    ERRORS=$((ERRORS + 1))
fi

# 5. Sprawdzenie miejsca na dysku
echo -e "\n${YELLOW}5. Sprawdzanie miejsca na dysku...${NC}"
DISK_USAGE=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -lt 80 ]; then
    echo -e "  ${GREEN}✓ Dysk: ${DISK_USAGE}% użyte${NC}"
elif [ "$DISK_USAGE" -lt 90 ]; then
    echo -e "  ${YELLOW}⚠ Dysk: ${DISK_USAGE}% użyte (rozważ czyszczenie)${NC}"
else
    echo -e "  ${RED}✗ Dysk: ${DISK_USAGE}% użyte (krytyczne!)${NC}"
    ERRORS=$((ERRORS + 1))
fi

# 6. Sprawdzenie pamięci RAM
echo -e "\n${YELLOW}6. Sprawdzanie pamięci RAM...${NC}"
MEM_USAGE=$(free | grep Mem | awk '{printf "%.0f", $3/$2 * 100.0}')
if [ "$MEM_USAGE" -lt 80 ]; then
    echo -e "  ${GREEN}✓ RAM: ${MEM_USAGE}% użyte${NC}"
elif [ "$MEM_USAGE" -lt 90 ]; then
    echo -e "  ${YELLOW}⚠ RAM: ${MEM_USAGE}% użyte${NC}"
else
    echo -e "  ${RED}✗ RAM: ${MEM_USAGE}% użyte (wysokie zużycie)${NC}"
fi

# 7. Ostatnie błędy w logach
echo -e "\n${YELLOW}7. Ostatnie błędy w logach backendu...${NC}"
ERROR_COUNT=$(docker-compose -f docker-compose.prod.yml logs --tail=100 backend 2>&1 | grep -i "error" | wc -l)
if [ "$ERROR_COUNT" -eq 0 ]; then
    echo -e "  ${GREEN}✓ Brak błędów w ostatnich 100 liniach logów${NC}"
else
    echo -e "  ${YELLOW}⚠ Znaleziono $ERROR_COUNT błędów w logach${NC}"
    echo -e "  ${BLUE}Ostatnie błędy:${NC}"
    docker-compose -f docker-compose.prod.yml logs --tail=100 backend 2>&1 | grep -i "error" | tail -5
fi

# 8. Sprawdzenie portów
echo -e "\n${YELLOW}8. Sprawdzanie portów...${NC}"
if netstat -tlnp 2>/dev/null | grep -q ":80"; then
    echo -e "  ${GREEN}✓ Port 80 (HTTP): nasłuchuje${NC}"
else
    echo -e "  ${RED}✗ Port 80 (HTTP): nie nasłuchuje${NC}"
    ERRORS=$((ERRORS + 1))
fi

if netstat -tlnp 2>/dev/null | grep -q ":3001"; then
    echo -e "  ${GREEN}✓ Port 3001 (Backend): nasłuchuje${NC}"
else
    echo -e "  ${RED}✗ Port 3001 (Backend): nie nasłuchuje${NC}"
    ERRORS=$((ERRORS + 1))
fi

# 9. Sprawdzenie frontendu
echo -e "\n${YELLOW}9. Sprawdzanie frontendu...${NC}"
if [ -f "/var/www/trichology/index.html" ]; then
    echo -e "  ${GREEN}✓ Pliki frontendu: istnieją${NC}"
    FILE_COUNT=$(ls -1 /var/www/trichology/ | wc -l)
    echo -e "  ${BLUE}Liczba plików: $FILE_COUNT${NC}"
else
    echo -e "  ${RED}✗ Pliki frontendu: brak${NC}"
    ERRORS=$((ERRORS + 1))
fi

# 10. Ostatni backup
echo -e "\n${YELLOW}10. Ostatni backup bazy danych...${NC}"
if [ -d "$HOME/backups" ]; then
    LAST_BACKUP=$(ls -t $HOME/backups/db_backup_*.sql.gz 2>/dev/null | head -1)
    if [ -n "$LAST_BACKUP" ]; then
        BACKUP_DATE=$(stat -c %y "$LAST_BACKUP" | cut -d' ' -f1)
        BACKUP_SIZE=$(du -h "$LAST_BACKUP" | cut -f1)
        echo -e "  ${GREEN}✓ Ostatni backup: $BACKUP_DATE ($BACKUP_SIZE)${NC}"
    else
        echo -e "  ${YELLOW}⚠ Brak backupów w katalogu ~/backups${NC}"
    fi
else
    echo -e "  ${YELLOW}⚠ Katalog ~/backups nie istnieje${NC}"
fi

# Podsumowanie
echo -e "\n${BLUE}========================================${NC}"
if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}✓ System działa poprawnie!${NC}"
    exit 0
else
    echo -e "${RED}✗ Znaleziono $ERRORS problemów${NC}"
    echo -e "${YELLOW}Sprawdź logi: docker-compose -f docker-compose.prod.yml logs${NC}"
    exit 1
fi


