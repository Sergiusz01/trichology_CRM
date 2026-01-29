#!/bin/bash
# Generuje certyfikat self-signed dla IP 91.99.237.141, usuwa Let's Encrypt (duckdns).
# Uruchom na VPS jako root. Przed: scp nginx-trichology.conf → /tmp/trichology.conf

set -e
IP="91.99.237.141"
SSL_DIR="/etc/nginx/ssl"
LE_CERT="trichology.duckdns.org"
NGINX_CONF="/tmp/trichology.conf"
NGINX_AVAILABLE="/etc/nginx/sites-available/trichology"

echo ">>> Tworzenie $SSL_DIR..."
mkdir -p "$SSL_DIR"
chmod 700 "$SSL_DIR"

echo ">>> Generowanie self-signed cert dla IP $IP..."
openssl req -x509 -nodes -days 3650 -newkey rsa:2048 \
  -keyout "$SSL_DIR/trichology-ip.key" \
  -out "$SSL_DIR/trichology-ip.crt" \
  -subj "/CN=$IP" \
  -addext "subjectAltName=IP:$IP"
chmod 600 "$SSL_DIR/trichology-ip.key"

echo ">>> Generowanie dhparam (2048 bit, moze chwile potrwac)..."
openssl dhparam -out "$SSL_DIR/dhparam.pem" 2048

echo ">>> Instalacja konfiguracji Nginx (tylko IP)..."
if [ -f "$NGINX_CONF" ]; then
  cp "$NGINX_CONF" "$NGINX_AVAILABLE"
else
  echo "Brak $NGINX_CONF – najpierw skopiuj nginx-trichology.conf na VPS."
  exit 1
fi

echo ">>> Zatrzymanie Nginx, usuwanie Let's Encrypt ($LE_CERT)..."
systemctl stop nginx 2>/dev/null || true
certbot delete --cert-name "$LE_CERT" --non-interactive 2>/dev/null || true

echo ">>> Start Nginx..."
systemctl start nginx
nginx -t && systemctl reload nginx 2>/dev/null || true

echo ">>> Gotowe. Aplikacja: https://$IP (self-signed – przeglądarka pokaże ostrzeżenie, wybierz „Zaawansowane” → „Przejdź do ...\")"
