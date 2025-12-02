#!/bin/bash

# Skrypt szybkiej aktualizacji (bez rebuildu kontenerów)
# Użyj gdy zmiany są tylko w kodzie frontendu lub drobne w backendzie

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${GREEN}==================================${NC}"
echo -e "${GREEN}  Szybka Aktualizacja${NC}"
echo -e "${GREEN}==================================${NC}\n"

# Aktualizacja kodu
if [ -d ".git" ]; then
    echo -e "${YELLOW}Pobieranie zmian z Git...${NC}"
    git pull
fi

# Frontend
echo -e "${YELLOW}Aktualizacja frontendu...${NC}"
cd frontend
npm run build
sudo cp -r dist/* /var/www/trichology/
cd ..

# Restart backendu (bez rebuildu)
echo -e "${YELLOW}Restart backendu...${NC}"
docker-compose -f docker-compose.prod.yml restart backend

echo -e "\n${GREEN}Gotowe!${NC}"


