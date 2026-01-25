# 🔐 Jak Stworzyć Klucz SSH na Windows - Przewodnik Krok po Kroku

## 🎯 **Czym Jest Klucz SSH?**

Klucz SSH to para plików:
- **Klucz prywatny** (id_rsa) - NIGDY nie udostępniaj! Zostaje na Twoim komputerze
- **Klucz publiczny** (id_rsa.pub) - Wklejasz na serwer (Hetzner)

To jak klucz i zamek - bezpieczniejsze niż hasło!

---

## 🚀 **METODA 1: PowerShell (Najłatwiejsza)** ⭐ REKOMENDOWANE

### **Krok 1: Otwórz PowerShell**
```
1. Naciśnij Windows + X
2. Wybierz "Windows PowerShell" lub "Terminal"
```

### **Krok 2: Sprawdź czy masz już klucz**
```powershell
# Sprawdź czy plik istnieje
Test-Path ~/.ssh/id_rsa.pub
```

**Jeśli wynik to `True`:**
- ✅ Masz już klucz! Przejdź do Kroku 5 (Pokaż klucz)

**Jeśli wynik to `False`:**
- ⏭️ Kontynuuj do Kroku 3

---

### **Krok 3: Wygeneruj klucz SSH**

#### **Opcja A: Prosty klucz (wystarczający)**
```powershell
ssh-keygen -t rsa -b 4096
```

**Co się stanie:**
```
Generating public/private rsa key pair.
Enter file in which to save the key (C:\Users\TWOJE_IMIE/.ssh/id_rsa):
```
👉 **Naciśnij ENTER** (użyj domyślnej lokalizacji)

```
Enter passphrase (empty for no passphrase):
```
👉 **Naciśnij ENTER** (bez hasła - łatwiejsze)
   LUB wpisz hasło (bezpieczniejsze, ale będziesz musiał je wpisywać)

```
Enter same passphrase again:
```
👉 **Naciśnij ENTER** (lub powtórz hasło)

**Gotowe!** Klucz został utworzony.

---

#### **Opcja B: Klucz z komentarzem (lepszy)**
```powershell
ssh-keygen -t rsa -b 4096 -C "twoj@email.com"
```

**Dlaczego z emailem?**
- Łatwiej zidentyfikować klucz
- Widać kto jest właścicielem
- Profesjonalne

**Potem:**
- Naciśnij ENTER 3x (jak w Opcji A)

---

#### **Opcja C: Klucz Ed25519 (najnowszy, najszybszy)** ⭐ NAJLEPSZY
```powershell
ssh-keygen -t ed25519 -C "twoj@email.com"
```

**Zalety Ed25519:**
- ✅ Szybszy
- ✅ Bezpieczniejszy
- ✅ Krótszy klucz
- ✅ Nowoczesny standard

**Uwaga:** Starsze systemy mogą nie obsługiwać (ale Hetzner TAK!)

---

### **Krok 4: Sprawdź czy klucz został utworzony**
```powershell
# Pokaż pliki w folderze .ssh
ls ~/.ssh
```

**Powinieneś zobaczyć:**
```
id_rsa          <- Klucz prywatny (NIGDY nie udostępniaj!)
id_rsa.pub      <- Klucz publiczny (ten wklejasz na Hetzner)
```

LUB (jeśli użyłeś Ed25519):
```
id_ed25519      <- Klucz prywatny
id_ed25519.pub  <- Klucz publiczny
```

---

### **Krok 5: Pokaż klucz publiczny**

#### **Dla RSA:**
```powershell
cat ~/.ssh/id_rsa.pub
```

#### **Dla Ed25519:**
```powershell
cat ~/.ssh/id_ed25519.pub
```

**Zobaczysz coś takiego:**
```
ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAACAQDZx... twoj@email.com
```

LUB:
```
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAI... twoj@email.com
```

---

### **Krok 6: Skopiuj klucz publiczny**

#### **Metoda A: Zaznacz i skopiuj (Ctrl+C)**
```powershell
# Pokaż klucz
cat ~/.ssh/id_rsa.pub

# Zaznacz cały output myszką
# Kliknij prawym → Kopiuj
# LUB naciśnij Ctrl+C
```

#### **Metoda B: Skopiuj do schowka automatycznie**
```powershell
# Windows 10/11:
cat ~/.ssh/id_rsa.pub | clip

# Klucz jest już w schowku! Możesz wkleić (Ctrl+V)
```

---

### **Krok 7: Wklej klucz w Hetzner**

1. W panelu Hetzner, w sekcji "SSH Keys"
2. Kliknij **"Dodaj klucz SSH"**
3. **Nazwa:** `Moj-Komputer` (lub `Windows-Laptop`)
4. **Klucz SSH:** Wklej skopiowany klucz (Ctrl+V)
5. Kliknij **"Dodaj klucz SSH"**

**Gotowe!** ✅

---

## 🔒 **METODA 2: PuTTYgen (Alternatywna)**

### **Krok 1: Pobierz PuTTY**
```
1. Wejdź na: https://www.putty.org/
2. Pobierz "PuTTY installer" (64-bit)
3. Zainstaluj
```

### **Krok 2: Uruchom PuTTYgen**
```
1. Start → Wpisz "PuTTYgen"
2. Uruchom aplikację
```

### **Krok 3: Wygeneruj klucz**
```
1. Type of key: RSA
2. Number of bits: 4096
3. Kliknij "Generate"
4. Poruszaj myszką w oknie (generuje losowość)
```

### **Krok 4: Zapisz klucze**
```
1. Key comment: Wpisz "twoj@email.com"
2. Key passphrase: Zostaw puste (lub wpisz hasło)
3. Kliknij "Save private key" → Zapisz jako "id_rsa.ppk"
4. Kliknij "Save public key" → Zapisz jako "id_rsa.pub"
```

### **Krok 5: Skopiuj klucz publiczny**
```
1. W oknie PuTTYgen, na górze jest pole "Public key for pasting..."
2. Zaznacz cały tekst
3. Skopiuj (Ctrl+C)
4. Wklej w Hetzner
```

**Uwaga:** PuTTY używa innego formatu klucza (.ppk)
- Do Hetzner: Użyj klucza z pola "Public key for pasting..."
- Do PuTTY: Użyj pliku .ppk

---

## ✅ **WERYFIKACJA - Czy Klucz Działa?**

### **Test 1: Sprawdź czy klucz istnieje**
```powershell
Test-Path ~/.ssh/id_rsa.pub
# Powinno być: True
```

### **Test 2: Pokaż klucz**
```powershell
cat ~/.ssh/id_rsa.pub
# Powinien pokazać długi ciąg znaków zaczynający się od "ssh-rsa"
```

### **Test 3: Sprawdź uprawnienia (opcjonalnie)**
```powershell
icacls $env:USERPROFILE\.ssh\id_rsa
# Powinien być dostępny tylko dla Ciebie
```

---

## 🎯 **NAJLEPSZA PRAKTYKA - Moja Rekomendacja**

### **Użyj Ed25519 z komentarzem:**
```powershell
ssh-keygen -t ed25519 -C "twoj@email.com"

# Naciśnij ENTER 3x (bez hasła)
```

**Dlaczego?**
- ✅ Najnowszy standard
- ✅ Najszybszy
- ✅ Najbezpieczniejszy
- ✅ Krótszy klucz (łatwiej skopiować)
- ✅ Wspierany przez Hetzner

**Potem:**
```powershell
# Skopiuj do schowka
cat ~/.ssh/id_ed25519.pub | clip

# Wklej w Hetzner
```

---

## 🔐 **BEZPIECZEŃSTWO**

### **✅ DOBRE PRAKTYKI:**

1. **NIGDY nie udostępniaj klucza prywatnego!**
   ```
   ❌ id_rsa (prywatny) - NIGDY!
   ✅ id_rsa.pub (publiczny) - Możesz
   ```

2. **Backup klucza prywatnego**
   ```powershell
   # Skopiuj na pendrive lub cloud (zaszyfrowany!)
   cp ~/.ssh/id_rsa D:\backup\
   ```

3. **Różne klucze dla różnych serwerów (opcjonalnie)**
   ```powershell
   # Klucz dla Hetzner
   ssh-keygen -t ed25519 -f ~/.ssh/id_ed25519_hetzner -C "hetzner@email.com"
   
   # Klucz dla GitHub
   ssh-keygen -t ed25519 -f ~/.ssh/id_ed25519_github -C "github@email.com"
   ```

4. **Użyj passphrase dla produkcji**
   ```
   Przy generowaniu klucza wpisz silne hasło
   Będziesz musiał je wpisywać przy każdym połączeniu
   Ale klucz będzie bezpieczniejszy
   ```

---

## 🆘 **ROZWIĄZYWANIE PROBLEMÓW**

### **Problem: "ssh-keygen nie jest rozpoznawany"**

**Rozwiązanie:**
```powershell
# Sprawdź czy OpenSSH jest zainstalowany
Get-WindowsCapability -Online | Where-Object Name -like 'OpenSSH*'

# Jeśli nie ma, zainstaluj:
Add-WindowsCapability -Online -Name OpenSSH.Client~~~~0.0.1.0
```

### **Problem: "Permission denied (publickey)"**

**Rozwiązanie:**
1. Sprawdź czy klucz jest dodany w Hetzner
2. Sprawdź czy łączysz się jako `root`
3. Sprawdź czy używasz poprawnego klucza:
   ```powershell
   ssh -i ~/.ssh/id_rsa root@IP_SERWERA
   ```

### **Problem: "Klucz jest za długi, nie mogę skopiować"**

**Rozwiązanie:**
```powershell
# Użyj clip (automatycznie kopiuje do schowka)
cat ~/.ssh/id_rsa.pub | clip

# Potem po prostu Ctrl+V w Hetzner
```

---

## 📋 **CHECKLIST - Czy Wszystko OK?**

- [ ] Klucz wygenerowany (`ssh-keygen` wykonany)
- [ ] Plik `id_rsa.pub` istnieje (`Test-Path ~/.ssh/id_rsa.pub` = True)
- [ ] Klucz publiczny skopiowany (`cat ~/.ssh/id_rsa.pub | clip`)
- [ ] Klucz dodany w Hetzner (w sekcji SSH Keys)
- [ ] Nazwa klucza w Hetzner: "Moj-Komputer"
- [ ] Klucz prywatny (`id_rsa`) NIGDY nie udostępniony

---

## 🎯 **SZYBKA ŚCIĄGAWKA**

### **Generuj klucz (Ed25519 - najlepszy):**
```powershell
ssh-keygen -t ed25519 -C "twoj@email.com"
# Naciśnij ENTER 3x
```

### **Skopiuj klucz do schowka:**
```powershell
cat ~/.ssh/id_ed25519.pub | clip
```

### **Wklej w Hetzner:**
```
1. Panel Hetzner → SSH Keys
2. "Dodaj klucz SSH"
3. Nazwa: "Moj-Komputer"
4. Klucz: Ctrl+V
5. "Dodaj klucz SSH"
```

### **Połącz się z serwerem:**
```powershell
ssh root@IP_SERWERA
```

**Gotowe!** 🎉

---

## 💡 **BONUS: Konfiguracja SSH Config**

### **Dla wygody, stwórz plik config:**

```powershell
# Utwórz plik config
notepad ~/.ssh/config
```

**Wklej:**
```
Host hetzner
    HostName IP_TWOJEGO_SERWERA
    User root
    IdentityFile ~/.ssh/id_ed25519
    
Host hetzner-prod
    HostName IP_TWOJEGO_SERWERA
    User root
    IdentityFile ~/.ssh/id_ed25519
```

**Teraz możesz łączyć się prościej:**
```powershell
# Zamiast:
ssh root@123.456.789.012

# Możesz:
ssh hetzner
```

---

## 🚀 **NASTĘPNE KROKI**

1. ✅ Wygeneruj klucz SSH
2. ✅ Dodaj klucz w Hetzner
3. ✅ Utwórz serwer (z tym kluczem)
4. ✅ Połącz się: `ssh root@IP_SERWERA`
5. ✅ Zainstaluj aplikację

---

**Masz pytania? Powiedz na którym etapie jesteś!** 🎯
