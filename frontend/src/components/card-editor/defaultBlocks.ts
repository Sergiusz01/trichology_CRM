// ============================================================
// Default block definitions — 14 predefiniowanych bloków
// ============================================================

import {
  CardBlock,
  BlockType,
  BlockLibraryItem,
  DEFAULT_BLOCK_STYLE,
  InterviewQuestion,
  PatientField,
  HeaderContent,
} from './types';

let _idCounter = 0;
export const generateBlockId = () => `block_${Date.now()}_${_idCounter++}`;

// ============================================================
// Block library items (for left panel)
// ============================================================

export const BLOCK_LIBRARY: BlockLibraryItem[] = [
  // Dane ogólne
  { type: 'HEADER', title: 'Nagłówek karty', description: 'Logo, tytuł, data', icon: 'Badge', category: 'general' },
  { type: 'PATIENT_DATA', title: 'Dane pacjenta', description: 'Imię, wiek, płeć, kontakt', icon: 'Person', category: 'general' },
  { type: 'FOOTER', title: 'Stopka karty', description: 'Dane gabinetu, podpis', icon: 'ContactPage', category: 'general' },
  // Problem i wywiad
  { type: 'PROBLEM', title: 'Problem', description: '5 podsekcji: wypadanie, przetłuszczanie...', icon: 'ReportProblem', category: 'problem' },
  { type: 'INTERVIEW', title: 'Wywiad', description: '15 pytań z checkboxami', icon: 'QuestionAnswer', category: 'problem' },
  // Badanie kliniczne
  { type: 'TRICHOSCOPY', title: 'Trichoskopia', description: 'Typ skóry, wykwity, parametry', icon: 'Biotech', category: 'clinical' },
  // Diagnostyka
  { type: 'LAB_DIAGNOSTICS', title: 'Diagnostyka lab.', description: 'Wyniki badań laboratoryjnych', icon: 'Science', category: 'diagnostics' },
  { type: 'ALOPECIA', title: 'Diagnostyka łysienia', description: 'Typy, stopień, pull test', icon: 'ContentCut', category: 'diagnostics' },
  { type: 'SCALES', title: 'Skale oceny', description: 'Norwood-Hamilton, Ludwig', icon: 'Assessment', category: 'diagnostics' },
  // Zalecenia i wizyta
  { type: 'DIAGNOSIS', title: 'Rozpoznanie', description: 'Pole tekstowe diagnozy', icon: 'MedicalInformation', category: 'treatment' },
  { type: 'RECOMMENDATIONS', title: 'Zalecenia', description: 'Mycie, wcieranie, suplementy', icon: 'Checklist', category: 'treatment' },
  { type: 'VISITS', title: 'Wizyty / Zabiegi', description: 'Notatki z wizyt', icon: 'EventNote', category: 'treatment' },
  { type: 'NOTES', title: 'Uwagi', description: 'Pole na uwagi ogólne', icon: 'StickyNote2', category: 'treatment' },
  // Media
  { type: 'PHOTOS', title: 'Zdjęcia trichoskopowe', description: 'Siatka zdjęć z opisem', icon: 'PhotoLibrary', category: 'media' },
  // Typographic
  { type: 'HEADING', title: 'Nagłówek tekstu', description: 'H1 / H2 / H3', icon: 'Title', category: 'typography' },
  { type: 'TEXT_BLOCK', title: 'Tekst akapitowy', description: 'Blok tekstu', icon: 'Notes', category: 'typography' },
  // Decorative
  { type: 'SEPARATOR', title: 'Separator', description: 'Linia rozdzielająca', icon: 'HorizontalRule', category: 'decorative' },
  { type: 'SPACER', title: 'Odstępnik', description: 'Pionowy odstęp', icon: 'UnfoldMore', category: 'decorative' },
];

// ============================================================
// Default patient fields
// ============================================================

const defaultPatientFields: PatientField[] = [
  { id: 'pf_1', label: 'Imię i nazwisko', key: 'fullName', visible: true, order: 0 },
  { id: 'pf_2', label: 'Wiek', key: 'age', visible: true, order: 1 },
  { id: 'pf_3', label: 'Płeć', key: 'gender', visible: true, order: 2 },
  { id: 'pf_4', label: 'Wykonywany zawód', key: 'occupation', visible: true, order: 3 },
  { id: 'pf_5', label: 'Adres zamieszkania', key: 'address', visible: true, order: 4 },
  { id: 'pf_6', label: 'Numer telefonu', key: 'phone', visible: true, order: 5 },
  { id: 'pf_7', label: 'E-mail', key: 'email', visible: true, order: 6 },
];

// ============================================================
// Default interview questions
// ============================================================

const defaultInterviewQuestions: InterviewQuestion[] = [
  { id: 'iq_1', number: 1, text: 'Czy dany problem występuje u innych członków rodziny?', type: 'yesno', yesNoValue: null, visible: true, genderSpecific: null },
  { id: 'iq_2', number: 2, text: 'Czy była konieczna wizyta u dermatologa?', type: 'yesno_with_text', yesNoValue: null, textLabel: 'Powód', textValue: '', visible: true, genderSpecific: null },
  { id: 'iq_3', number: 3, text: 'Czy jest Pani w ciąży?', type: 'yesno', yesNoValue: null, visible: true, genderSpecific: 'K' },
  { id: 'iq_4', number: 4, text: 'Czy miesiączkuje regularnie?', type: 'yesno_with_text', yesNoValue: null, textLabel: 'Antykoncepcja hormonalna', textValue: '', visible: true, genderSpecific: 'K' },
  { id: 'iq_5', number: 5, text: 'Czy zażywa Pan/Pani jakieś leki?', type: 'yesno_with_text', yesNoValue: null, textLabel: 'Jakie', textValue: '', visible: true, genderSpecific: null },
  { id: 'iq_6', number: 6, text: 'Czy stosuje Pani/Pan suplementy?', type: 'text', textLabel: 'Suplementy', textValue: '', visible: true, genderSpecific: null },
  { id: 'iq_7', number: 7, text: 'Poziom stresu w życiu codziennym?', type: 'multi_checkbox', options: [
    { label: 'duży', value: 'duży' }, { label: 'średni', value: 'średni' }, { label: 'mały', value: 'mały' },
  ], visible: true, genderSpecific: null },
  { id: 'iq_8', number: 8, text: 'Czy w ostatnim czasie była Pani/Pan poddana:', type: 'multi_checkbox', options: [
    { label: 'narkoza', value: 'narkoza' }, { label: 'chemioterapia', value: 'chemioterapia' },
    { label: 'radioterapia', value: 'radioterapia' }, { label: 'szczepienie', value: 'szczepienie' },
    { label: 'antybiotyki', value: 'antybiotyki' },
  ], textLabel: 'Antybiotyki - jakie', textValue: '', visible: true, genderSpecific: null },
  { id: 'iq_9', number: 9, text: 'Czy choruje na choroby przewlekłe?', type: 'yesno_with_text', yesNoValue: null, textLabel: 'Jakie', textValue: '', visible: true, genderSpecific: null },
  { id: 'iq_10', number: 10, text: 'Czy jest pod opieką specjalisty?', type: 'yesno_with_text', yesNoValue: null, textLabel: 'Jakiego', textValue: '', visible: true, genderSpecific: null },
  { id: 'iq_11', number: 11, text: 'Zaburzenia odżywiania/wchłaniania?', type: 'yesno_with_text', yesNoValue: null, textLabel: 'Nietolerancje pokarmowe', textValue: '', visible: true, genderSpecific: null },
  { id: 'iq_12', number: 12, text: 'Czy była Pani/Pan na diecie?', type: 'yesno', yesNoValue: null, visible: true, genderSpecific: null },
  { id: 'iq_13', number: 13, text: 'Alergia lub uczulenie na substancje?', type: 'yesno', yesNoValue: null, visible: true, genderSpecific: null },
  { id: 'iq_14', number: 14, text: 'Metalowe części w organizmie?', type: 'yesno', yesNoValue: null, visible: true, genderSpecific: null },
  { id: 'iq_15', number: 15, text: 'Pielęgnacja skóry głowy i włosów:', type: 'text', textLabel: '', textValue: '', visible: true, genderSpecific: null },
];

// ============================================================
// Problem sub-sections content
// ============================================================

const defaultProblemContent = {
  subsections: [
    {
      id: 'prob_1',
      title: '1. WYPADANIE WŁOSÓW',
      fields: [
        { id: 'hl_sev', label: 'Nasilenie', type: 'checkbox_row', options: ['w normie', 'nasilone', 'nadmierne', 'okresowe', 'brak'] },
        { id: 'hl_loc', label: 'Lokalizacja', type: 'checkbox_row', options: ['ciemieniowa', 'skronie', 'czołowa', 'tonsura', 'potylica', 'uogólnione', 'brwi/rzęsy', 'pachy', 'pachwiny'] },
        { id: 'hl_dur', label: 'Czas trwania', type: 'checkbox_row', options: ['0–6 m-cy', '6–12 m-cy', '12–24 m-cy', 'powyżej roku'] },
        { id: 'hl_shp', label: 'Szampony', type: 'text', value: '' },
      ],
    },
    {
      id: 'prob_2',
      title: '2. PRZETŁUSZCZANIE WŁOSÓW',
      fields: [
        { id: 'oh_sev', label: 'Nasilenie', type: 'checkbox_row', options: ['w normie', 'nasilone', 'nadmierne', 'okresowe', 'brak'] },
        { id: 'oh_freq', label: 'Częstotliwość mycia', type: 'checkbox_row', options: ['codziennie', 'co 2–3 dni', 'raz w tygodniu'] },
        { id: 'oh_dur', label: 'Czas trwania', type: 'checkbox_row', options: ['0–6 m-cy', '6–12 m-cy', '12–24 m-cy', 'powyżej roku'] },
        { id: 'oh_shp', label: 'Szampony', type: 'text', value: '' },
      ],
    },
    {
      id: 'prob_3',
      title: '3. ŁUSZCZENIE SKÓRY GŁOWY',
      fields: [
        { id: 'sc_sev', label: 'Nasilenie', type: 'checkbox_row', options: ['w normie', 'nasilone', 'nadmierne', 'okresowe', 'brak'] },
        { id: 'sc_type', label: 'Rodzaj', type: 'checkbox_row', options: ['suchy', 'tłusty', 'miejscowy', 'uogólniony'] },
        { id: 'sc_dur', label: 'Czas trwania', type: 'checkbox_row', options: ['0–6 m-cy', '6–12 m-cy', '12–24 m-cy', 'powyżej roku'] },
        { id: 'sc_other', label: 'Inne', type: 'text', value: '' },
      ],
    },
    {
      id: 'prob_4',
      title: '4. WRAŻLIWOŚĆ SKÓRY GŁOWY',
      fields: [
        { id: 'sn_sev', label: 'Nasilenie', type: 'checkbox_row', options: ['w normie', 'nasilone', 'nadmierne', 'okresowe', 'brak'] },
        { id: 'sn_type', label: 'Rodzaj problemu', type: 'checkbox_row', options: ['świąd', 'pieczenie', 'nadwrażliwość na preparaty', 'trichodynia'] },
        { id: 'sn_dur', label: 'Czas trwania', type: 'checkbox_row', options: ['0–6 m-cy', '6–12 m-cy', '12–24 m-cy', 'powyżej roku'] },
        { id: 'sn_other', label: 'Inne', type: 'text', value: '' },
      ],
    },
    {
      id: 'prob_5',
      title: '5. STANY ZAPALNE / GRUDKI',
      fields: [
        { id: 'infl_txt', label: '', type: 'textarea', value: '', rows: 3 },
      ],
    },
  ],
};

// ============================================================
// Trichoscopy content
// ============================================================

const defaultTrichoscopyContent = {
  subsections: [
    {
      id: 'tri_a', title: 'Typ i wygląd skóry',
      fields: [
        { id: 'st', label: 'TYP SKÓRY GŁOWY', type: 'checkbox_row', options: ['sucha', 'tłusta', 'wrażliwa', 'nadreaktywna', 'z erytrodermią', 'normalna'] },
        { id: 'sa', label: 'WYGLĄD I OBJAWY', type: 'checkbox_row', options: ['zaczerwienie', 'świąd', 'pieczenie', 'ból', 'suchość', 'łojotok'] },
        { id: 'sl', label: 'WYKWITY SKÓRNE', type: 'checkbox_row', options: ['plama', 'grudka', 'krosta', 'guzek', 'blizna', 'strup', 'pęknięcie', 'łuska', 'przeczos', 'złuszczanie płatowe', 'złuszczanie otrębiaste', 'obj. Kebnera'] },
      ],
    },
    {
      id: 'tri_b', title: 'Parametry gruczołów',
      fields: [
        { id: 'hh', label: 'HIPERHYDROZA', type: 'checkbox_row', options: ['miejscowa', 'uogólniona', 'brak'] },
        { id: 'hk', label: 'HIPERKERATYNIZACJA', type: 'checkbox_row', options: ['miejscowa', 'uogólniona', 'okołomieszkowa', 'tubule', 'brak'] },
        { id: 'sg', label: 'WYDZIELINA G. ŁOJ.', type: 'checkbox_row', options: ['oleista', 'zalegająca', 'brak'] },
        { id: 'si', label: 'INTERPRETACJA ŁOJOTOKU', type: 'checkbox_row', options: [
          'Skóra sucha, odwodniona / Cebulka tłusta', 'Skóra tłusta / Cebulka tłusta',
          'Hiperhydroza / Cebulka tłusta', 'Skóra tłusta / Cebulka dystroficzna',
          'Łojotok / Wypadanie włosów',
        ] },
        { id: 'si_o', label: 'Inne', type: 'text', value: '' },
        { id: 'dt', label: 'ŁUPIEŻ', type: 'checkbox_row', options: ['Suchy', 'Tłusty', 'Kosmetyczny', 'miejscowy', 'uogólniony'] },
        { id: 'ph', label: 'WARTOŚĆ pH', type: 'text', value: '' },
      ],
    },
    {
      id: 'tri_c', title: 'Ocena stanu włosów',
      fields: [
        { id: 'hd', label: 'USZKODZENIA WŁOSA', type: 'checkbox_row', options: ['naturalne', 'fizyczne', 'mechaniczne', 'chemiczne'] },
        { id: 'hdr', label: 'POWODY USZKODZENIA', type: 'checkbox_row', options: ['trwała', 'trwałe prostowanie', 'farby/rozjaśnianie', 'lakier', 'produkty do stylizacji', 'prostownica/lokówka'] },
        { id: 'hq', label: 'JAKOŚĆ WŁOSA', type: 'checkbox_row', options: ['zdrowe', 'suche', 'przetłuszczone', 'zniszczona łuska'] },
        { id: 'hs', label: 'KSZTAŁT WŁOSA', type: 'checkbox_row', options: ['prosty', 'kręcony', 'falisty', 'fil-fil'] },
        { id: 'ht', label: 'RODZAJE WŁOSÓW', type: 'checkbox_row', options: ['urwane', 'kręte', 'paciorkowate', 'obrączkowate', 'tulipanowe', 'wykrzyknikowe'] },
        { id: 'hn', label: 'WŁOSY NASTĘPOWE', type: 'checkbox_row', options: ['dużo', 'niewiele'] },
        { id: 'hv', label: 'WŁOSY VELLUS', type: 'checkbox_row', options: ['dużo', 'mało', 'uogólnione', 'miejscowo', 'brak'] },
      ],
    },
    {
      id: 'tri_d', title: 'Diagnostyka mikroskopowa',
      fields: [
        { id: 'vp', label: 'UNACZYNIENIE', type: 'checkbox_row', options: ['naczynia proste', 'naczynia poskręcane', 'naczynia drzewkowate', 'wzorzec plastra miodu', 'typ spinek', 'okołomieszkowe', 'miejscowe', 'rozlane'] },
        { id: 'pf', label: 'CECHY OKOŁOMIESZKOWE', type: 'checkbox_row', options: ['white dots', 'yellow dots', 'black dots', 'prawidłowe'] },
        { id: 'sd', label: 'CHOROBY SKÓRY GŁOWY', type: 'checkbox_row', options: ['ŁZS', 'LLP', 'AZS', 'grzybica', 'łuszczyca', 'zapalenia okołomieszkowe'] },
        { id: 'od', label: 'INNE', type: 'checkbox_row', options: ['trichodynia', 'plaster miodu', 'cofnięcie linii czołowej', 'trichokinesis'] },
      ],
    },
  ],
};

// ============================================================
// Lab diagnostics content
// ============================================================

const defaultLabContent = {
  groups: [
    { id: 'lab_a', title: 'Morfologia i markery zapalne', fields: [
      { id: 'l_morf', label: 'MORFOLOGIA', type: 'text' }, { id: 'l_ob', label: 'OB', type: 'text' }, { id: 'l_crp', label: 'CRP', type: 'text' },
    ]},
    { id: 'lab_b', title: 'Gospodarka żelazem i witaminy', fields: [
      { id: 'l_fe', label: 'FE', type: 'text' }, { id: 'l_fol', label: 'kw. foliowy', type: 'text' }, { id: 'l_b12', label: 'Wit. B12', type: 'text' },
      { id: 'l_ferr', label: 'Ferrytyna', type: 'text' }, { id: 'l_trans', label: 'Transferryna', type: 'text' },
      { id: 'l_hom', label: 'Homocysteina', type: 'text' }, { id: 'l_d3', label: 'Wit. 1,25(OH)₂D₃', type: 'text' },
    ]},
    { id: 'lab_c', title: 'Elektrolity i minerały', fields: [
      { id: 'l_na', label: 'Na', type: 'text' }, { id: 'l_k', label: 'K', type: 'text' }, { id: 'l_mg', label: 'Mg', type: 'text' },
      { id: 'l_zn', label: 'Zn', type: 'text' }, { id: 'l_se', label: 'Se', type: 'text' },
    ]},
    { id: 'lab_d', title: 'Enzymy wątrobowe i lipidogram', fields: [
      { id: 'l_ast', label: 'AST', type: 'text' }, { id: 'l_alt', label: 'ALT', type: 'text' },
      { id: 'l_chol', label: 'Cholesterol', type: 'text' }, { id: 'l_tg', label: 'TG', type: 'text' },
    ]},
    { id: 'lab_e', title: 'Tarczyca', fields: [
      { id: 'l_tsh', label: 'TSH', type: 'text' }, { id: 'l_ft3', label: 'fT3', type: 'text' }, { id: 'l_ft4', label: 'fT4', type: 'text' },
      { id: 'l_tgm', label: 'TG (marker)', type: 'text' }, { id: 'l_atpo', label: 'ANTY TPO', type: 'text' },
      { id: 'l_atg', label: 'ANTY TG', type: 'text' }, { id: 'l_trab', label: 'TRAB', type: 'text' }, { id: 'l_tsi', label: 'TSI', type: 'text' },
    ]},
    { id: 'lab_f', title: 'Hormony płciowe', fields: [
      { id: 'l_lh', label: 'LH (3 dzień)', type: 'text' }, { id: 'l_fsh', label: 'FSH', type: 'text' },
      { id: 'l_estr', label: 'Estradiol (3 dzień)', type: 'text' }, { id: 'l_prog', label: 'Progesteron (22 dzień)', type: 'text' },
      { id: 'l_prl', label: 'Prolaktyna', type: 'text' }, { id: 'l_andr', label: 'Androstendion', type: 'text' },
      { id: 'l_sdhea', label: 'S-DHEA', type: 'text' }, { id: 'l_test', label: 'Testosteron', type: 'text' },
      { id: 'l_dht', label: 'DHT', type: 'text' }, { id: 'l_shbg', label: 'SHBG', type: 'text' }, { id: 'l_cort', label: 'Kortyzol', type: 'text' },
    ]},
    { id: 'lab_g', title: 'Immunologia i inne', fields: [
      { id: 'l_ana1', label: 'ANA-1', type: 'text' }, { id: 'l_ana2', label: 'ANA-2', type: 'text' },
      { id: 'l_hpyl', label: 'Helikobakter', type: 'text' }, { id: 'l_gluc', label: 'Glukoza', type: 'text' },
      { id: 'l_hba', label: 'HbA1c', type: 'text' }, { id: 'l_ins', label: 'Insulina', type: 'text' },
      { id: 'l_cand', label: 'Candida', type: 'text' }, { id: 'l_hist', label: 'Histamina', type: 'text' }, { id: 'l_par', label: 'Pasożyty', type: 'text' },
    ]},
    { id: 'lab_h', title: 'Badania specjalistyczne', fields: [
      { id: 'l_wood', label: 'Lampa Wood\'a', type: 'text' }, { id: 'l_dem', label: 'Demodex', type: 'text' },
      { id: 'l_myc', label: 'Bad. mykologiczne', type: 'textarea' }, { id: 'l_mic', label: 'Bad. mikrobiologiczne', type: 'textarea' },
    ]},
  ],
  date: '',
};

// ============================================================
// Alopecia content
// ============================================================

const defaultAlopeciaContent = {
  types: {
    label: 'ŁYSIENIE',
    options: [
      'Androgenetic alopecia MAGA/AG', 'Telogen effluvium TE', 'Anagen effluvium AE',
      'Alopecia areata AA', 'Follicularis decalvans/bliznowaciejące FD', 'Trichotillomania TTM',
      'Trichodynia', 'Idiopatyczne skrócenie anagenu', 'Łysienie starcze',
    ],
  },
  thinning: { label: 'STOPIEŃ PRZERZEDZENIA', options: ['zanik', 'mało', 'miejscowo', 'dużo'] },
  table: {
    columns: [
      { title: 'TYP ŁYSIENIA', options: ['Androgenowe typu męskiego', 'Androgenowe typu żeńskiego', 'Plackowate AA', 'Telogenowe TE'] },
      { title: 'OBSZAR', options: ['Hormonozależny', 'Tył głowy', 'Cały obszar głowy', 'Inne'] },
      { title: 'WYPADANIE WŁOSÓW', type: 'text' },
    ],
  },
  miniaturization: {
    label: 'CECHY MINIATURYZACJI',
    options: ['Menopauzalne', 'Tarczycowe', 'Sezonowe', 'Łojotokowe', 'Żywieniowe', 'Psychosomatyczne', 'Jatrogenne', 'Bliznowaciejące', 'Choroby skóry głowy', 'Inne'],
  },
  follicularUnits: {
    label: 'ZESPOŁY MIESZKOWE',
    options: ['Przewaga pojedynczych', 'Przewaga podwójnych', 'Przewaga potrójnych/poczwórnych', 'Puste mieszki włosowe'],
  },
  pullTest: { label: 'PULL TEST', options: ['Dodatni TE/AE', 'Ujemny AGA'] },
  other: '',
};

// ============================================================
// Scales content
// ============================================================

const defaultScalesContent = {
  norwood: {
    title: 'SKALA NORWOODA-HAMILTONA',
    stages: ['2', '2A', '3', '3A', '3V', '4', '4A', '5', '5A', '5V', '6', '7'],
    selected: null as string | null,
    notes: '',
    visible: true,
  },
  ludwig: {
    title: 'SKALA M. LUDWIGA',
    stages: ['I-1', 'I-2', 'I-3', 'I-4', 'II-1', 'II-2', 'III'],
    selected: null as string | null,
    notes: '',
    visible: true,
  },
};

// ============================================================
// Factory: createBlock(type) → CardBlock
// ============================================================

export function createBlock(type: BlockType, orderOverride?: number): CardBlock {
  const id = generateBlockId();
  const order = orderOverride ?? 0;

  const base: Omit<CardBlock, 'content' | 'title'> = {
    id,
    type,
    order,
    locked: false,
    style: { ...DEFAULT_BLOCK_STYLE },
  };

  switch (type) {
    case 'HEADER':
      return {
        ...base,
        title: 'Nagłówek karty',
        locked: true,
        content: {
          logoUrl: null,
          title: 'KARTA KONSULTACYJNA',
          logoAlign: 'left',
          headerBarColor: '#FFFFFF',
          separatorStyle: 'thin',
          showPageNumber: true,
          showDate: true,
        } as HeaderContent,
      };

    case 'PATIENT_DATA':
      return {
        ...base,
        title: 'Dane pacjenta',
        content: { fields: [...defaultPatientFields] },
      };

    case 'PROBLEM':
      return {
        ...base,
        title: 'Problem',
        content: JSON.parse(JSON.stringify(defaultProblemContent)),
      };

    case 'INTERVIEW':
      return {
        ...base,
        title: 'Wywiad',
        content: { questions: JSON.parse(JSON.stringify(defaultInterviewQuestions)) },
      };

    case 'TRICHOSCOPY':
      return {
        ...base,
        title: 'Trichoskopia',
        content: JSON.parse(JSON.stringify(defaultTrichoscopyContent)),
      };

    case 'LAB_DIAGNOSTICS':
      return {
        ...base,
        title: 'Diagnostyka laboratoryjna',
        content: JSON.parse(JSON.stringify(defaultLabContent)),
      };

    case 'ALOPECIA':
      return {
        ...base,
        title: 'Diagnostyka łysienia',
        content: JSON.parse(JSON.stringify(defaultAlopeciaContent)),
      };

    case 'DIAGNOSIS':
      return {
        ...base,
        title: 'Rozpoznanie',
        content: { text: '', rows: 6 },
      };

    case 'RECOMMENDATIONS':
      return {
        ...base,
        title: 'Zalecenia do pielęgnacji',
        content: {
          washing: '',
          topical: '',
          supplements: '',
          behaviorChanges: '',
        },
      };

    case 'VISITS':
      return {
        ...base,
        title: 'Wizyty / Zabiegi',
        content: { text: '', rows: 12 },
      };

    case 'NOTES':
      return {
        ...base,
        title: 'Uwagi',
        content: { text: '', rows: 5 },
      };

    case 'SCALES':
      return {
        ...base,
        title: 'Skale oceny łysienia',
        content: JSON.parse(JSON.stringify(defaultScalesContent)),
      };

    case 'PHOTOS':
      return {
        ...base,
        title: 'Zdjęcia trichoskopowe',
        content: { grid: '2x2', photos: [] },
      };

    case 'FOOTER':
      return {
        ...base,
        title: 'Stopka karty',
        locked: true,
        content: {
          showClinicName: true,
          showAddress: true,
          showContact: true,
          showSignatureLine: true,
        },
      };

    case 'HEADING':
      return {
        ...base,
        title: 'Nagłówek',
        content: { text: 'Nowy nagłówek', level: 'h2' },
        style: { ...DEFAULT_BLOCK_STYLE, padding: 8 },
      };

    case 'TEXT_BLOCK':
      return {
        ...base,
        title: 'Tekst',
        content: { text: '' },
        style: { ...DEFAULT_BLOCK_STYLE, padding: 8 },
      };

    case 'SEPARATOR':
      return {
        ...base,
        title: 'Separator',
        content: { style: 'solid' as const, text: '' },
        style: { ...DEFAULT_BLOCK_STYLE, padding: 4 },
      };

    case 'SPACER':
      return {
        ...base,
        title: 'Odstępnik',
        content: { height: 24 },
        style: { ...DEFAULT_BLOCK_STYLE, padding: 0 },
      };

    default:
      return { ...base, title: 'Blok', content: {} };
  }
}

// ============================================================
// Template presets
// ============================================================

export function createTemplatePreset(preset: 'full' | 'short' | 'control' | 'premium' | 'blank'): CardBlock[] {
  const allTypes: BlockType[] = [
    'HEADER', 'PATIENT_DATA', 'PROBLEM', 'INTERVIEW', 'TRICHOSCOPY',
    'LAB_DIAGNOSTICS', 'ALOPECIA', 'DIAGNOSIS', 'RECOMMENDATIONS',
    'VISITS', 'NOTES', 'SCALES', 'FOOTER',
  ];

  const shortTypes: BlockType[] = [
    'HEADER', 'PATIENT_DATA', 'INTERVIEW', 'DIAGNOSIS', 'RECOMMENDATIONS', 'FOOTER',
  ];

  const controlTypes: BlockType[] = [
    'HEADER', 'PATIENT_DATA', 'TRICHOSCOPY', 'DIAGNOSIS', 'RECOMMENDATIONS', 'FOOTER',
  ];

  let types: BlockType[];
  switch (preset) {
    case 'full':
    case 'premium':
      types = allTypes;
      break;
    case 'short':
      types = shortTypes;
      break;
    case 'control':
      types = controlTypes;
      break;
    case 'blank':
      types = ['HEADER'];
      break;
    default:
      types = allTypes;
  }

  return types.map((type, index) => createBlock(type, index));
}
