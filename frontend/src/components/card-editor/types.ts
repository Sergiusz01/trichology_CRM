// ============================================================
// Edytor Kart Konsultacyjnych — TypeScript Types
// ============================================================

/** All block types available in the editor */
export type BlockType =
  | 'HEADER'           // Blok 0 — Nagłówek karty
  | 'PATIENT_DATA'     // Blok 1 — Dane pacjenta
  | 'PROBLEM'          // Blok 2 — Problem (5 podsekcji)
  | 'INTERVIEW'        // Blok 3 — Wywiad
  | 'TRICHOSCOPY'      // Blok 4 — Trichoskopia
  | 'LAB_DIAGNOSTICS'  // Blok 5 — Diagnostyka laboratoryjna
  | 'ALOPECIA'         // Blok 6 — Diagnostyka łysienia
  | 'DIAGNOSIS'        // Blok 7 — Rozpoznanie
  | 'RECOMMENDATIONS'  // Blok 8 — Zalecenia
  | 'VISITS'           // Blok 9 — Wizyty/Zabiegi
  | 'NOTES'            // Blok 10 — Uwagi
  | 'SCALES'           // Blok 11 — Skale oceny
  | 'PHOTOS'           // Blok 12 — Zdjęcia trichoskopowe
  | 'FOOTER'           // Blok 13 — Stopka
  // Typographic & decorative elements
  | 'HEADING'          // H1/H2/H3
  | 'TEXT_BLOCK'       // Akapit
  | 'SEPARATOR'        // Linia separująca
  | 'SPACER';          // Odstępnik pionowy

/** Block category for library panel grouping */
export type BlockCategory =
  | 'general'     // Dane ogólne
  | 'problem'     // Problem i wywiad
  | 'clinical'    // Badanie kliniczne
  | 'diagnostics' // Diagnostyka
  | 'treatment'   // Zalecenia i wizyta
  | 'media'       // Media
  | 'typography'  // Elementy typograficzne
  | 'decorative'; // Elementy ozdobne

/** Border style options */
export type BorderStyle = 'none' | 'thin' | 'thick' | 'double' | 'dashed';

/** Text alignment */
export type TextAlign = 'left' | 'center' | 'right' | 'justify';

/** Column layout for checkbox groups */
export type ColumnLayout = 1 | 2 | 3;

/** Row density */
export type RowDensity = 'compact' | 'normal' | 'spacious';

/** View mode of the editor */
export type ViewMode = 'edit' | 'preview' | 'fill' | 'print';

/** Zoom level presets */
export type ZoomLevel = 50 | 75 | 100 | 125;

/** Logo alignment in header */
export type LogoAlign = 'left' | 'center' | 'right';

/** Separator style */
export type SeparatorStyle = 'solid' | 'dashed' | 'dotted' | 'double' | 'wavy';

/** Heading level */
export type HeadingLevel = 'h1' | 'h2' | 'h3';

/** Badge type */
export type BadgeType = 'PILNE' | 'KONTROLNA' | 'NOWY_PACJENT' | 'ALERGIA';

// ============================================================
// Checkbox field definition (for blocks with checkboxes)
// ============================================================

export interface CheckboxOption {
  label: string;
  value: string;
  checked?: boolean;
}

export interface CheckboxField {
  id: string;
  label: string;
  type: 'single' | 'multi'; // single = radio-like, multi = checkboxes
  options: CheckboxOption[];
}

export interface TextField {
  id: string;
  label: string;
  value: string;
  multiline?: boolean;
  rows?: number;
  placeholder?: string;
}

export interface SelectField {
  id: string;
  label: string;
  value: string;
  options: string[];
}

// ============================================================
// Interview question definition (Blok 3)
// ============================================================

export interface InterviewQuestion {
  id: string;
  number: number;
  text: string;
  type: 'yesno' | 'yesno_with_text' | 'text' | 'multi_checkbox' | 'scale';
  options?: CheckboxOption[];
  textLabel?: string;
  textValue?: string;
  yesNoValue?: 'tak' | 'nie' | null;
  visible?: boolean;
  genderSpecific?: 'K' | 'M' | null; // Show only for specific gender
}

// ============================================================
// Block style
// ============================================================

export interface BlockStyle {
  backgroundColor: string;
  padding: number; // 0–40 px
  border: {
    style: BorderStyle;
    color: string;
    radius: number; // 0–16 px
  };
  shadow: boolean;
  shadowIntensity: number; // 0–100
  printable: boolean;
  // Typography
  headingFont: string;
  headingSize: number; // 12–28 px
  headingColor: string;
  bodyFont: string;
  bodySize: number; // 8–16 px
  // Layout
  columns: ColumnLayout;
  textAlign: TextAlign;
  rowDensity: RowDensity;
}

/** Default block style */
export const DEFAULT_BLOCK_STYLE: BlockStyle = {
  backgroundColor: '#FFFFFF',
  padding: 16,
  border: { style: 'none', color: '#E2E8F0', radius: 0 },
  shadow: false,
  shadowIntensity: 20,
  printable: true,
  headingFont: 'Inter',
  headingSize: 16,
  headingColor: '#000000',
  bodyFont: 'Inter',
  bodySize: 10,
  columns: 1,
  textAlign: 'left',
  rowDensity: 'normal',
};

// ============================================================
// Card Block — the main building unit
// ============================================================

export interface CardBlock {
  id: string;
  type: BlockType;
  title: string;
  order: number;
  locked: boolean; // e.g., header is locked at top
  style: BlockStyle;
  content: Record<string, any>; // type-specific content
}

// ============================================================
// Header block content (Blok 0)
// ============================================================

export interface HeaderContent {
  logoUrl: string | null;
  title: string;
  logoAlign: LogoAlign;
  headerBarColor: string;
  separatorStyle: BorderStyle;
  showPageNumber: boolean;
  showDate: boolean;
}

// ============================================================
// Patient data block content (Blok 1)
// ============================================================

export interface PatientField {
  id: string;
  label: string;
  key: string;
  visible: boolean;
  order: number;
}

export interface PatientDataContent {
  fields: PatientField[];
}

// ============================================================
// Branding settings
// ============================================================

export interface Branding {
  logoUrl: string | null;
  primaryColor: string;    // Default: #2E5F8A
  accentColor: string;     // Default: #5BBCB8
  displayFont: string;     // Default: Cormorant Garamond
  bodyFont: string;        // Default: Inter
  clinicName: string;
  clinicAddress: string;
  clinicPhone: string;
  clinicEmail: string;
  clinicWebsite: string;
  doctorSignatureUrl: string | null;
  cardNumberMode: 'auto' | 'manual';
}

export const DEFAULT_BRANDING: Branding = {
  logoUrl: null,
  primaryColor: '#2E5F8A',
  accentColor: '#5BBCB8',
  displayFont: 'Cormorant Garamond',
  bodyFont: 'Inter',
  clinicName: 'Tricho Diagnostic — Gabinet Trychologiczno-Kosmetyczny',
  clinicAddress: '',
  clinicPhone: '',
  clinicEmail: '',
  clinicWebsite: '',
  doctorSignatureUrl: null,
  cardNumberMode: 'auto',
};

// ============================================================
// Card Template — full template definition
// ============================================================

export interface CardTemplate {
  id?: string;
  name: string;
  blocks: CardBlock[];
  branding: Branding;
  createdAt?: string;
  updatedAt?: string;
}

/** Template preset types for the wizard */
export type TemplatePreset = 'full' | 'short' | 'control' | 'premium' | 'blank';

// ============================================================
// Editor State (managed by useCardEditor hook)
// ============================================================

export interface HistoryEntry {
  blocks: CardBlock[];
  timestamp: number;
}

export interface EditorState {
  template: CardTemplate;
  selectedBlockId: string | null;
  viewMode: ViewMode;
  zoom: ZoomLevel;
  history: HistoryEntry[];
  historyIndex: number;
  isDirty: boolean;
  lastSavedAt: string | null;
}

// ============================================================
// Block library item (for the left panel)
// ============================================================

export interface BlockLibraryItem {
  type: BlockType;
  title: string;
  description: string;
  icon: string; // MUI icon name
  category: BlockCategory;
  previewLines?: number; // visual hint of size
}

// ============================================================
// Color presets for block backgrounds
// ============================================================

export const BACKGROUND_PRESETS = [
  { label: 'Biały', value: '#FFFFFF' },
  { label: 'Kremowy', value: '#FFFBF0' },
  { label: 'Błękitny', value: '#F0F7FF' },
  { label: 'Miętowy', value: '#F0FFF4' },
  { label: 'Różowy', value: '#FFF0F5' },
  { label: 'Szary', value: '#F8FAFC' },
  { label: 'Lawendowy', value: '#F5F0FF' },
  { label: 'Piaskowy', value: '#FFF8F0' },
];

// ============================================================
// Font pairs
// ============================================================

export const FONT_PAIRS = [
  { label: 'Klasyczna', display: 'Cormorant Garamond', body: 'Inter' },
  { label: 'Medyczna', display: 'Playfair Display', body: 'Source Sans Pro' },
  { label: 'Nowoczesna', display: 'Montserrat', body: 'Open Sans' },
  { label: 'Elegancka', display: 'Libre Baskerville', body: 'Lato' },
  { label: 'Minimalna', display: 'Inter', body: 'Inter' },
  { label: 'Profesjonalna', display: 'Roboto Slab', body: 'Roboto' },
];
