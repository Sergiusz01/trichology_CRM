#!/bin/bash

# Skrypt pierwszej konfiguracji VPS
# Uruchom ten skrypt na SERWERZE VPS po pierwszym połączeniu

set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Konfiguracja VPS dla Trichology${NC}"
echo -e "${GREEN}========================================${NC}\n"

# Sprawdzenie czy skrypt jest uruchamiany jako root lub z sudo
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}Ten skrypt wymaga uprawnień root.${NC}"
    echo -e "${YELLOW}Uruchom: sudo bash setup-vps.sh${NC}"
    exit 1
fi

# Aktualizacja systemu
echo -e "${YELLOW}1/10 Aktualizacja systemu...${NC}"
apt update && apt upgrade -y

# Instalacja podstawowych narzędzi
echo -e "${YELLOW}2/10 Instalacja podstawowych narzędzi...${NC}"
apt install -y git curl wget nano vim ufw fail2ban htop

# Instalacja Docker
echo -e "${YELLOW}3/10 Instalacja Docker...${NC}"
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    usermod -aG docker ubuntu
    rm get-docker.sh
    echo -e "${GREEN}✓ Docker zainstalowany${NC}"
else
    echo -e "${BLUE}Docker już zainstalowany${NC}"
fi

# Instalacja Docker Compose
echo -e "${YELLOW}4/10 Instalacja Docker Compose...${NC}"
if ! command -v docker-compose &> /dev/null; then
    curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
    echo -e "${GREEN}✓ Docker Compose zainstalowany${NC}"
else
    echo -e "${BLUE}Docker Compose już zainstalowany${NC}"
fi

# Instalacja Node.js
echo -e "${YELLOW}5/10 Instalacja Node.js 18...${NC}"
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt install -y nodejs
    echo -e "${GREEN}✓ Node.js zainstalowany${NC}"
else
    echo -e "${BLUE}Node.js już zainstalowany (wersja: $(node --version))${NC}"
fi

# Instalacja Nginx
echo -e "${YELLOW}6/10 Instalacja Nginx...${NC}"
if ! command -v nginx &> /dev/null; then
    apt install -y nginx
    systemctl enable nginx
    echo -e "${GREEN}✓ Nginx zainstalowany${NC}"
else
    echo -e "${BLUE}Nginx już zainstalowany${NC}"
fi

# Konfiguracja Firewall
echo -e "${YELLOW}7/10 Konfiguracja firewall (UFW)...${NC}"
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow OpenSSH
ufw allow 80/tcp   # HTTP
ufw allow 443/tcp  # HTTPS
ufw --force enable
echo -e "${GREEN}✓ Firewall skonfigurowany${NC}"

# Konfiguracja Fail2ban
echo -e "${YELLOW}8/10 Konfiguracja Fail2ban...${NC}"
cat > /etc/fail2ban/jail.local << 'EOF'
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[sshd]
enabled = true
port = ssh
logpath = /var/log/auth.log
maxretry = 3
bantime = 3600

[nginx-http-auth]
enabled = true
port = http,https
logpath = /var/log/nginx/error.log
maxretry = 5
bantime = 600
EOF

systemctl enable fail2ban
systemctl restart fail2ban
echo -e "${GREEN}✓ Fail2ban skonfigurowany${NC}"

# Tworzenie struktury katalogów
echo -e "${YELLOW}9/10 Tworzenie struktury katalogów...${NC}"
mkdir -p /home/ubuntu/app
mkdir -p /home/ubuntu/app/data/postgres
mkdir -p /home/ubuntu/app/data/backend-storage
mkdir -p /home/ubuntu/backups
mkdir -p /var/www/trichology

chown -R ubuntu:ubuntu /home/ubuntu/app
chown -R ubuntu:ubuntu /home/ubuntu/backups
chown -R www-data:www-data /var/www/trichology

echo -e "${GREEN}✓ Struktura katalogów utworzona${NC}"

# Weryfikacja instalacji
echo -e "${YELLOW}10/10 Weryfikacja instalacji...${NC}"
echo -e "\n${BLUE}Zainstalowane wersje:${NC}"
echo -e "  Docker: $(docker --version)"
echo -e "  Docker Compose: $(docker-compose --version)"
echo -e "  Node.js: $(node --version)"
echo -e "  npm: $(npm --version)"
echo -e "  Nginx: $(nginx -v 2>&1)"

echo -e "\n${BLUE}Status usług:${NC}"
systemctl is-active --quiet docker && echo -e "  ${GREEN}✓ Docker: aktywny${NC}" || echo -e "  ${RED}✗ Docker: nieaktywny${NC}"
systemctl is-active --quiet nginx && echo -e "  ${GREEN}✓ Nginx: aktywny${NC}" || echo -e "  ${RED}✗ Nginx: nieaktywny${NC}"
systemctl is-active --quiet fail2ban && echo -e "  ${GREEN}✓ Fail2ban: aktywny${NC}" || echo -e "  ${RED}✗ Fail2ban: nieaktywny${NC}"

echo -e "\n${BLUE}Status firewall:${NC}"
ufw status

echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}  Konfiguracja VPS zakończona!${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "\n${YELLOW}WAŻNE: Wyloguj się i zaloguj ponownie, aby zmiany grup (Docker) weszły w życie${NC}"
echo -e "\n${BLUE}Następne kroki:${NC}"
echo -e "  1. Wyloguj się: ${YELLOW}exit${NC}"
echo -e "  2. Zaloguj ponownie: ${YELLOW}ssh ubuntu@54.37.138.254${NC}"
echo -e "  3. Skopiuj projekt do ~/app"
echo -e "  4. Skonfiguruj plik .env.production"
echo -e "  5. Uruchom: ${YELLOW}cd ~/app && ./deploy.sh${NC}"


