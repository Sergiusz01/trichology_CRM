# 🔧 Naprawa błędu 413 - Payload Too Large

**Data:** $(Get-Date -Format "yyyy-MM-dd HH:mm")
**Problem:** Błąd 413 przy wysyłaniu zdjęć z urządzeń mobilnych

## 🔍 Przyczyna problemu

Błąd 413 (Payload Too Large) występował, ponieważ:
1. **Nginx** nie miał ustawionego `client_max_body_size`, więc używał domyślnego limitu **1MB**
2. **Backend** miał limit **10MB** w multer, ale Nginx odrzucał żądania przed dotarciem do backendu
3. Zdjęcia z urządzeń mobilnych często są większe niż 1MB (zwykle 2-10MB lub więcej)

## ✅ Wykonane naprawy

### 1. Zwiększenie limitu w backendzie
**Plik:** `/var/www/trichology/backend/.env`
```bash
# Przed:
MAX_FILE_SIZE=10485760  # 10MB

# Po:
MAX_FILE_SIZE=52428800  # 50MB
```

### 2. Dodanie limitu w Nginx
**Plik:** `/etc/nginx/sites-available/trichology`

Dodano `client_max_body_size 50M` w dwóch miejscach:
- Globalnie w bloku `server` (dla wszystkich lokalizacji)
- W lokalizacji `/api` (dla żądań API)

```nginx
server {
    client_max_body_size 50M;  # ← DODANE
    listen 80;
    ...
    
    location /api {
        client_max_body_size 50M;  # ← DODANE
        proxy_pass http://localhost:3001;
        ...
    }
}
```

### 3. Restart usług
- ✅ Backend zrestartowany (PM2)
- ✅ Nginx przeładowany (systemctl reload)

## 📊 Nowe limity

| Komponent | Limit | Opis |
|-----------|-------|------|
| **Nginx** | 50MB | `client_max_body_size` |
| **Backend (Multer)** | 50MB | `MAX_FILE_SIZE` w .env |
| **Express** | Bez limitu | Domyślne ustawienia są wystarczające |

## ✅ Status

- ✅ **Nginx:** Działa z nowym limitem 50MB
- ✅ **Backend:** Działa z nowym limitem 50MB
- ✅ **Konfiguracja:** Zaktualizowana i przetestowana

## 🧪 Testowanie

Aby przetestować naprawę:

1. **Z urządzenia mobilnego:**
   - Otwórz aplikację w przeglądarce
   - Przejdź do dodawania zdjęcia skóry głowy
   - Wybierz zdjęcie z galerii (nawet duże, do 50MB)
   - Prześlij zdjęcie

2. **Oczekiwany wynik:**
   - Zdjęcie powinno się przesłać bez błędu 413
   - Powinno pojawić się potwierdzenie sukcesu

## 📝 Uwagi

- Limit 50MB jest wystarczający dla większości zdjęć z urządzeń mobilnych
- Jeśli w przyszłości będzie potrzeba większego limitu, można zwiększyć do 100MB lub więcej
- Warto monitorować użycie dysku w katalogu `/var/www/trichology/backend/storage/uploads`

## 🔄 Jeśli problem nadal występuje

1. **Sprawdź logi Nginx:**
   ```bash
   sudo tail -f /var/log/nginx/error.log
   ```

2. **Sprawdź logi backendu:**
   ```bash
   pm2 logs trichology-backend
   ```

3. **Sprawdź rozmiar pliku:**
   - Upewnij się, że plik nie przekracza 50MB

4. **Sprawdź konfigurację:**
   ```bash
   # Nginx
   sudo nginx -t
   sudo cat /etc/nginx/sites-available/trichology | grep client_max_body_size
   
   # Backend
   cd /var/www/trichology/backend
   cat .env | grep MAX_FILE_SIZE
   ```

---

**Status:** 🟢 **NAPRAWIONE - Błąd 413 nie powinien już występować**

