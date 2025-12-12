# 🔍 Diagnostyka wyświetlania zdjęć

**URL problematyczny:** http://54.37.138.254/patients/cmiz0jqt10000xn4x1xbmkd3x/scalp-photos/

## ✅ Wykonane naprawy

1. **Naprawiono URL obrazów:**
   - Usunięto `Date.now()` z URL (powodowało problemy)
   - Dodano fallback do `photo.filePath` jeśli `photo.url` jest undefined
   - Dodano lepsze logowanie błędów

2. **Dodano diagnostykę:**
   - Logowanie do konsoli przy załadowaniu obrazu
   - Szczegółowe logowanie błędów z pełnym URL
   - Fallback do placeholder SVG przy błędzie

3. **Naprawiono konfigurację:**
   - Nginx: `location ^~ /uploads` (najwyższy priorytet)
   - Backend: CORS headers dla obrazów
   - Frontend: Przebudowany z najnowszymi zmianami

## 🔍 Jak zdiagnozować problem

### Krok 1: Otwórz konsolę przeglądarki
1. Naciśnij **F12** (lub Ctrl+Shift+I)
2. Przejdź do zakładki **Console**
3. Odśwież stronę: http://54.37.138.254/patients/cmiz0jqt10000xn4x1xbmkd3x/scalp-photos/
4. Sprawdź czy są błędy (czerwone komunikaty)

### Krok 2: Sprawdź zakładkę Network
1. W DevTools przejdź do zakładki **Network**
2. Odśwież stronę
3. Filtruj po **Img** (obrazy)
4. Sprawdź czy żądania do `/uploads/...` mają status:
   - ✅ **200 OK** - obraz się ładuje
   - ❌ **404** - obraz nie istnieje
   - ❌ **403** - problem z uprawnieniami
   - ❌ **CORS error** - problem z CORS

### Krok 3: Sprawdź URL obrazu
1. Kliknij prawym przyciskiem na brakujący obraz
2. Wybierz **"Otwórz obraz w nowej karcie"** lub **"Kopiuj adres obrazu"**
3. Sprawdź czy URL jest poprawny:
   - ✅ Powinien być: `http://54.37.138.254/uploads/scalp-*.jpg`
   - ❌ Nie powinien być: `http://localhost:3001/...`

### Krok 4: Sprawdź w konsoli co jest w `photo`
W konsoli przeglądarki wpisz:
```javascript
// Sprawdź czy zdjęcia są pobrane
console.log('Photos:', photos);
```

## 🐛 Typowe problemy i rozwiązania

### Problem 1: Obrazy się nie ładują (404)
**Przyczyna:** Nginx nie przekierowuje do backendu
**Rozwiązanie:** Sprawdź konfigurację Nginx:
```bash
sudo cat /etc/nginx/sites-available/trichology | grep -A 5 'location.*uploads'
```
Powinno być: `location ^~ /uploads`

### Problem 2: CORS error
**Przyczyna:** Backend nie zwraca nagłówków CORS
**Rozwiązanie:** Sprawdź czy backend działa:
```bash
curl -I http://54.37.138.254/uploads/scalp-*.jpg
```
Powinno zwrócić: `Access-Control-Allow-Origin: http://54.37.138.254`

### Problem 3: Obrazy się ładują, ale nie wyświetlają
**Przyczyna:** Problem z CSS lub orientacją EXIF
**Rozwiązanie:** 
- Sprawdź konsolę przeglądarki pod kątem błędów
- Sprawdź czy `imageOrientation: 'from-image'` jest ustawione
- Wyczyść cache przeglądarki (Ctrl+Shift+Delete)

### Problem 4: `photo.url` jest undefined
**Przyczyna:** Backend nie zwraca pola `url`
**Rozwiązanie:** Sprawdź odpowiedź API:
```javascript
// W konsoli przeglądarki
fetch('/api/scalp-photos/patient/cmiz0jqt10000xn4x1xbmkd3x', {
  headers: { 'Authorization': 'Bearer ' + localStorage.getItem('accessToken') }
})
.then(r => r.json())
.then(data => console.log('API response:', data));
```

## 📝 Sprawdzenie na serwerze

```bash
# Sprawdź czy pliki istnieją
ls -la /var/www/trichology/backend/storage/uploads/

# Sprawdź dostępność przez HTTP
curl -I http://54.37.138.254/uploads/scalp-1765496098400-601585374.jpg

# Sprawdź logi Nginx
sudo tail -f /var/log/nginx/error.log

# Sprawdź logi backendu
pm2 logs trichology-backend
```

## ✅ Ostatnie zmiany

- ✅ Naprawiono `Date.now()` w URL (używany tylko raz przy mount)
- ✅ Dodano fallback do `photo.filePath` jeśli `photo.url` jest undefined
- ✅ Dodano szczegółowe logowanie błędów
- ✅ Dodano `onLoad` handlers do logowania sukcesu
- ✅ Frontend przebudowany i wdrożony

---

**Jeśli problem nadal występuje, sprawdź konsolę przeglądarki (F12) i podaj dokładny komunikat błędu.**

