## 🚀 Opcja 1: Automatyczny skrypt (Zalecane)

Stworzyłem skrypt `git-deploy.ps1`, który robi wszystko za Ciebie w jednym kroku:
1. Robi `git commit` z Twoją wiadomością.
2. Sprawdza, co się zmieniło (Backend czy Frontend).
3. Wysyła na serwer tylko to, co trzeba.
4. Buduje i restartuje aplikację.

**Jak użyć?** W PowerShell wpisz:
```powershell
.\git-deploy.ps1 "Tutaj wpisz co zmieniles"
```

---

## 🛠️ Opcja 2: Ręczna aktualizacja
(Używaj tylko jeśli nie chcesz robić commita lub potrzebujesz pełnej kontroli)

Jeśli zmieniłeś coś w folderze `backend`, wykonaj te komendy w PowerShell:

```powershell
# 1. Przygotuj czystą kopię (bez node_modules)
robocopy backend c:\temp\backend-deploy /E /XD node_modules dist .git

# 2. Spakuj i wyślij
Compress-Archive -Path c:\temp\backend-deploy\* -DestinationPath c:\temp\backend.zip -Force
scp c:\temp\backend.zip root@91.99.237.141:~/

# 3. Rozpakuj i zrestartuj na serwerze
ssh root@91.99.237.141 "unzip -o ~/backend.zip -d ~/backend-src && cd ~/backend-src && npm install && npm run build && pm2 restart trichology-backend"
```

---

## 2. Aktualizacja Frontendu (Wygląd, Strony, Komponenty)

Jeśli zmieniłeś coś w folderze `frontend`, wykonaj te komendy w PowerShell:

```powershell
# 1. Przygotuj czystą kopię
robocopy frontend c:\temp\frontend-deploy /E /XD node_modules dist .git

# 2. Spakuj i wyślij
Compress-Archive -Path c:\temp\frontend-deploy\* -DestinationPath c:\temp\frontend.zip -Force
scp c:\temp\frontend.zip root@91.99.237.141:~/

# 3. Zbuduj i wdroż na serwerze
ssh root@91.99.237.141 "unzip -o ~/frontend.zip -d ~/frontend-src && cd ~/frontend-src && npm install && npm run build && cp -r dist/* /var/www/trichology/"
```

---

## 3. Zmiany w Bazie Danych (Prisma)

Jeśli zmieniłeś plik `prisma/schema.prisma` (dodałeś tabele lub pola), po wykonaniu kroku z Backendem, musisz zaktualizować bazę:

```powershell
ssh root@91.99.237.141 "cd ~/backend-src && npx prisma db push"
```

---

## 4. Sprawdzanie czy wszystko działa

**Logi backendu:**
```powershell
ssh root@91.99.237.141 "pm2 logs trichology-backend --lines 20"
```

**Health check (diagnostyka):**
```powershell
ssh root@91.99.237.141 "curl -s http://127.0.0.1:3001/health"
```
Oczekiwane: `{"status":"ok",...}`. Z zewnątrz: `curl -s http://91.99.237.141/health` (gdy Nginx proxy’uje `/health`).

**Restart backendu:**
```powershell
ssh root@91.99.237.141 "pm2 restart trichology-backend"
```

Więcej: **DEPLOYMENT.md** (Nginx, CORS, zmienne środowiskowe, rozwiązywanie problemów).

### 💡 Wskazówki:
*   **Przystanek:** Przed wysyłką upewnij się, że Twoje zmiany działają lokalnie (`npm run dev`).
*   **Logi:** Jeśli strona pokazuje błąd 500, najszybszą odpowiedzią są logi PM2 (komenda powyżej).
*   **Cache:** Po aktualizacji Frontendu, odśwież stronę w przeglądarce za pomocą `Ctrl + F5`, aby wyczyścić cache.
