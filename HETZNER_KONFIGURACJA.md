# 🚀 Konfiguracja Serwera Hetzner - Instrukcja Krok po Kroku

## 📋 **Formularz Tworzenia Serwera**

### **1️⃣ TYP SERWERA**

#### **Wybierz: CAX21** ⭐ **REKOMENDOWANE**
```
✅ CAX21
   CPU: 4 vCPU (ARM64 - najnowsza technologia)
   RAM: 8 GB (wystarczy z zapasem!)
   Dysk: 80 GB NVMe SSD
   Transfer: 20 TB
   Cena: €7.37/m (~32 PLN/m)
```

**Dlaczego CAX21 zamiast CAX11?**
- ✅ 2x więcej RAM (8GB vs 4GB) - PostgreSQL + Node.js będą działać płynnie
- ✅ 2x więcej dysku (80GB vs 40GB) - miejsce na zdjęcia pacjentów, PDF, backupy
- ✅ 2x więcej CPU (4 vs 2) - szybsze przetwarzanie
- ✅ Tylko €3.32/m więcej (~14 PLN)
- ✅ Lepiej przygotowany na przyszłość (skalowanie)

**Alternatywa (jeśli budżet ograniczony):**
```
⚠️ CAX11 (minimum)
   CPU: 2 vCPU
   RAM: 4 GB
   Dysk: 40 GB
   Cena: €4.05/m (~18 PLN/m)
   
   Wystarczy na start, ale może być ciasno przy wielu użytkownikach
```

---

### **2️⃣ LOKALIZACJA**

#### **Wybierz: Falkenstein (fsn1)** ⭐ **REKOMENDOWANE**
```
✅ Falkenstein, Germany (fsn1)
   - Najbliżej Polski
   - Ping ~20-30ms
   - Najstarsza lokalizacja (najbardziej stabilna)
   - Wszystkie funkcje dostępne
```

**Alternatywy:**
- **Nuremberg (nbg1)** - Również Niemcy, podobny ping
- **Helsinki (hel1)** - Finlandia, ping ~40-50ms

**NIE wybieraj:** Ashburn (USA) - ping >100ms

---

### **3️⃣ OBRAZ (IMAGE)**

#### **Wybierz: Ubuntu 22.04** ⭐ **REKOMENDOWANE**

**Krok po kroku:**
1. Kliknij zakładkę **"Obrazy systemu operacyjnego"**
2. Znajdź **"Ubuntu"**
3. Wybierz **"Ubuntu 22.04"** (LTS - Long Term Support)

```
✅ Ubuntu 22.04 LTS
   - Najstabilniejszy
   - Długie wsparcie (do 2027)
   - Najlepsza kompatybilność
   - Świetna dokumentacja
```

**NIE wybieraj:**
- ❌ Aplikacje (Docker, WordPress) - zainstalujemy ręcznie
- ❌ Fedora/CentOS - mniej popularny dla Node.js
- ❌ Debian - starsze paczki

---

### **4️⃣ SIECIOWANIE (NETWORKING)**

#### **Konfiguracja:**

**A. Publiczne IPv4:**
```
✅ Zostaw zaznaczone "Public IPv4"
   - Potrzebne do dostępu z internetu
   - 1 adres IPv4 za darmo
   - Koszt: €0 (pierwszy gratis)
```

**B. IPv6:**
```
✅ Zostaw zaznaczone "Public IPv6"
   - Darmowe
   - Przyszłościowe
```

**C. Sieci Prywatne:**
```
⚠️ NIE zaznaczaj (na razie)
   - Potrzebne tylko przy wielu serwerach
   - Możesz dodać później
```

**Podsumowanie Networking:**
- ✅ Public IPv4: TAK
- ✅ Public IPv6: TAK
- ❌ Private Network: NIE (na razie)

---

### **5️⃣ KLUCZE SSH** ⭐ **WAŻNE!**

#### **Opcja A: Masz już klucz SSH (Rekomendowane)**
```
1. Kliknij "Dodaj klucz SSH"
2. Wklej swój publiczny klucz
3. Nadaj nazwę: "Moj-Komputer"
```

**Jak znaleźć swój klucz SSH (Windows):**
```powershell
# W PowerShell:
cat ~/.ssh/id_rsa.pub

# Jeśli nie masz klucza, wygeneruj:
ssh-keygen -t rsa -b 4096 -C "twoj@email.com"
# Naciśnij Enter 3x (domyślne ustawienia)

# Pokaż klucz:
cat ~/.ssh/id_rsa.pub
# Skopiuj cały output (zaczyna się od "ssh-rsa")
```

#### **Opcja B: Nie masz klucza SSH**
```
⚠️ Zostaw puste
   - Otrzymasz hasło roota emailem
   - Mniej bezpieczne
   - Będziesz musiał zmienić hasło przy pierwszym logowaniu
```

**Rekomendacja:** Użyj klucza SSH (bezpieczniejsze!)

---

### **6️⃣ WOLUMENY (VOLUMES)**

```
❌ NIE twórz wolumenu (na razie)
   - 80GB dysku wystarczy
   - Możesz dodać później jeśli potrzeba
   - Koszt: €0.04/GB/m
```

**Kiedy dodać wolumin?**
- Gdy zabraknie miejsca na zdjęcia
- Gdy chcesz oddzielić dane od systemu
- Dla backupów

---

### **7️⃣ ZAPORY SIECIOWE (FIREWALLS)**

```
⚠️ Zostaw puste (skonfigurujemy później)
   - Najpierw uruchomimy serwer
   - Potem dodamy firewall przez panel
```

**Co zrobimy później:**
```
Firewall Rules:
- SSH (22) - Tylko Twoje IP
- HTTP (80) - All
- HTTPS (443) - All
- PostgreSQL (5432) - BLOCK (tylko localhost)
```

---

### **8️⃣ KOPIE ZAPASOWE (BACKUPS)**

#### **Wybierz: TAK** ⭐ **REKOMENDOWANE**

```
✅ Włącz "Backups"
   - Automatyczne codzienne backupy
   - Przechowywane 7 dni
   - Łatwe przywracanie
   - Koszt: 20% ceny serwera
   
   CAX21: €7.37 + €1.47 = €8.84/m (~38 PLN/m)
```

**Dlaczego warto?**
- ✅ Automatyczne (nie musisz pamiętać)
- ✅ Bezpieczeństwo danych
- ✅ Łatwe przywracanie po błędzie
- ✅ Tylko €1.47/m więcej

**Alternatywa (jeśli budżet ciasny):**
```
⚠️ Użyj Snapshots zamiast Backups
   - Darmowe
   - Ręczne (musisz pamiętać)
   - Nielimitowane przechowywanie
```

---

### **9️⃣ GRUPY ROZMIESZCZENIA**

```
❌ NIE twórz (nie potrzebne)
   - Dla wielu serwerów
   - Dla high availability
   - Nie dotyczy pojedynczego serwera
```

---

### **🔟 ETYKIETY (LABELS)**

```
⚠️ Opcjonalne (możesz pominąć)
   - Dla organizacji wielu serwerów
   - Przydatne przy API
```

**Jeśli chcesz dodać:**
```
Klucz: environment
Wartość: production

Klucz: app
Wartość: trichology
```

---

### **1️⃣1️⃣ CLOUD-INIT (KONFIGURACJA)**

```
⚠️ Zostaw puste (na razie)
   - Zaawansowana funkcja
   - Automatyzacja instalacji
   - Nie potrzebne dla pierwszego serwera
```

---

### **1️⃣2️⃣ NAZWA SERWERA**

#### **Zmień na:** `trichology-prod`

```
✅ Nazwa: trichology-prod
   - Opisowa
   - Łatwa do zapamiętania
   - Wskazuje przeznaczenie
```

**Inne propozycje:**
- `trichology-app`
- `trichology-server`
- `prod-trichology`

---

## ✅ **FINALNA KONFIGURACJA - PODSUMOWANIE**

```
┌─────────────────────────────────────────────┐
│  🚀 REKOMENDOWANA KONFIGURACJA              │
├─────────────────────────────────────────────┤
│  Typ: CAX21                                 │
│  CPU: 4 vCPU ARM64                          │
│  RAM: 8 GB                                  │
│  Dysk: 80 GB NVMe                           │
│                                             │
│  Lokalizacja: Falkenstein (fsn1)            │
│  Obraz: Ubuntu 22.04 LTS                    │
│                                             │
│  Networking:                                │
│  ✅ Public IPv4                             │
│  ✅ Public IPv6                             │
│  ❌ Private Network                         │
│                                             │
│  SSH Key: ✅ Dodaj swój klucz               │
│  Volumes: ❌ Nie (na razie)                 │
│  Firewall: ❌ Nie (dodamy później)          │
│  Backups: ✅ TAK (20%)                      │
│  Placement Groups: ❌ Nie                   │
│  Labels: ⚠️  Opcjonalne                     │
│  Cloud-init: ❌ Nie                         │
│                                             │
│  Nazwa: trichology-prod                     │
│                                             │
│  💰 KOSZT: €8.84/m (~38 PLN/m)              │
│     (z backupami)                           │
└─────────────────────────────────────────────┘
```

---

## 🎯 **KROK PO KROKU - KLIKNIJ:**

### **1. Typ Serwera**
```
☐ Kliknij "Wspólne zasoby"
☐ Wybierz "CAX21" (4 CPU, 8GB RAM)
```

### **2. Lokalizacja**
```
☐ Wybierz "Falkenstein" (fsn1)
```

### **3. Obraz**
```
☐ Kliknij zakładkę "Obrazy systemu operacyjnego"
☐ Wybierz "Ubuntu 22.04"
```

### **4. Networking**
```
☐ Zostaw zaznaczone "Public IPv4"
☐ Zostaw zaznaczone "Public IPv6"
☐ NIE zaznaczaj "Private Network"
```

### **5. SSH Key**
```
☐ Kliknij "Dodaj klucz SSH"
☐ Wklej swój publiczny klucz
☐ Nazwa: "Moj-Komputer"
☐ Kliknij "Dodaj klucz SSH"

LUB (jeśli nie masz klucza):
☐ Zostaw puste (otrzymasz hasło emailem)
```

### **6. Volumes**
```
☐ Zostaw puste (nie twórz)
```

### **7. Firewalls**
```
☐ Zostaw puste (dodamy później)
```

### **8. Backups**
```
☐ Zaznacz "Włącz kopie zapasowe"
```

### **9. Placement Groups**
```
☐ Zostaw puste
```

### **10. Labels**
```
☐ Zostaw puste (opcjonalne)
```

### **11. Cloud-init**
```
☐ Zostaw puste
```

### **12. Nazwa**
```
☐ Zmień na: "trichology-prod"
```

### **13. Utwórz!**
```
☐ Kliknij "Utwórz i kup teraz" (na dole)
```

---

## ⏱️ **CO SIĘ STANIE PO KLIKNIĘCIU "UTWÓRZ"**

### **1. Tworzenie serwera (1-2 minuty)**
```
⏳ Hetzner tworzy serwer
⏳ Instaluje Ubuntu 22.04
⏳ Konfiguruje sieć
⏳ Dodaje klucz SSH (jeśli podałeś)
```

### **2. Serwer gotowy!**
```
✅ Status: "Running" (zielony)
✅ IP Address: 123.456.789.012 (przykład)
✅ Root password: (email, jeśli nie użyłeś SSH key)
```

### **3. Otrzymasz email**
```
📧 Temat: "Your new Cloud Server is ready"
📧 Zawiera:
   - IP serwera
   - Hasło root (jeśli nie użyłeś SSH key)
   - Instrukcje logowania
```

---

## 🔌 **PIERWSZE POŁĄCZENIE**

### **Jeśli użyłeś klucza SSH:**
```powershell
# W PowerShell:
ssh root@TWOJE_IP_SERWERA

# Przykład:
ssh root@123.456.789.012
```

### **Jeśli użyłeś hasła:**
```powershell
# W PowerShell:
ssh root@TWOJE_IP_SERWERA

# Wpisz hasło z emaila
# Zostaniesz poproszony o zmianę hasła
```

---

## 🎯 **NASTĘPNE KROKI PO UTWORZENIU**

### **1. Połącz się z serwerem**
```bash
ssh root@TWOJE_IP
```

### **2. Zaktualizuj system**
```bash
apt update && apt upgrade -y
```

### **3. Utwórz firewall w panelu Hetzner**
```
1. W panelu Hetzner kliknij "Firewalls"
2. Kliknij "Create Firewall"
3. Nazwa: "trichology-firewall"
4. Dodaj reguły:
   - Inbound: SSH (22) - Twoje IP
   - Inbound: HTTP (80) - All
   - Inbound: HTTPS (443) - All
5. Przypisz do serwera "trichology-prod"
```

### **4. Zainstaluj aplikację**
```
Użyj przewodnika: WDROZENIE_MIKRUS.md
(te same komendy działają na Hetzner!)
```

---

## 💰 **PODSUMOWANIE KOSZTÓW**

### **CAX21 z Backupami:**
```
Serwer CAX21:        €7.37/m
Backups (20%):       €1.47/m
IPv4 (1 gratis):     €0.00/m
────────────────────────────
RAZEM:               €8.84/m (~38 PLN/m)
```

### **CAX11 z Backupami (minimum):**
```
Serwer CAX11:        €4.05/m
Backups (20%):       €0.81/m
IPv4 (1 gratis):     €0.00/m
────────────────────────────
RAZEM:               €4.86/m (~21 PLN/m)
```

---

## ❓ **FAQ**

### **Q: Czy mogę zmienić plan później?**
A: TAK! W panelu kliknij "Resize" - 1 minuta downtime.

### **Q: Czy mogę anulować w każdej chwili?**
A: TAK! Płatność godzinowa, możesz usunąć serwer kiedy chcesz.

### **Q: Co jeśli coś pójdzie nie tak?**
A: Usuń serwer i stwórz nowy - płacisz tylko za użyte godziny.

### **Q: Czy backupy są konieczne?**
A: Nie, ale BARDZO rekomendowane. Możesz użyć darmowych snapshots.

### **Q: ARM64 vs x86 - co wybrać?**
A: CAX (ARM64) - tańszy, nowszy, wystarczający
   CPX (x86) - droższy, bardziej kompatybilny

---

## ✅ **CHECKLIST PRZED KLIKNIĘCIEM "UTWÓRZ"**

- [ ] Typ: CAX21 wybrany
- [ ] Lokalizacja: Falkenstein (fsn1)
- [ ] Obraz: Ubuntu 22.04
- [ ] IPv4: Zaznaczone
- [ ] IPv6: Zaznaczone
- [ ] SSH Key: Dodany (lub świadomy że dostanę hasło emailem)
- [ ] Backups: Zaznaczone (rekomendowane)
- [ ] Nazwa: "trichology-prod"
- [ ] Sprawdziłem cenę: €8.84/m

---

**Gotowy? Kliknij "Utwórz i kup teraz"!** 🚀

**Po utworzeniu serwera, wróć tutaj po dalsze instrukcje!**
