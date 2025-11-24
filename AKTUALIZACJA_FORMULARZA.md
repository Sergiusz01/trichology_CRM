# ✅ Aktualizacja formularza konsultacji zgodnie z kartą konsultacyjną

## Co zostało zaktualizowane:

### 1. Schemat Prisma (`backend/prisma/schema.prisma`)

#### Sekcja 1: WYPADANIE WŁOSÓW
- ✅ `hairLossSeverity` - Select: normie, nasilone, nadmierne, okresowe, brak
- ✅ `hairLossLocalization` - **Zmienione na Json** (Array): ciemieniowa, skronie, czołowa, tonsura, potylica, uogólnione, brwi_rzesy, pachy, pachwiny
- ✅ `hairLossDuration` - Select: 0-6 m-cy, 6-12 m-cy, 12-24 m-cy, powyżej roku
- ✅ `hairLossShampoos` - TextField
- ❌ Usunięto `hairLossNotes`

#### Sekcja 2: PRZETŁUSZCZANIE WŁOSÓW
- ✅ `oilyHairSeverity` - Select: normie, nasilone, nadmierne, okresowe, brak
- ✅ `oilyHairWashingFreq` - Select: codziennie, co 2,3 dni, raz w tygodniu
- ✅ `oilyHairDuration` - Select: 0-6 m-cy, 6-12 m-cy, 12-24 m-cy, powyżej roku
- ✅ `oilyHairShampoos` - TextField
- ❌ Usunięto `oilyHairNotes`

#### Sekcja 3: ŁUSZCZENIE SKÓRY GŁOWY
- ✅ `scalingSeverity` - Select: normie, nasilone, nadmierne, okresowe, brak
- ✅ `scalingType` - **Zmienione na Json** (Array): suchy, tłusty, miejscowy, uogólniony
- ✅ `scalingDuration` - Select: 0-6 m-cy, 6-12 m-cy, 12-24 m-cy, powyżej roku
- ✅ `scalingOther` - TextField (zamiast scalingNotes)

#### Sekcja 4: WRAŻLIWOŚĆ SKÓRY GŁOWY
- ✅ `sensitivitySeverity` - Select: normie, nasilone, nadmierne, okresowe, brak
- ✅ `sensitivityProblemType` - **Zmienione na Json** (Array): świąd, pieczenie, nadwrażliwość na preparaty, trichodynia
- ✅ `sensitivityDuration` - Select: 0-6 m-cy, 6-12 m-cy, 12-24 m-cy, powyżej roku
- ✅ `sensitivityOther` - TextField (zamiast sensitivityNotes)

#### Sekcja 5: STANY ZAPALNE/GRUDKI
- ✅ `inflammatoryStates` - TextField
- ❌ Usunięto `papules`

#### WYWIAD
- ✅ Dodano `dermatologyVisitsReason` - Powód wizyty u dermatologa
- ✅ Dodano `medicationsList` - Jakie leki
- ✅ Dodano `chronicDiseasesList` - Jakie choroby
- ✅ Dodano `specialistsList` - Jakiego specjalisty

#### TRICHOSKOPIA
- ✅ `scalpType` - **Zmienione na Json** (Array): sucha, tłusta, wrażliwa, nadreaktywna, z erytrodermią, normalna
- ✅ `scalpAppearance` - **Zmienione na Json** (Array): zaczerwienie, świąd, pieczenie, ból, suchość, łojotok
- ✅ `skinLesions` - **Zmienione na Json** (Array): plama, grudka, krosta, guzek, blizna, strup, pęknięcie, łuska, przeczos, złuszczanie płatowe, złuszczanie otrębiaste, obj. Kebnera
- ✅ `hyperhidrosis` - Select: miejscowa, uogólniona, brak
- ✅ `hyperkeratinization` - Select: miejscowa, uogólniona, okołomieszkowa, tubule, brak
- ✅ `sebaceousSecretion` - Select: oleista, zalegająca, brak
- ✅ `seborrheaType` - **Zmienione na Json** (Array)
- ✅ Dodano `seborrheaTypeOther` - Inne (tekst)
- ✅ `dandruffType` - **Zmienione na Json** (Array): Suchy, Tłusty, Kosmetyczny, miejscowy, uogólniony
- ✅ `scalpPH` - TextField (liczba)
- ✅ `hairDamage` - **Zmienione na Json** (Array): naturalne, fizyczne, mechaniczne, chemiczne
- ✅ `hairDamageReason` - **Zmienione na Json** (Array): trwała, trwałe prostowanie, farby/rozjaśnianie, lakier do włosów, produkty do stylizacji, prostownica/lokówka
- ✅ `hairQuality` - Select: zdrowe, suche, przetłuszczone, zniszczona łuska włosa
- ✅ `hairShape` - Select: prosty, kręcony, falisty, fil-fil
- ✅ `hairTypes` - **Zmienione na Json** (Array): urwane, kręte, paciorkowate, obrączkowate, tulipanowe, wykrzyknikowe
- ✅ `regrowingHairs` - Select: dużo, niewiele
- ✅ `vellusMiniaturizedHairs` - **Zmienione na Json** (Array): dużo, mało, uogólnione, miejscowo, brak
- ❌ Usunięto `scalpSymptoms`

#### DIAGNOSTYKA
- ✅ `vascularPatterns` - **Zmienione na Json** (Array): naczynia proste, naczynia poskręcane, naczynia drzewkowate, wzorzec plastra miodu, typ spinek, okołomieszkowe, miejscowe, rozlane
- ✅ `perifollicularFeatures` - **Zmienione na Json** (Array): white dots, yellow dots, black dots, prawidłowe
- ✅ `scalpDiseases` - **Zmienione na Json** (Array): ŁZS, LLP, AZS, grzybica, łuszczyca, zapalenia okołomieszkowe
- ✅ `otherDiagnostics` - **Zmienione na Json** (Array): trychodynia, plaster miodu, cofnięcie linii czołowej, trichokinesis
- ❌ Usunięto: `seborrheicDermatitis`, `LLP`, `AD`, `mycosis`, `psoriasis`, `trichodynia`, `hairlineRecession`, `trichokinesis` (zastąpione przez `scalpDiseases` i `otherDiagnostics`)

#### DIAGNOSTYKA ŁYSIENIA
- ✅ `alopeciaTypes` - **Zmienione na Json** (Array): androgenetic alopecia MAGA/AG, telogen efluvium TE, anagen efluvium AE, Alopecia aerata AA, folicularis decalvans/bliznowaciejące FD, trichotillomania TTM, trichodynia, Idiopatyczne skrócenie anagenu, łysienie starcze
- ✅ `degreeOfThinning` - Select: zanik, mało, miejscowo, dużo
- ✅ Dodano `alopeciaType` - Select: Androgenowe typu męskiego, Androgenowe typu żeńskiego, Plackowate AA, Telogenowe TE
- ✅ Dodano `alopeciaAffectedAreas` - **Json** (Array): Hormonozależny, Tył głowy, Cały obszar głowy, Inne
- ✅ `miniaturization` - Select: Występują, Nie występują
- ✅ `follicularUnits` - Select: Przewaga pojedynczych, Przewaga podwójnych, Przewaga potrójnych/poczwórnych, Występują puste mieszki włosowe
- ✅ `pullTest` - Select: dodatni TE/AE, ujemny AGA
- ❌ Usunięto `affectedAreas` (zastąpione przez `alopeciaAffectedAreas`)

#### ZALECENIA DO PIELĘGNACJI
- ✅ `careRecommendationsWashing` - preparaty do mycia
- ✅ `careRecommendationsTopical` - preparaty do wcierania
- ✅ `careRecommendationsSupplement` - suplementacja
- ✅ `careRecommendationsBehavior` - zmiany w pielęgnacji
- ❌ Usunięto: `careRecommendationsDiet`, `careRecommendationsOther`

### 2. Frontend (`frontend/src/pages/ConsultationFormPage.tsx`)

- ✅ Dodano komponent `MultiSelectCheckboxes` do obsługi pól wielokrotnego wyboru
- ✅ Zaktualizowano sekcję "Wypadanie włosów" z Select i MultiSelectCheckboxes
- ✅ Dodano funkcje `handleArrayChange` i `getArrayValue` do obsługi tablic JSON
- ✅ Zaktualizowano `fetchConsultation` do parsowania JSON z powrotem na tablice
- ✅ Zaktualizowano `handleSubmit` do konwersji tablic na JSON przed wysłaniem

### 3. Komponent pomocniczy (`frontend/src/components/MultiSelectCheckboxes.tsx`)

- ✅ Utworzono komponent do obsługi pól wielokrotnego wyboru z checkboxami

## ⚠️ Migracja bazy danych

**WAŻNE:** Przed zastosowaniem zmian w bazie danych, musisz:

1. **Utworzyć migrację ręcznie** lub użyć:
   ```powershell
   cd backend
   npx prisma migrate dev --name update_consultation_form_fields
   ```
   (Wymaga interakcji - potwierdź utratę danych w kolumnach `hairLossLocalization` i `scalingType`)

2. **Lub utworzyć migrację SQL ręcznie:**
   ```sql
   -- Zmiana typu kolumn na JSON
   ALTER TABLE "Consultation" 
   ALTER COLUMN "hairLossLocalization" TYPE jsonb USING "hairLossLocalization"::jsonb,
   ALTER COLUMN "scalingType" TYPE jsonb USING "scalingType"::jsonb,
   -- ... (dla wszystkich pól Json)
   ```

3. **Po migracji:**
   ```powershell
   npx prisma generate
   ```

## 📝 Następne kroki

1. ✅ Schemat Prisma zaktualizowany
2. ✅ Formularz częściowo zaktualizowany (sekcja Hair Loss)
3. ⚠️ **Pozostało:** Zaktualizować pozostałe sekcje formularza (Oily Hair, Scaling, Sensitivity, Trichoscopy, Diagnostics, Alopecia Diagnostics)
4. ⚠️ **Pozostało:** Zaktualizować walidację w backendzie (`backend/src/routes/consultations.ts`)
5. ⚠️ **Pozostało:** Zastosować migrację bazy danych

## 🔄 Jak kontynuować

1. Zaktualizuj pozostałe sekcje formularza używając tego samego wzorca co sekcja Hair Loss
2. Zaktualizuj walidację w backendzie, aby akceptowała pola Json
3. Zastosuj migrację bazy danych
4. Przetestuj formularz

