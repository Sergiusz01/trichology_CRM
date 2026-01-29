# Wymuszenie wyczyszczenia cache oraz HSTS (strona była na HTTPS, teraz HTTP)

Aplikacja działa **tylko po HTTP** (http://91.99.237.141). Urządzenia, które wcześniej odwiedzały ją po **HTTPS**, mogły zapisać:

- **HSTS** – przeglądarka „pamięta”, że ta strona wymaga HTTPS, i nadal próbuje łączyć się po https.
- **Cache** – zapisane przekierowania 301 (http→https) lub stara wersja strony.

## Co zrobiliśmy po stronie serwera

- Nginx ustawia nagłówki **no-cache** dla `/` i `/index.html`: `Cache-Control: no-store, no-cache, must-revalidate`, `Pragma: no-cache`, `Expires: 0`.
- W `index.html` dodane są meta tagi wymuszające brak cache.

Dzięki temu nowe odwiedziny nie będą trwale cachować strony. **Stary cache i HSTS** trzeba jednak wyczyścić **ręcznie na każdym urządzeniu**, które wcześniej używało HTTPS.

---

## Jak wyczyścić HSTS i cache na urządzeniach

### Chrome (Windows / macOS / Linux)

1. **HSTS:**  
   Wpisz w pasku adresu: `chrome://net-internals/#hsts`  
   → **Delete domain security policies**  
   → wpisz `91.99.237.141` → **Delete**.  
   To usuwa zapisaną regułę „wymagaj HTTPS” dla tego adresu.

2. **Cache:**  
   `Ctrl+Shift+Delete` (lub `Cmd+Shift+Delete` na Macu) → zaznacz np. **Obrazy i pliki w pamięci podręcznej** → **Usuń dane**.  
   Możesz też usunąć dane tylko dla `http://91.99.237.141`: **Ustawienia** → **Prywatność i bezpieczeństwo** → **Wyczyść dane przeglądania** → **Zaawansowane** → wybierz zakres czasu i **Pamięć podręczna**.

3. **Zamknij i uruchom przeglądarkę ponownie**, potem wejdź na **http://91.99.237.141**.

### Edge

1. **HSTS:**  
   Wpisz: `edge://net-internals/#hsts`  
   → **Delete domain security policies** → wpisz `91.99.237.141` → **Delete**.

2. **Cache:**  
   `Ctrl+Shift+Delete` → wybierz **Obrazy i pliki w pamięci podręcznej** → **Wyczyść teraz**.

3. **Zamknij Edge**, uruchom ponownie, wejdź na **http://91.99.237.141**.

### Firefox

1. **HSTS i cache dla tej strony:**  
   Wejdź na **http://91.99.237.141** (nawet jeśli nie działa).  
   Kliknij kłódkę w pasku adresu → **Wyczyść dane i ciasteczka** (lub **Zapomnij o tej witrynie**).  
   To usuwa m.in. HSTS i cache dla tego hosta.

2. **Albo globalnie:**  
   `Ctrl+Shift+Delete` → **Pamięć podręczna** → **Wyczyść teraz**.

3. **Zamknij Firefox**, uruchom ponownie, wejdź na **http://91.99.237.141**.

### Safari (macOS)

1. **Safari** → **Preferencje** → **Zaawansowane** → włącz **Pokaż menu Programowanie**.
2. **Programowanie** → **Pustej pamięci podręczne**.
3. **Safari** → **Wyczyść historię…** (opcjonalnie).
4. **Zamknij Safari**, uruchom ponownie, wejdź na **http://91.99.237.141**.

(Safari nie ma prostego UI do usuwania HSTS; wyczyszczenie cache i danych strony zwykle pomaga.)

### Telefon / tablet (Chrome Android, Safari iOS)

- **Android (Chrome):**  
  **Ustawienia** → **Aplikacje** → **Chrome** → **Pamięć** → **Wyczyść pamięć podręczną**.  
  Albo w Chrome: **⋮** → **Historia** → **Wyczyść dane przeglądania** → zaznacz **Obrazy i pliki w pamięci podręcznej**.

- **iOS (Safari):**  
  **Ustawienia** → **Safari** → **Wyczyść historię i dane witryn**.

Po wyczyszczeniu **nie wpisuj** `https://91.99.237.141` – używaj **http://91.99.237.141**.

---

## Skrót

| Cel | Działanie |
|-----|-----------|
| **Usunięcie HSTS** | Chrome/Edge: `.../net-internals/#hsts` → Delete domain `91.99.237.141`. Firefox: „Zapomnij o tej witrynie” dla tego adresu. |
| **Wyczyszczenie cache** | Wyczyść „Obrazy i pliki w pamięci podręcznej” (lub dane dla tej witryny). |
| **Wejście na stronę** | Zawsze **http://91.99.237.141** (bez „s” w http). |

Po wykonaniu tych kroków przeglądarka przestanie wymuszać HTTPS i nie będzie serwować starej, zapisanej wersji strony.
