#!/bin/bash

# Kolory dla output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${GREEN}==================================${NC}"
echo -e "${GREEN}  Wdrożenie Aplikacji Trichology${NC}"
echo -e "${GREEN}==================================${NC}\n"

# Sprawdzenie czy jesteśmy w odpowiednim katalogu
if [ ! -f "docker-compose.prod.yml" ]; then
    echo -e "${RED}Błąd: Nie znaleziono pliku docker-compose.prod.yml${NC}"
    echo -e "${RED}Upewnij się, że jesteś w katalogu ~/app${NC}"
    exit 1
fi

# Sprawdzenie czy plik .env.production istnieje
if [ ! -f ".env.production" ]; then
    echo -e "${RED}Błąd: Nie znaleziono pliku .env.production${NC}"
    echo -e "${YELLOW}Skopiuj .env.production.example do .env.production i wypełnij wartości${NC}"
    exit 1
fi

# Zatrzymaj stare kontenery
echo -e "${YELLOW}1/7 Zatrzymywanie starych kontenerów...${NC}"
docker-compose -f docker-compose.prod.yml down

# Aktualizacja kodu z Git (jeśli używasz)
if [ -d ".git" ]; then
    echo -e "${YELLOW}2/7 Aktualizacja kodu z Git...${NC}"
    git pull origin master || git pull origin main || echo -e "${BLUE}Brak zmian w Git${NC}"
else
    echo -e "${BLUE}2/7 Git nie jest skonfigurowany, pomijam...${NC}"
fi

# Budowanie frontendu
echo -e "${YELLOW}3/7 Budowanie frontendu...${NC}"
cd frontend

# Sprawdzenie czy node_modules istnieje
if [ ! -d "node_modules" ]; then
    echo -e "${BLUE}Instalacja zależności frontendu...${NC}"
    npm install
else
    echo -e "${BLUE}Aktualizacja zależności frontendu...${NC}"
    npm install
fi

# Budowanie
npm run build

if [ $? -ne 0 ]; then
    echo -e "${RED}Błąd podczas budowania frontendu!${NC}"
    exit 1
fi

# Kopiowanie zbudowanego frontendu do katalogu nginx
echo -e "${YELLOW}4/7 Kopiowanie plików frontendu do /var/www/trichology...${NC}"
sudo rm -rf /var/www/trichology/*
sudo mkdir -p /var/www/trichology
sudo cp -r dist/* /var/www/trichology/
sudo chown -R www-data:www-data /var/www/trichology

if [ $? -ne 0 ]; then
    echo -e "${RED}Błąd podczas kopiowania plików frontendu!${NC}"
    exit 1
fi

cd ..

# Ładowanie zmiennych środowiskowych
echo -e "${YELLOW}5/7 Ładowanie zmiennych środowiskowych...${NC}"
if [ -f ".env.production" ]; then
    export $(cat .env.production | grep -v '^#' | xargs)
fi

# Budowanie i uruchamianie kontenerów
echo -e "${YELLOW}6/7 Budowanie i uruchamianie kontenerów Docker...${NC}"
docker-compose -f docker-compose.prod.yml up -d --build

if [ $? -ne 0 ]; then
    echo -e "${RED}Błąd podczas uruchamiania kontenerów Docker!${NC}"
    exit 1
fi

# Oczekiwanie na uruchomienie bazy danych
echo -e "${BLUE}Oczekiwanie na uruchomienie bazy danych (20 sekund)...${NC}"
sleep 20

# Uruchomienie migracji Prisma
echo -e "${YELLOW}7/7 Uruchamianie migracji bazy danych...${NC}"
docker-compose -f docker-compose.prod.yml exec -T backend npx prisma migrate deploy

if [ $? -ne 0 ]; then
    echo -e "${RED}Błąd podczas uruchamiania migracji!${NC}"
    echo -e "${YELLOW}Sprawdź czy baza danych jest dostępna i czy migracje są poprawne${NC}"
fi

# Sprawdzenie statusu
echo -e "\n${BLUE}Status kontenerów:${NC}"
docker-compose -f docker-compose.prod.yml ps

# Sprawdzenie logów
echo -e "\n${BLUE}Ostatnie logi backendu:${NC}"
docker-compose -f docker-compose.prod.yml logs --tail=30 backend

# Test health endpoint
echo -e "\n${BLUE}Sprawdzanie health endpoint...${NC}"
sleep 5
HEALTH_CHECK=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/health)
if [ "$HEALTH_CHECK" = "200" ]; then
    echo -e "${GREEN}✓ Backend odpowiada poprawnie (HTTP 200)${NC}"
else
    echo -e "${YELLOW}⚠ Backend nie odpowiada lub zwraca błąd (HTTP $HEALTH_CHECK)${NC}"
fi

echo -e "\n${GREEN}==================================${NC}"
echo -e "${GREEN}  Wdrożenie zakończone!${NC}"
echo -e "${GREEN}==================================${NC}"
echo -e "\nAplikacja powinna być dostępna pod adresem:"
echo -e "${GREEN}Frontend: http://54.37.138.254${NC}"
echo -e "${GREEN}Backend API: http://54.37.138.254:3001${NC}"
echo -e "${GREEN}Backend via Nginx: http://54.37.138.254/api${NC}"
echo -e "\n${BLUE}Przydatne komendy:${NC}"
echo -e "  docker-compose -f docker-compose.prod.yml logs -f        # Logi (wszystkie)"
echo -e "  docker-compose -f docker-compose.prod.yml logs -f backend # Logi backend"
echo -e "  docker-compose -f docker-compose.prod.yml ps             # Status kontenerów"
echo -e "  docker-compose -f docker-compose.prod.yml restart        # Restart"


