"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedDefaultTemplate = seedDefaultTemplate;
exports.generateDefaultFields = generateDefaultFields;
const prisma_1 = require("../prisma");
async function seedDefaultTemplate() {
    try {
        // Get all doctors, prioritize Agnieszka Polańska
        const allDoctors = await prisma_1.prisma.user.findMany({
            where: { role: 'DOCTOR' },
        });
        // Find Agnieszka Polańska first
        let agnieszka = allDoctors.find(d => d.email === 'agnieszka.polanska@example.com');
        // If not found, get first doctor
        const doctors = agnieszka ? [agnieszka, ...allDoctors.filter(d => d.id !== agnieszka.id)] : allDoctors;
        if (doctors.length === 0) {
            console.error('Brak lekarza w bazie danych. Utwórz najpierw użytkownika z rolą DOCTOR.');
            return;
        }
        console.log(`Znaleziono ${doctors.length} lekarzy. Tworzenie szablonów dla wszystkich...`);
        // Create or update default template for each doctor
        for (const doctor of doctors) {
            const existing = await prisma_1.prisma.consultationTemplate.findFirst({
                where: {
                    doctorId: doctor.id,
                    isDefault: true,
                },
            });
            if (existing) {
                console.log(`Domyślny szablon dla lekarza ${doctor.name} (${doctor.email}) już istnieje. Aktualizuję...`);
                await prisma_1.prisma.consultationTemplate.update({
                    where: { id: existing.id },
                    data: {
                        name: 'Karta konsultacyjna (PDF)',
                        fields: generateDefaultFields(),
                    },
                });
                console.log(`✓ Szablon zaktualizowany dla ${doctor.name}`);
            }
            else {
                // Create default template for this doctor
                await prisma_1.prisma.consultationTemplate.create({
                    data: {
                        name: 'Karta konsultacyjna (PDF)',
                        doctorId: doctor.id,
                        fields: generateDefaultFields(),
                        isDefault: true,
                        isActive: true,
                    },
                });
                console.log(`✓ Domyślny szablon utworzony dla ${doctor.name}`);
            }
        }
        console.log('✓ Wszystkie szablony utworzone/zaktualizowane');
    }
    catch (error) {
        console.error('Błąd tworzenia szablonu:', error);
        throw error;
    }
    finally {
        await prisma_1.prisma.$disconnect();
    }
}
function generateLegacyFields() {
    const fields = [];
    let order = 0;
    const add = (field) => {
        fields.push({ ...field, order: order++ });
    };
    add({ type: 'SECTION', label: 'PROBLEM', key: 'section_problem', required: false });
    add({ type: 'SUBSECTION', label: '1. WYPADANIE WŁOSÓW:', key: 'subsection_hair_loss', required: false });
    add({ type: 'SELECT', label: 'Nasilenie', key: 'hairLossSeverity', required: false, options: ['normie', 'nasilone', 'nadmierne', 'okresowe', 'brak'] });
    add({ type: 'MULTISELECT', label: 'Lokalizacja', key: 'hairLossLocalization', required: false, options: ['ciemieniowa', 'skronie', 'czołowa', 'tonsura', 'potylica', 'uogólnione', 'brwi, rzęsy', 'pachy', 'pachwiny'] });
    add({ type: 'SELECT', label: 'Czas trwania', key: 'hairLossDuration', required: false, options: ['0-6 m-cy', '6-12 m-cy', '12-24 m-cy', 'powyżej roku'] });
    add({ type: 'TEXTAREA', label: 'Szampony', key: 'hairLossShampoos', required: false, placeholder: 'Szampony' });
    add({ type: 'TEXTAREA', label: 'Komentarz lekarza', key: 'hairLossComment', required: false });
    add({ type: 'SUBSECTION', label: '2. PRZETŁUSZCZANIE WŁOSÓW:', key: 'subsection_oily_hair', required: false });
    add({ type: 'SELECT', label: 'Nasilenie', key: 'oilyHairSeverity', required: false, options: ['normie', 'nasilone', 'nadmierne', 'okresowe', 'brak'] });
    add({ type: 'SELECT', label: 'Częstotliwość mycia', key: 'oilyHairWashingFreq', required: false, options: ['codziennie', 'co 2,3 dni', 'raz w tygodniu'] });
    add({ type: 'SELECT', label: 'Czas trwania', key: 'oilyHairDuration', required: false, options: ['0-6 m-cy', '6-12 m-cy', '12-24 m-cy', 'powyżej roku'] });
    add({ type: 'TEXTAREA', label: 'Szampony', key: 'oilyHairShampoos', required: false, placeholder: 'Szampony' });
    add({ type: 'TEXTAREA', label: 'Komentarz lekarza', key: 'oilyHairComment', required: false });
    add({ type: 'SUBSECTION', label: '3. ŁUSZCZENIE SKÓRY GŁOWY:', key: 'subsection_scaling', required: false });
    add({ type: 'SELECT', label: 'Nasilenie', key: 'scalingSeverity', required: false, options: ['normie', 'nasilone', 'nadmierne', 'okresowe', 'brak'] });
    add({ type: 'MULTISELECT', label: 'Rodzaj', key: 'scalingType', required: false, options: ['suchy', 'tłusty', 'miejscowy', 'uogólniony'] });
    add({ type: 'SELECT', label: 'Czas trwania', key: 'scalingDuration', required: false, options: ['0-6 m-cy', '6-12 m-cy', '12-24 m-cy', 'powyżej roku'] });
    add({ type: 'TEXTAREA', label: 'Inne', key: 'scalingOther', required: false, placeholder: 'Inne' });
    add({ type: 'TEXTAREA', label: 'Komentarz lekarza', key: 'scalingComment', required: false });
    add({ type: 'SUBSECTION', label: '4. WRAŻLIWOŚĆ SKÓRY GŁOWY:', key: 'subsection_sensitivity', required: false });
    add({ type: 'SELECT', label: 'Nasilenie', key: 'sensitivitySeverity', required: false, options: ['normie', 'nasilone', 'nadmierne', 'okresowe', 'brak'] });
    add({ type: 'MULTISELECT', label: 'Rodzaj problemu', key: 'sensitivityProblemType', required: false, options: ['świąd', 'pieczenie', 'nadwrażliwość na preparaty', 'trichodynia'] });
    add({ type: 'SELECT', label: 'Czas trwania', key: 'sensitivityDuration', required: false, options: ['0-6 m-cy', '6-12 m-cy', '12-24 m-cy', 'powyżej roku'] });
    add({ type: 'TEXTAREA', label: 'Inne', key: 'sensitivityOther', required: false, placeholder: 'Inne' });
    add({ type: 'TEXTAREA', label: 'Komentarz lekarza', key: 'sensitivityComment', required: false });
    add({ type: 'TEXTAREA', label: '5. STANY ZAPALNE/ GRUDKI', key: 'inflammatoryStates', required: false });
    add({ type: 'TEXTAREA', label: 'Komentarz lekarza', key: 'inflammatoryComment', required: false });
    add({ type: 'TEXTAREA', label: 'Komentarz lekarza', key: 'problemComment', required: false });
    add({ type: 'SECTION', label: 'WYWIAD', key: 'section_anamnesis', required: false });
    add({ type: 'SELECT', label: '1. Czy dany problem występuje u innych członków rodziny?', key: 'familyHistory', required: false, options: ['tak', 'nie'] });
    add({ type: 'SELECT', label: '2. Czy była konieczna wizyta u dermatologa?', key: 'dermatologyVisits', required: false, options: ['tak', 'nie'] });
    add({ type: 'TEXTAREA', label: 'Powód', key: 'dermatologyVisitsReason', required: false });
    add({ type: 'SELECT', label: '3. Czy jest Pani w ciąży?', key: 'pregnancy', required: false, options: ['tak', 'nie'] });
    add({ type: 'SELECT', label: '4. Czy miesiączkuje regularnie?', key: 'menstruationRegularity', required: false, options: ['tak', 'nie'] });
    add({ type: 'TEXTAREA', label: 'Antykoncepcja hormonalna', key: 'contraception', required: false });
    add({ type: 'SELECT', label: '5. Czy zażywa Pan/Pani jakieś leki?', key: 'medications', required: false, options: ['tak', 'nie'] });
    add({ type: 'TEXTAREA', label: 'jakie', key: 'medicationsList', required: false });
    add({ type: 'TEXTAREA', label: '6. Czy stosuje Pani/ Pan suplementy?', key: 'supplements', required: false });
    add({ type: 'SELECT', label: '7. Poziom stresu w życiu codziennym?', key: 'stressLevel', required: false, options: ['duży', 'mały', 'średni'] });
    add({ type: 'MULTISELECT', label: '8. Czy w ostatnim czasie była Pani/Pan poddana:', key: 'recentProcedures', required: false, options: ['narkozie', 'chemioterapii', 'radioterapii', 'szczepieniu', 'antybiotyki'] });
    add({ type: 'TEXTAREA', label: 'antybiotyki', key: 'antibioticsDetails', required: false });
    add({ type: 'SELECT', label: '9. Czy choruje Pani/Pan na choroby przewlekłe:', key: 'chronicDiseases', required: false, options: ['tak', 'nie'] });
    add({ type: 'TEXTAREA', label: 'jakie', key: 'chronicDiseasesList', required: false });
    add({ type: 'SELECT', label: '10. Czy jest Pani/Pan pod opieką specjalisty:', key: 'specialists', required: false, options: ['tak', 'nie'] });
    add({ type: 'TEXTAREA', label: 'jakiego', key: 'specialistsList', required: false });
    add({ type: 'SELECT', label: '11. Czy występują u Pani/Pana zaburzenia odżywiania/wchłaniania:', key: 'eatingDisorders', required: false, options: ['tak', 'nie'] });
    add({ type: 'TEXTAREA', label: 'Nietolerancje pokarmowe', key: 'foodIntolerances', required: false });
    add({ type: 'SELECT', label: '12. Czy w ostatnim czasie była Pani/Pan na diecie:', key: 'diet', required: false, options: ['tak', 'nie'] });
    add({ type: 'SELECT', label: '13. Czy występuje u Pani/Pana alergia lub uczulenie na jakieś substancje:', key: 'allergies', required: false, options: ['tak', 'nie'] });
    add({ type: 'SELECT', label: '14. Czy ma Pani/Pan jakieś części metalowe w organizmie:', key: 'metalPartsInBody', required: false, options: ['tak', 'nie'] });
    add({ type: 'SUBSECTION', label: '15. Jak pielęgnuje Pani/Pan skórę głowy i włosy:', key: 'subsection_care_routine', required: false });
    add({ type: 'TEXTAREA', label: 'Szampon', key: 'careRoutineShampoo', required: false });
    add({ type: 'TEXTAREA', label: 'Odżywka/maska', key: 'careRoutineConditioner', required: false });
    add({ type: 'TEXTAREA', label: 'Wcierki/oleje', key: 'careRoutineOils', required: false });
    add({ type: 'TEXTAREA', label: 'Zabiegi chemiczne/termiczne', key: 'careRoutineChemical', required: false });
    add({ type: 'TEXTAREA', label: 'Komentarz lekarza', key: 'anamnesisComment', required: false });
    add({ type: 'SECTION', label: 'TRICHOSKOPIA', key: 'section_trichoscopy', required: false });
    add({ type: 'MULTISELECT', label: 'TYP SKÓRY GŁOWY', key: 'scalpType', required: false, options: ['sucha', 'tłusta', 'wrażliwa', 'nadreaktywna', 'z erytrodermią', 'normalna'] });
    add({ type: 'MULTISELECT', label: 'WYGLĄD I OBJAWY NA SKÓRZE', key: 'scalpAppearance', required: false, options: ['zaczerwienie', 'świąd', 'pieczenie', 'ból', 'suchość', 'łojotok'] });
    add({ type: 'MULTISELECT', label: 'WYKWITY SKÓRNE', key: 'skinLesions', required: false, options: ['plama', 'grudka', 'krosta', 'guzek', 'blizna', 'strup', 'pęknięcie', 'łuska', 'przeczos', 'złuszczanie płatowe', 'złuszczanie otrębiaste', 'obj. Kebnera'] });
    add({ type: 'SELECT', label: 'HIPERHYDROZA', key: 'hyperhidrosis', required: false, options: ['miejcowa', 'uogólniona', 'brak'] });
    add({ type: 'SELECT', label: 'HIPERKERATYNIZACJA', key: 'hyperkeratinization', required: false, options: ['miejscowa', 'uogólniona', 'okołomieszkowa', 'tubule', 'brak'] });
    add({ type: 'SELECT', label: 'WYDZIELINA G. ŁOJOWYCH', key: 'sebaceousSecretion', required: false, options: ['oleista', 'zalegająca', 'brak'] });
    add({ type: 'MULTISELECT', label: 'INTERPRETACJA RODZAJU ŁOJOTOKU', key: 'seborrheaType', required: false, options: ['Skóra sucha, odwodniona / Cebulka tłusta', 'Skóra tłusta / Cebulka tłusta', 'Hiperhydroza / Cebulka tłusta', 'Skóra tłusta / Cebulka dystroficzna', 'Łojotok / Wypadanie włosów'] });
    add({ type: 'TEXTAREA', label: 'Inne', key: 'seborrheaTypeOther', required: false });
    add({ type: 'MULTISELECT', label: 'ŁUPIEŻ', key: 'dandruffType', required: false, options: ['Suchy', 'Tłusty', 'Kosmetyczny', 'miejscowy', 'uogólniony'] });
    add({ type: 'TEXT', label: 'WARTOŚĆ pH', key: 'scalpPH', required: false });
    add({ type: 'SUBSECTION', label: 'OCENA STANU WŁOSÓW', key: 'subsection_hair_assessment', required: false });
    add({ type: 'MULTISELECT', label: 'USZKODZENIA WŁOSA', key: 'hairDamage', required: false, options: ['naturalne', 'fizyczne', 'mechaniczne', 'chemiczne'] });
    add({ type: 'MULTISELECT', label: 'POWODY USZKODZENIA', key: 'hairDamageReason', required: false, options: ['trwała', 'trwałe prostowanie', 'farby/rozjaśnianie', 'lakier do włosów', 'produkty do stylizacji', 'prostownica/lokówka'] });
    add({ type: 'SELECT', label: 'JAKOŚĆ WŁOSA', key: 'hairQuality', required: false, options: ['zdrowe', 'suche', 'przetłuszczone', 'zniszczona łuska włosa'] });
    add({ type: 'SELECT', label: 'KSZTAŁT WŁOSA', key: 'hairShape', required: false, options: ['prosty', 'kręcony', 'falisty', 'fil-fil'] });
    add({ type: 'MULTISELECT', label: 'RODZAJE WŁOSÓW', key: 'hairTypes', required: false, options: ['urwane', 'kręte', 'paciorkowate', 'obrączkowate', 'tulipanowe', 'wykrzyknikowe'] });
    add({ type: 'SELECT', label: 'WŁOSY NASTĘPOWE', key: 'regrowingHairs', required: false, options: ['dużo', 'niewiele'] });
    add({ type: 'MULTISELECT', label: 'WŁOSY VELLUS/ ZMINIATURYZOWANE', key: 'vellusMiniaturizedHairs', required: false, options: ['dużo', 'mało', 'uogólnione', 'miejscowo', 'brak'] });
    add({ type: 'SUBSECTION', label: 'DIAGNOSTYKA', key: 'subsection_diagnostics', required: false });
    add({ type: 'MULTISELECT', label: 'UNACZYNIENIE', key: 'vascularPatterns', required: false, options: ['naczynia proste', 'naczynia poskręcane', 'naczynia drzewkowate', 'wzorzec plastra miodu', 'typ spinek', 'okołomieszkowe', 'miejscowe', 'rozlane'] });
    add({ type: 'MULTISELECT', label: 'CECHY OKOŁO MIESZKOWE', key: 'perifollicularFeatures', required: false, options: ['white dots', 'yellow dots', 'black dots', 'prawidłowe'] });
    add({ type: 'MULTISELECT', label: 'CHOROBY SKÓRY GŁOWY', key: 'scalpDiseases', required: false, options: ['ŁZS', 'LLP', 'AZS', 'grzybica', 'łuszczyca', 'zapalenia okołomieszkowe'] });
    add({ type: 'MULTISELECT', label: 'INNE', key: 'otherDiagnostics', required: false, options: ['trychodynia', 'plaster miodu', 'cofnięcie linii czołowej', 'trichokinesis'] });
    add({ type: 'TEXTAREA', label: 'Komentarz lekarza', key: 'trichoscopyComment', required: false });
    add({ type: 'SECTION', label: 'DIAGNOSTYKA LABORATORYJNA', key: 'section_lab_diagnostics', required: false });
    add({ type: 'DATE', label: 'Data', key: 'labDiagnosticsDate', required: false });
    add({ type: 'TEXTAREA', label: 'MORFOLOGIA', key: 'labMorphology', required: false });
    add({ type: 'TEXT', label: 'OB', key: 'labOb', required: false });
    add({ type: 'TEXT', label: 'CRP', key: 'labCrp', required: false });
    add({ type: 'TEXT', label: 'FE', key: 'labFe', required: false });
    add({ type: 'TEXT', label: 'kw.foliowy', key: 'labFolic', required: false });
    add({ type: 'TEXT', label: 'ferrytyna( magazn. 4 tys. cząsteczek Fe)', key: 'labFerritin', required: false });
    add({ type: 'TEXT', label: 'Transferryna( białko transp. Fe z krwi do tk.)', key: 'labTransferrin', required: false });
    add({ type: 'TEXT', label: 'Wit. B12', key: 'labB12', required: false });
    add({ type: 'TEXT', label: 'Homocysteina', key: 'labHomocysteine', required: false });
    add({ type: 'TEXT', label: 'Wit. 1,25(OH)2D3', key: 'labD3', required: false });
    add({ type: 'TEXT', label: 'Elektrolity: Na', key: 'labNa', required: false });
    add({ type: 'TEXT', label: 'K', key: 'labK', required: false });
    add({ type: 'TEXT', label: 'Mg', key: 'labMg', required: false });
    add({ type: 'TEXT', label: 'Zn', key: 'labZn', required: false });
    add({ type: 'TEXT', label: 'Se', key: 'labSe', required: false });
    add({ type: 'TEXT', label: 'AST', key: 'labAst', required: false });
    add({ type: 'TEXT', label: 'ALT', key: 'labAlt', required: false });
    add({ type: 'TEXT', label: 'Cholesterol całkowity', key: 'labCholesterol', required: false });
    add({ type: 'TEXT', label: 'TG', key: 'labTg', required: false });
    add({ type: 'TEXT', label: 'TSH', key: 'labTsh', required: false });
    add({ type: 'TEXT', label: 'fT3', key: 'labFt3', required: false });
    add({ type: 'TEXT', label: 'fT4', key: 'labFt4', required: false });
    add({ type: 'TEXT', label: 'TG( marker raka tarczycy)', key: 'labTgMarker', required: false });
    add({ type: 'TEXT', label: 'ANTY TPO( p/ciała p/peroksydazie tarczycowej)', key: 'labAntiTpo', required: false });
    add({ type: 'TEXT', label: 'ANTY TG ( p/ciała p/tyreoglobulinie)', key: 'labAntiTg', required: false });
    add({ type: 'TEXT', label: 'TRAB( p/receptorowi TSH)', key: 'labTrab', required: false });
    add({ type: 'TEXT', label: 'TSI ( p/receptorowi TSH- ch.G-B)', key: 'labTsi', required: false });
    add({ type: 'TEXT', label: 'LH(3 dzień)', key: 'labLh', required: false });
    add({ type: 'TEXT', label: 'FSH', key: 'labFsh', required: false });
    add({ type: 'TEXT', label: 'ESTRADIOL(3 dzień)', key: 'labEstradiol', required: false });
    add({ type: 'TEXT', label: 'PROGESTERON( 22 dzień)', key: 'labProgesterone', required: false });
    add({ type: 'TEXT', label: 'PROLAKTYNA(na czczo)', key: 'labProlactin', required: false });
    add({ type: 'TEXT', label: 'ANDROSTENDION', key: 'labAndrostendion', required: false });
    add({ type: 'TEXT', label: 'S-DHEA', key: 'labSdhea', required: false });
    add({ type: 'TEXT', label: 'TESTOSTERON całkowity', key: 'labTestosterone', required: false });
    add({ type: 'TEXT', label: 'DHT', key: 'labDht', required: false });
    add({ type: 'TEXT', label: 'SHGB', key: 'labShgb', required: false });
    add({ type: 'TEXT', label: 'KORTYZOL', key: 'labCortisol', required: false });
    add({ type: 'TEXT', label: 'ANA-1', key: 'labAna1', required: false });
    add({ type: 'TEXT', label: 'ANA-2', key: 'labAna2', required: false });
    add({ type: 'TEXT', label: 'Helikobakter Pylorii', key: 'labHelicobacter', required: false });
    add({ type: 'TEXT', label: 'Glukoza', key: 'labGlucose', required: false });
    add({ type: 'TEXT', label: 'HbA1c', key: 'labHba1c', required: false });
    add({ type: 'TEXT', label: 'Insulina', key: 'labInsulin', required: false });
    add({ type: 'TEXT', label: 'Candida albicans', key: 'labCandida', required: false });
    add({ type: 'TEXT', label: 'Histamina', key: 'labHistamine', required: false });
    add({ type: 'TEXT', label: 'Pasożyty', key: 'labParasites', required: false });
    add({ type: 'TEXT', label: 'BARWA ŚWIECENIA W LAMPIE WOOD’A', key: 'labWoodLamp', required: false });
    add({ type: 'TEXT', label: 'Demodex', key: 'labDemodex', required: false });
    add({ type: 'TEXTAREA', label: 'Badanie mykologiczne', key: 'labMycology', required: false });
    add({ type: 'TEXTAREA', label: 'Badanie mikrobiologiczne', key: 'labMicrobiology', required: false });
    add({ type: 'TEXTAREA', label: 'Komentarz lekarza', key: 'labDiagnosticsComment', required: false });
    add({ type: 'SECTION', label: 'DIAGNOSTYKA ŁYSIENIA', key: 'section_alopecia', required: false });
    add({ type: 'MULTISELECT', label: 'ŁYSIENIE', key: 'alopeciaTypes', required: false, options: ['androgenetic alopecia MAGA, AG', 'telogen efluvium TE', 'anagen efluvium AE', 'Alopecia aerata AA', 'folicularis decalvans/bliznowaciejące FD', 'trichotillomania TTM', 'trichodynia', 'Idiopatyczne skrócenie anagenu', 'łysienie starcze'] });
    add({ type: 'SELECT', label: 'STOPIEŃ PRZERZEDZENIA', key: 'degreeOfThinning', required: false, options: ['zanik', 'mało', 'miejscowo', 'dużo'] });
    add({ type: 'SUBSECTION', label: 'TYP ŁYSIENIA / OBSZAR / WYPADANIE WŁOSÓW', key: 'subsection_alopecia_area', required: false });
    add({ type: 'MULTISELECT', label: 'TYP ŁYSIENIA', key: 'alopeciaType', required: false, options: ['Androgenowe typu męskiego', 'Androgenowe typu żeńskiego', 'Plackowate AA', 'Telogenowe TE'] });
    add({ type: 'MULTISELECT', label: 'OBSZAR', key: 'alopeciaAffectedAreas', required: false, options: ['Hormonozależny', 'Tył głowy', 'Cały obszar głowy', 'Inne'] });
    add({ type: 'TEXTAREA', label: 'WYPADANIE WŁOSÓW', key: 'alopeciaHairLoss', required: false });
    add({ type: 'MULTISELECT', label: 'CECHY MINIATURYZACJI MIESZKÓW', key: 'miniaturization', required: false, options: ['Menopauzalne', 'Tarczycowe', 'Sezonowe', 'Łojotokowe', 'Żywieniowe', 'Psychosomatyczne', 'Jatrogenne', 'Bliznowaciejące', 'Choroby skóry głowy', 'Inne'] });
    add({ type: 'SELECT', label: 'Występują / Nie występują', key: 'miniaturizationPresence', required: false, options: ['Występują', 'Nie występują'] });
    add({ type: 'MULTISELECT', label: 'ZESPOŁY MIESZKOWE', key: 'follicularUnits', required: false, options: ['Przewaga pojedynczych', 'Przewaga podwójnych', 'Przewaga potrójnych, poczwórnych', 'Występują puste mieszki włosowe'] });
    add({ type: 'SELECT', label: 'PULL TEST', key: 'pullTest', required: false, options: ['dodatni TE/AE', 'ujemny AGA'] });
    add({ type: 'TEXTAREA', label: 'ROZPOZNANIE', key: 'diagnosis', required: false });
    add({ type: 'SUBSECTION', label: 'ZALECENIA DO PIELĘGNACJI', key: 'subsection_recommendations', required: false });
    add({ type: 'TEXTAREA', label: 'preparaty do mycia', key: 'careRecommendationsWashing', required: false });
    add({ type: 'TEXTAREA', label: 'preparaty do wcierania', key: 'careRecommendationsTopical', required: false });
    add({ type: 'TEXTAREA', label: 'suplementacja', key: 'careRecommendationsSupplement', required: false });
    add({ type: 'TEXTAREA', label: 'zmiany w pielęgnacji', key: 'careRecommendationsBehavior', required: false });
    add({ type: 'TEXTAREA', label: 'Komentarz lekarza', key: 'alopeciaComment', required: false });
    add({ type: 'TEXTAREA', label: 'Komentarz lekarza', key: 'recommendationsComment', required: false });
    add({ type: 'SECTION', label: 'WIZYTY/ZABIEGI', key: 'section_visits', required: false });
    add({ type: 'TEXTAREA', label: 'WIZYTY/ZABIEGI', key: 'visitsProcedures', required: false });
    add({ type: 'TEXTAREA', label: 'Komentarz lekarza', key: 'visitsComment', required: false });
    add({ type: 'SECTION', label: 'UWAGI', key: 'section_remarks', required: false });
    add({ type: 'TEXTAREA', label: 'UWAGI', key: 'generalRemarks', required: false });
    add({ type: 'TEXTAREA', label: 'Komentarz lekarza', key: 'remarksComment', required: false });
    add({ type: 'SECTION', label: 'SKALA NORWOODA- HAMILTONA', key: 'section_norwood_scale', required: false });
    add({
        type: 'IMAGE_SELECT',
        label: 'Wybierz stopień',
        key: 'norwoodScale',
        required: false,
        options: ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'],
    });
    add({ type: 'SECTION', label: 'SKALA M. LUDWIGA', key: 'section_ludwig_scale', required: false });
    add({
        type: 'IMAGE_SELECT',
        label: 'Wybierz stopień',
        key: 'ludwigScale',
        required: false,
        options: ['I', 'II', 'III'],
    });
    return fields;
}
function generateDefaultFields() {
    const fields = [];
    let order = 0;
    // 1. WYPADANIE WŁOSÓW
    fields.push({
        type: 'SELECT',
        label: 'Nasilenie wypadania włosów',
        key: 'hairLossSeverity',
        required: false,
        options: ['Brak', 'W normie', 'Nasilone', 'Nadmierne', 'Okresowe'],
        order: order++,
    }, {
        type: 'SELECT',
        label: 'Czas trwania wypadania włosów',
        key: 'hairLossDuration',
        required: false,
        options: ['Brak', '0-6 m-cy', '6-12 m-cy', '12-24 m-cy', 'Powyżej roku'],
        order: order++,
    }, {
        type: 'MULTISELECT',
        label: 'Lokalizacja wypadania włosów',
        key: 'hairLossLocalization',
        required: false,
        options: [
            'ciemieniowa',
            'skronie',
            'czołowa',
            'tonsura',
            'potylica',
            'uogólnione',
            'brwi, rzęsy',
            'pachy',
            'pachwiny',
        ],
        order: order++,
    }, {
        type: 'TEXTAREA',
        label: 'Uwagi',
        key: 'hairLossNotes',
        required: false,
        placeholder: 'Dodatkowe uwagi',
        order: order++,
    }, {
        type: 'TEXTAREA',
        label: 'Używane szampony (wypadanie włosów)',
        key: 'hairLossShampoos',
        required: false,
        placeholder: 'Wpisz używane szampony',
        order: order++,
    });
    // 2. PRZETŁUSZCZANIE WŁOSÓW
    fields.push({
        type: 'SELECT',
        label: 'Nasilenie przetłuszczania',
        key: 'oilyHairSeverity',
        required: false,
        options: ['Brak', 'W normie', 'Nasilone', 'Nadmierne', 'Okresowe'],
        order: order++,
    }, {
        type: 'SELECT',
        label: 'Częstotliwość mycia',
        key: 'oilyHairWashingFreq',
        required: false,
        options: ['Brak', 'Codziennie', 'Co 2,3 dni', 'Raz w tygodniu'],
        order: order++,
    }, {
        type: 'SELECT',
        label: 'Czas trwania przetłuszczania',
        key: 'oilyHairDuration',
        required: false,
        options: ['Brak', '0-6 m-cy', '6-12 m-cy', '12-24 m-cy', 'Powyżej roku'],
        order: order++,
    }, {
        type: 'TEXTAREA',
        label: 'Używane szampony (przetłuszczanie)',
        key: 'oilyHairShampoos',
        required: false,
        placeholder: 'Wpisz używane szampony',
        order: order++,
    });
    fields.push({
        type: 'TEXTAREA',
        label: 'Uwagi',
        key: 'oilyHairNotes',
        required: false,
        placeholder: 'Dodatkowe uwagi',
        order: order++,
    });
    // 3. ŁUSZCZENIE SKÓRY GŁOWY
    fields.push({
        type: 'SELECT',
        label: 'Nasilenie łuszczenia',
        key: 'scalingSeverity',
        required: false,
        options: ['Brak', 'W normie', 'Nasilone', 'Nadmierne', 'Okresowe'],
        order: order++,
    }, {
        type: 'SELECT',
        label: 'Czas trwania łuszczenia',
        key: 'scalingDuration',
        required: false,
        options: ['Brak', '0-6 m-cy', '6-12 m-cy', '12-24 m-cy', 'Powyżej roku'],
        order: order++,
    }, {
        type: 'MULTISELECT',
        label: 'Typ łuszczenia',
        key: 'scalingType',
        required: false,
        options: [
            'Drobne, białe',
            'Duże, żółte',
            'Tłuste',
            'Suche',
            'Zapalne',
            'Inne',
        ],
        order: order++,
    }, {
        type: 'TEXT',
        label: 'Inne (łuszczenie)',
        key: 'scalingOther',
        required: false,
        placeholder: 'Opisz inne objawy',
        order: order++,
    });
    // 4. WRAŻLIWOŚĆ SKÓRY GŁOWY
    fields.push({
        type: 'SELECT',
        label: 'Nasilenie wrażliwości',
        key: 'sensitivitySeverity',
        required: false,
        options: ['Brak', 'W normie', 'Nasilone', 'Nadmierne', 'Okresowe'],
        order: order++,
    }, {
        type: 'SELECT',
        label: 'Czas trwania wrażliwości',
        key: 'sensitivityDuration',
        required: false,
        options: ['Brak', '0-6 m-cy', '6-12 m-cy', '12-24 m-cy', 'Powyżej roku'],
        order: order++,
    }, {
        type: 'MULTISELECT',
        label: 'Typ problemu wrażliwości',
        key: 'sensitivityProblemType',
        required: false,
        options: [
            'Świąd',
            'Pieczenie',
            'Ból',
            'Mrowienie',
            'Nadwrażliwość na dotyk',
            'Inne',
        ],
        order: order++,
    }, {
        type: 'TEXT',
        label: 'Inne (wrażliwość)',
        key: 'sensitivityOther',
        required: false,
        placeholder: 'Opisz inne objawy',
        order: order++,
    });
    // 5. STANY ZAPALNE/GRUDKI
    fields.push({
        type: 'TEXTAREA',
        label: 'Stany zapalne/grudki',
        key: 'inflammatoryStates',
        required: false,
        placeholder: 'Opisz stany zapalne i grudki',
        order: order++,
    });
    // WYWIAD
    fields.push({
        type: 'TEXTAREA',
        label: 'Historia rodzinna',
        key: 'familyHistory',
        required: false,
        placeholder: 'Opisz historię rodzinną',
        order: order++,
    }, {
        type: 'SELECT',
        label: 'Wizyty u dermatologa',
        key: 'dermatologyVisits',
        required: false,
        options: ['Tak', 'Nie'],
        order: order++,
    }, {
        type: 'TEXT',
        label: 'Powód wizyt u dermatologa',
        key: 'dermatologyVisitsReason',
        required: false,
        placeholder: 'Opisz powód wizyt',
        order: order++,
    }, {
        type: 'SELECT',
        label: 'Ciąża',
        key: 'pregnancy',
        required: false,
        options: ['Tak', 'Nie', 'Nie dotyczy'],
        order: order++,
    }, {
        type: 'SELECT',
        label: 'Regularność miesiączki',
        key: 'menstruationRegularity',
        required: false,
        options: ['Regularna', 'Nieregularna', 'Nie dotyczy'],
        order: order++,
    }, {
        type: 'SELECT',
        label: 'Antykoncepcja',
        key: 'contraception',
        required: false,
        options: ['Tak', 'Nie', 'Nie dotyczy'],
        order: order++,
    }, {
        type: 'SELECT',
        label: 'Leki',
        key: 'medications',
        required: false,
        options: ['Tak', 'Nie'],
        order: order++,
    }, {
        type: 'TEXTAREA',
        label: 'Lista leków',
        key: 'medicationsList',
        required: false,
        placeholder: 'Wymień przyjmowane leki',
        order: order++,
    }, {
        type: 'SELECT',
        label: 'Suplementy',
        key: 'supplements',
        required: false,
        options: ['Tak', 'Nie'],
        order: order++,
    }, {
        type: 'TEXTAREA',
        label: 'Jakie suplementy?',
        key: 'supplementsDetails',
        required: false,
        placeholder: 'Wymień suplementy i dawki',
        order: order++,
    }, {
        type: 'SELECT',
        label: 'Poziom stresu',
        key: 'stressLevel',
        required: false,
        options: ['Niski', 'Średni', 'Wysoki', 'Bardzo wysoki'],
        order: order++,
    }, {
        type: 'SELECT',
        label: 'Znieczulenie',
        key: 'anesthesia',
        required: false,
        options: ['Tak', 'Nie'],
        order: order++,
    }, {
        type: 'SELECT',
        label: 'Chemioterapia',
        key: 'chemotherapy',
        required: false,
        options: ['Tak', 'Nie'],
        order: order++,
    }, {
        type: 'SELECT',
        label: 'Radioterapia',
        key: 'radiotherapy',
        required: false,
        options: ['Tak', 'Nie'],
        order: order++,
    }, {
        type: 'SELECT',
        label: 'Szczepienia',
        key: 'vaccination',
        required: false,
        options: ['Tak', 'Nie'],
        order: order++,
    }, {
        type: 'SELECT',
        label: 'Antybiotyki',
        key: 'antibiotics',
        required: false,
        options: ['Tak', 'Nie'],
        order: order++,
    }, {
        type: 'TEXTAREA',
        label: 'Jakie antybiotyki? / kiedy?',
        key: 'antibioticsDetails',
        required: false,
        placeholder: 'Wymień antybiotyki i terminy',
        order: order++,
    }, {
        type: 'SELECT',
        label: 'Choroby przewlekłe',
        key: 'chronicDiseases',
        required: false,
        options: ['Tak', 'Nie'],
        order: order++,
    }, {
        type: 'TEXTAREA',
        label: 'Lista chorób przewlekłych',
        key: 'chronicDiseasesList',
        required: false,
        placeholder: 'Wymień choroby przewlekłe',
        order: order++,
    }, {
        type: 'TEXTAREA',
        label: 'Specjaliści',
        key: 'specialists',
        required: false,
        placeholder: 'Wymień konsultowanych specjalistów',
        order: order++,
    }, {
        type: 'TEXTAREA',
        label: 'Lista specjalistów',
        key: 'specialistsList',
        required: false,
        placeholder: 'Szczegóły',
        order: order++,
    }, {
        type: 'SELECT',
        label: 'Zaburzenia odżywiania',
        key: 'eatingDisorders',
        required: false,
        options: ['Tak', 'Nie'],
        order: order++,
    }, {
        type: 'TEXTAREA',
        label: 'Nietolerancje pokarmowe',
        key: 'foodIntolerances',
        required: false,
        placeholder: 'Opisz nietolerancje',
        order: order++,
    }, {
        type: 'TEXTAREA',
        label: 'Dieta',
        key: 'diet',
        required: false,
        placeholder: 'Opisz dietę',
        order: order++,
    }, {
        type: 'TEXTAREA',
        label: 'Alergie',
        key: 'allergies',
        required: false,
        placeholder: 'Wymień alergie',
        order: order++,
    }, {
        type: 'SELECT',
        label: 'Metalowe części w ciele',
        key: 'metalPartsInBody',
        required: false,
        options: ['Tak', 'Nie'],
        order: order++,
    }, {
        type: 'TEXTAREA',
        label: 'Rutyna pielęgnacyjna - szampon',
        key: 'careRoutineShampoo',
        required: false,
        placeholder: 'Opisz szampon',
        order: order++,
    }, {
        type: 'TEXTAREA',
        label: 'Rutyna pielęgnacyjna - odżywka',
        key: 'careRoutineConditioner',
        required: false,
        placeholder: 'Opisz odżywkę',
        order: order++,
    }, {
        type: 'TEXTAREA',
        label: 'Rutyna pielęgnacyjna - oleje',
        key: 'careRoutineOils',
        required: false,
        placeholder: 'Opisz oleje',
        order: order++,
    }, {
        type: 'TEXTAREA',
        label: 'Rutyna pielęgnacyjna - zabiegi chemiczne',
        key: 'careRoutineChemical',
        required: false,
        placeholder: 'Opisz zabiegi',
        order: order++,
    });
    // TRICHOSKOPIA - Dodajemy tylko najważniejsze pola, resztę można rozszerzyć
    fields.push({
        type: 'MULTISELECT',
        label: 'Typ skóry głowy',
        key: 'scalpType',
        required: false,
        options: [
            'Normalna',
            'Tłusta',
            'Sucha',
            'Mieszana',
            'Wrażliwa',
            'Zapalna',
        ],
        order: order++,
    }, {
        type: 'MULTISELECT',
        label: 'Wygląd skóry głowy',
        key: 'scalpAppearance',
        required: false,
        options: [
            'Zdrowe',
            'Zapalne',
            'Złuszczające się',
            'Zgrubiałe',
            'Zaczerwienione',
        ],
        order: order++,
    }, {
        type: 'SELECT',
        label: 'Hiperhydroza',
        key: 'hyperhidrosis',
        required: false,
        options: ['Tak', 'Nie'],
        order: order++,
    }, {
        type: 'SELECT',
        label: 'Hiperkeratynizacja',
        key: 'hyperkeratinization',
        required: false,
        options: ['Tak', 'Nie'],
        order: order++,
    }, {
        type: 'SELECT',
        label: 'Wydzielanie łoju',
        key: 'sebaceousSecretion',
        required: false,
        options: ['Normalne', 'Zwiększone', 'Zmniejszone'],
        order: order++,
    }, {
        type: 'SELECT',
        label: 'pH skóry głowy',
        key: 'scalpPH',
        required: false,
        options: ['Kwaśne', 'Neutralne', 'Zasadowe'],
        order: order++,
    }, {
        type: 'SELECT',
        label: 'Jakość włosów',
        key: 'hairQuality',
        required: false,
        options: ['Dobra', 'Średnia', 'Słaba'],
        order: order++,
    }, {
        type: 'SELECT',
        label: 'Kształt włosów',
        key: 'hairShape',
        required: false,
        options: ['Proste', 'Falowane', 'Kręcone'],
        order: order++,
    }, {
        type: 'SELECT',
        label: 'Włosy odrastające',
        key: 'regrowingHairs',
        required: false,
        options: ['Tak', 'Nie'],
        order: order++,
    }, {
        type: 'SELECT',
        label: 'Stopień przerzedzenia',
        key: 'degreeOfThinning',
        required: false,
        options: ['Lekki', 'Średni', 'Ciężki'],
        order: order++,
    }, {
        type: 'SELECT',
        label: 'Miniaturyzacja',
        key: 'miniaturization',
        required: false,
        options: ['Tak', 'Nie'],
        order: order++,
    }, {
        type: 'SELECT',
        label: 'Zespoły mieszkowe',
        key: 'follicularUnits',
        required: false,
        options: [
            'Przewaga pojedynczych',
            'Przewaga podwójnych',
            'Przewaga potrójnych/poczwórnych',
            'Występują puste mieszki włosowe',
        ],
        order: order++,
    }, {
        type: 'SELECT',
        label: 'Pull Test',
        key: 'pullTest',
        required: false,
        options: ['Dodatni TE/AE', 'Ujemny AGA'],
        order: order++,
    }, {
        type: 'TEXTAREA',
        label: 'Inne (diagnostyka łysienia)',
        key: 'alopeciaOther',
        required: false,
        placeholder: 'Opisz inne obserwacje',
        order: order++,
    });
    // DIAGNOZA I ZALECENIA
    fields.push({
        type: 'TEXTAREA',
        label: 'Diagnoza',
        key: 'diagnosis',
        required: false,
        placeholder: 'Wpisz diagnozę',
        order: order++,
    }, {
        type: 'TEXTAREA',
        label: 'Zalecenia - mycie',
        key: 'careRecommendationsWashing',
        required: false,
        placeholder: 'Zalecenia dotyczące mycia',
        order: order++,
    }, {
        type: 'TEXTAREA',
        label: 'Zalecenia - preparaty miejscowe',
        key: 'careRecommendationsTopical',
        required: false,
        placeholder: 'Zalecenia dotyczące preparatów',
        order: order++,
    }, {
        type: 'TEXTAREA',
        label: 'Zalecenia - suplementy',
        key: 'careRecommendationsSupplement',
        required: false,
        placeholder: 'Zalecenia dotyczące suplementów',
        order: order++,
    }, {
        type: 'TEXTAREA',
        label: 'Zmiany w pielęgnacji',
        key: 'careRecommendationsBehavior',
        required: false,
        placeholder: 'Zalecenia dotyczące zmian w zachowaniu',
        order: order++,
    }, {
        type: 'TEXTAREA',
        label: 'Wizyty / Zabiegi',
        key: 'visitsProcedures',
        required: false,
        placeholder: 'Notatki z wizyt i zabiegów',
        order: order++,
    }, {
        type: 'TEXTAREA',
        label: 'Uwagi ogólne',
        key: 'generalRemarks',
        required: false,
        placeholder: 'Dodatkowe uwagi',
        order: order++,
    });
    fields.push({
        type: 'SECTION',
        label: 'SKALA NORWOODA- HAMILTONA',
        key: 'section_norwood_scale',
        required: false,
        order: order++,
    }, {
        type: 'IMAGE_SELECT',
        label: 'Wybierz stopień',
        key: 'norwoodScale',
        required: false,
        options: ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'],
        order: order++,
    }, {
        type: 'SECTION',
        label: 'SKALA M. LUDWIGA',
        key: 'section_ludwig_scale',
        required: false,
        order: order++,
    }, {
        type: 'IMAGE_SELECT',
        label: 'Wybierz stopień',
        key: 'ludwigScale',
        required: false,
        options: ['I', 'II', 'III'],
        order: order++,
    });
    return fields;
}
// Run if called directly
if (require.main === module) {
    seedDefaultTemplate()
        .then(() => {
        console.log('✓ Seed zakończony');
        process.exit(0);
    })
        .catch((error) => {
        console.error('✗ Błąd seed:', error);
        process.exit(1);
    });
}
//# sourceMappingURL=seedDefaultConsultationTemplate.js.map