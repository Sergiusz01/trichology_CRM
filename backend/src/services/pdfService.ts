import puppeteer from 'puppeteer';
import { prisma } from '../prisma';
import { getLogoHTMLForPDF } from '../utils/logo';
import { FIELD_LABELS, SECTIONS } from '../shared/consultationFields';

// Export helper functions for use in other modules
export const formatDate = (date: Date | string | null | undefined): string => {
  if (!date) return '-';
  try {
    const dateObj = date instanceof Date ? date : new Date(date);
    if (isNaN(dateObj.getTime())) return '-';
    return dateObj.toLocaleDateString('pl-PL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return '-';
  }
};

export const formatDateTime = (date: Date | string | null | undefined): string => {
  if (!date) return '-';
  try {
    const dateObj = date instanceof Date ? date : new Date(date);
    if (isNaN(dateObj.getTime())) return '-';
    return dateObj.toLocaleString('pl-PL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '-';
  }
};

// Helper to escape HTML special characters
const escapeHtml = (text: any): string => {
  if (text === null || text === undefined) return '';
  const str = String(text);
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

// Format JSON array field → comma-separated string
const formatJsonField = (value: any): string => {
  if (!value) return '';
  if (Array.isArray(value)) return escapeHtml(value.join(', '));
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return escapeHtml(parsed.join(', '));
      return escapeHtml(value);
    } catch {
      return escapeHtml(value);
    }
  }
  return escapeHtml(String(value));
};

// Helper: get value from consultation flat fields or dynamicData (mirrors getFieldValue in ConsultationViewPage)
const cv = (c: any, key: string): any => {
  const v = (c as any)[key];
  if (v !== undefined && v !== null && v !== '') return v;
  return ((c.dynamicData || {}) as Record<string, any>)[key];
};

// Render a "field row" (label: value) — only shown if value is non-empty
const fieldRow = (label: string, value: any): string => {
  const v = formatJsonField(value);
  if (!v) return '';
  return `
    <div class="field-row">
      <span class="field-label">${escapeHtml(label)}:</span>
      <span class="field-value">${v}</span>
    </div>`;
};

// Render a checkbox-style row — only shown if value is non-empty
const checkboxRow = (label: string, value: any): string => {
  const v = formatJsonField(value);
  if (!v) return '';
  return `
    <div class="checkbox-item">
      <span class="cb-bullet">■</span>
      <span class="cb-label">${escapeHtml(label)}:</span>
      <span class="cb-value">${v}</span>
    </div>`;
};

// Render a doctor note block — amber italic, only if note exists
const noteRow = (notes: Record<string, string> | null, key: string): string => {
  if (!notes || !notes[key]) return '';
  return `
    <div class="doctor-note">
      <span class="note-icon">✏</span>
      <span class="note-text">Notatka lekarza: ${escapeHtml(notes[key])}</span>
    </div>`;
};

// Safely extract fieldNotes from consultation (may be string JSON or object)
const getFieldNotes = (c: any): Record<string, string> => {
  const raw = cv(c, 'fieldNotes');
  if (!raw) return {};
  if (typeof raw === 'string') { try { return JSON.parse(raw); } catch { return {}; } }
  if (typeof raw === 'object' && !Array.isArray(raw)) return raw;
  return {};
};

export const generateConsultationPDF = async (consultation: any): Promise<Buffer> => {
  const c = consultation;
  const p = c.patient || {};
  const lab = Array.isArray(c.labResults) && c.labResults.length > 0 ? c.labResults[0] : null;
  const notes = getFieldNotes(c);  // doctor inline notes per field

  // ─── Section helpers ───────────────────────────────────────────────────────
  const sectionHeader = (title: string) =>
    `<div class="section-header">${escapeHtml(title)}</div>`;

  const subsectionHeader = (title: string) =>
    `<p class="subsection-header">${escapeHtml(title)}</p>`;

  const box = (content: string) =>
    `<div class="data-box">${content}</div>`;

  // Empty section box — gray tinted, shown when section has no data
  const emptyBox = (title: string) =>
    `<div class="data-box empty-box"><p class="subsection-header">${escapeHtml(title)}</p><p class="empty-note">Nie uzupełniono</p></div>`;

  // Renders box if has content, otherwise empty variant
  const sectionBox = (title: string, content: string, hasContent: boolean) =>
    hasContent ? box(`${subsectionHeader(title)}${content}`) : emptyBox(title);


  // ─── DANE PACJENTA ─────────────────────────────────────────────────────────
  const patientSection = `
    ${sectionHeader('DANE PACJENTA')}
    <div class="patient-grid">
      <div>
        ${fieldRow('Imię i nazwisko', `${p.firstName || ''} ${p.lastName || ''}`.trim())}
        ${fieldRow('Wiek', p.age)}
        ${fieldRow('Płeć', p.gender === 'FEMALE' ? 'Kobieta' : p.gender === 'MALE' ? 'Mężczyzna' : p.gender)}
        ${fieldRow('Zawód', p.occupation)}
      </div>
      <div>
        ${fieldRow('Adres', p.address)}
        ${fieldRow('Telefon', p.phone)}
        ${fieldRow('E-mail', p.email)}
        ${fieldRow('Lekarz', c.doctor?.name)}
      </div>
    </div>`;

  // ─── PROBLEMY (zawsze widoczne) ──────────────────────────────────────────
  const hairLossContent = `
        ${checkboxRow('Nasilenie', cv(c, 'hairLossSeverity'))}
        ${checkboxRow('Lokalizacja', cv(c, 'hairLossLocalization'))}
        ${checkboxRow('Czas trwania', cv(c, 'hairLossDuration'))}
        ${fieldRow('Szampony', cv(c, 'hairLossShampoos'))}
        ${fieldRow('Uwagi', cv(c, 'hairLossNotes'))}
        ${noteRow(notes, 'hairLoss')}`;
  const hairLossBox = sectionBox('1. WYPADANIE WŁOSÓW', hairLossContent,
    Boolean(cv(c, 'hairLossSeverity') || cv(c, 'hairLossLocalization') || cv(c, 'hairLossDuration')));

  const oilyHairContent = `
        ${checkboxRow('Nasilenie', cv(c, 'oilyHairSeverity'))}
        ${checkboxRow('Częstotliwość mycia', cv(c, 'oilyHairWashingFreq'))}
        ${checkboxRow('Czas trwania', cv(c, 'oilyHairDuration'))}
        ${fieldRow('Szampony', cv(c, 'oilyHairShampoos'))}
        ${fieldRow('Uwagi', cv(c, 'oilyHairNotes'))}
        ${noteRow(notes, 'oilyHair')}`;
  const oilyHairBox = sectionBox('2. PRZETŁUSZCZANIE WŁOSÓW', oilyHairContent,
    Boolean(cv(c, 'oilyHairSeverity') || cv(c, 'oilyHairWashingFreq')));

  const scalingContent = `
        ${checkboxRow('Nasilenie', cv(c, 'scalingSeverity'))}
        ${checkboxRow(FIELD_LABELS['scalingType'] ?? 'Typ łuszczenia', cv(c, 'scalingType'))}
        ${checkboxRow('Czas trwania', cv(c, 'scalingDuration'))}
        ${fieldRow('Inne (opis)', cv(c, 'scalingOther'))}
        ${noteRow(notes, 'scaling')}`;
  const scalingBox = sectionBox('3. ŁUSZCZENIE SKÓRY GŁOWY', scalingContent,
    Boolean(cv(c, 'scalingSeverity') || cv(c, 'scalingType')));

  const sensitivityContent = `
        ${checkboxRow(FIELD_LABELS['sensitivityProblemType'] ?? 'Typ problemu', cv(c, 'sensitivityProblemType'))}
        ${checkboxRow('Nasilenie', cv(c, 'sensitivitySeverity'))}
        ${checkboxRow('Czas trwania', cv(c, 'sensitivityDuration'))}
        ${fieldRow('Inne (opis)', cv(c, 'sensitivityOther'))}
        ${fieldRow(FIELD_LABELS['inflammatoryStates'] ?? 'Stany zapalne / grudki', cv(c, 'inflammatoryStates'))}
        ${noteRow(notes, 'sensitivity')}`;
  const sensitivityBox = sectionBox('4. WRAŻLIWOŚĆ SKÓRY GŁOWY', sensitivityContent,
    Boolean(cv(c, 'sensitivitySeverity') || cv(c, 'sensitivityProblemType')));

  const problemsSection = `
      ${sectionHeader('PROBLEMY ZGŁASZANE PRZEZ PACJENTA')}
      <div class="two-col">
        ${hairLossBox}
        ${oilyHairBox}
        ${scalingBox}
        ${sensitivityBox}
      </div>`;



  // ─── WYWIAD (zawsze widoczny) ─────────────────────────────────────────────
  const anamnesisSection = `
    ${sectionHeader('2. WYWIAD')}
    <div class="two-col">
      <div>
        ${checkboxRow(FIELD_LABELS['familyHistory'] ?? 'Wypadanie w rodzinie', cv(c, 'familyHistory')) || '<span class="empty-field">Nie podano</span>'}
        ${noteRow(notes, 'familyHistory')}
        ${checkboxRow(FIELD_LABELS['dermatologyVisits'] ?? 'Dermatolog', cv(c, 'dermatologyVisits'))}
        ${fieldRow(FIELD_LABELS['dermatologyVisitsReason'] ?? 'Powód wizyty', cv(c, 'dermatologyVisitsReason'))}
        ${checkboxRow(FIELD_LABELS['pregnancy'] ?? 'Ciąża', cv(c, 'pregnancy'))}
        ${checkboxRow(FIELD_LABELS['menstruationRegularity'] ?? 'Miesiączki', cv(c, 'menstruationRegularity'))}
        ${fieldRow(FIELD_LABELS['contraception'] ?? 'Antykoncepcja', cv(c, 'contraception'))}
        ${checkboxRow(FIELD_LABELS['stressLevel'] ?? 'Stres', cv(c, 'stressLevel'))}
        ${checkboxRow(FIELD_LABELS['medications'] ?? 'Leki stałe', cv(c, 'medications'))}
        ${fieldRow(FIELD_LABELS['medicationsList'] ?? 'Lista leków', cv(c, 'medicationsList'))}
        ${fieldRow(FIELD_LABELS['supplements'] ?? 'Suplementy', cv(c, 'supplements'))}
        ${fieldRow(FIELD_LABELS['supplementsDetails'] ?? 'Jakie suplementy?', cv(c, 'supplementsDetails'))}
        ${noteRow(notes, 'medications')}
      </div>
      <div>
        ${checkboxRow(FIELD_LABELS['anesthesia'] ?? 'Znieczulenie', cv(c, 'anesthesia'))}
        ${checkboxRow(FIELD_LABELS['chemotherapy'] ?? 'Chemioterapia', cv(c, 'chemotherapy'))}
        ${checkboxRow(FIELD_LABELS['radiotherapy'] ?? 'Radioterapia', cv(c, 'radiotherapy'))}
        ${checkboxRow(FIELD_LABELS['vaccination'] ?? 'Szczepienia', cv(c, 'vaccination'))}
        ${fieldRow(FIELD_LABELS['antibiotics'] ?? 'Antybiotyki', cv(c, 'antibiotics'))}
        ${fieldRow(FIELD_LABELS['antibioticsDetails'] ?? 'Jakie antybiotyki?', cv(c, 'antibioticsDetails'))}
        ${checkboxRow(FIELD_LABELS['chronicDiseases'] ?? 'Choroby przewlekłe', cv(c, 'chronicDiseases'))}
        ${fieldRow(FIELD_LABELS['chronicDiseasesList'] ?? 'Lista chorób', cv(c, 'chronicDiseasesList'))}
        ${noteRow(notes, 'chronicDiseases')}
        ${checkboxRow(FIELD_LABELS['specialists'] ?? 'Specjaliści', cv(c, 'specialists'))}
        ${fieldRow(FIELD_LABELS['specialistsList'] ?? 'Jacy specjaliści?', cv(c, 'specialistsList'))}
        ${checkboxRow(FIELD_LABELS['eatingDisorders'] ?? 'Zaburzenia odżywiania', cv(c, 'eatingDisorders'))}
        ${fieldRow(FIELD_LABELS['foodIntolerances'] ?? 'Nietolerancje pokarmowe', cv(c, 'foodIntolerances'))}
        ${fieldRow(FIELD_LABELS['diet'] ?? 'Dieta', cv(c, 'diet'))}
        ${fieldRow(FIELD_LABELS['allergies'] ?? 'Alergie', cv(c, 'allergies'))}
        ${checkboxRow(FIELD_LABELS['metalPartsInBody'] ?? 'Części metalowe', cv(c, 'metalPartsInBody'))}
        ${noteRow(notes, 'nutrition')}
      </div>
    </div>
    <div class="care-row">
      <strong>Aktualna pielęgnacja:</strong>
      ${cv(c, 'careRoutineShampoo') ? `Szampon: ${escapeHtml(cv(c, 'careRoutineShampoo'))}, ` : ''}
      ${cv(c, 'careRoutineConditioner') ? `Odżywka: ${escapeHtml(cv(c, 'careRoutineConditioner'))}, ` : ''}
      ${cv(c, 'careRoutineOils') ? `Wcierki: ${escapeHtml(cv(c, 'careRoutineOils'))}, ` : ''}
      ${cv(c, 'careRoutineChemical') ? `Zabiegi: ${escapeHtml(cv(c, 'careRoutineChemical'))}` : ''}
      ${!cv(c, 'careRoutineShampoo') && !cv(c, 'careRoutineConditioner') && !cv(c, 'careRoutineOils') && !cv(c, 'careRoutineChemical')
        ? '<em class="empty-field">Nie uzupełniono</em>' : ''}
    </div>
    ${noteRow(notes, 'careRoutine')}
  `;

  // ─── TRICHOSKOPIA (zawsze widoczna) ─────────────────────────────────────────────
  const trichoscopySection = `
    ${sectionHeader('3. TRICHOSKOPIA — BADANIE')}
    <div class="three-col">
      ${sectionBox('SKÓRA GŁOWY', `
        ${checkboxRow(FIELD_LABELS['scalpType'] ?? 'Typ skóry', cv(c, 'scalpType'))}
        ${noteRow(notes, 'scalpType')}
        ${checkboxRow(FIELD_LABELS['scalpAppearance'] ?? 'Wygląd skóry', cv(c, 'scalpAppearance'))}
        ${checkboxRow(FIELD_LABELS['skinLesions'] ?? 'Wykwity skórne', cv(c, 'skinLesions'))}
        ${checkboxRow(FIELD_LABELS['hyperhidrosis'] ?? 'Potliwość', cv(c, 'hyperhidrosis'))}
        ${checkboxRow(FIELD_LABELS['hyperkeratinization'] ?? 'Rogowacenie', cv(c, 'hyperkeratinization'))}
        ${checkboxRow(FIELD_LABELS['sebaceousSecretion'] ?? 'Wydzielina', cv(c, 'sebaceousSecretion'))}
        ${checkboxRow(FIELD_LABELS['seborrheaType'] ?? 'Łojotok', cv(c, 'seborrheaType'))}
        ${fieldRow(FIELD_LABELS['seborrheaTypeOther'] ?? 'Inny łojotok', cv(c, 'seborrheaTypeOther'))}
        ${checkboxRow(FIELD_LABELS['dandruffType'] ?? 'Łupież', cv(c, 'dandruffType'))}
        ${fieldRow(FIELD_LABELS['scalpPH'] ?? 'pH skóry', cv(c, 'scalpPH'))}`,
        Boolean(cv(c, 'scalpType') || cv(c, 'scalpAppearance') || cv(c, 'seborrheaType') || cv(c, 'dandruffType')))}
      ${sectionBox('STAN WŁOSÓW', `
        ${checkboxRow(FIELD_LABELS['hairQuality'] ?? 'Jakość', cv(c, 'hairQuality'))}
        ${checkboxRow(FIELD_LABELS['hairDamage'] ?? 'Uszkodzenia', cv(c, 'hairDamage'))}
        ${checkboxRow(FIELD_LABELS['hairDamageReason'] ?? 'Przyczyna', cv(c, 'hairDamageReason'))}
        ${checkboxRow(FIELD_LABELS['hairShape'] ?? 'Kształt', cv(c, 'hairShape'))}
        ${checkboxRow(FIELD_LABELS['hairTypes'] ?? 'Typy', cv(c, 'hairTypes'))}
        ${checkboxRow(FIELD_LABELS['regrowingHairs'] ?? 'Odrastające', cv(c, 'regrowingHairs'))}
        ${checkboxRow(FIELD_LABELS['vellusMiniaturizedHairs'] ?? 'Vellus / Zminiaturyzowane', cv(c, 'vellusMiniaturizedHairs'))}`,
        Boolean(cv(c, 'hairQuality') || cv(c, 'hairDamage') || cv(c, 'hairTypes') || cv(c, 'vellusMiniaturizedHairs')))}
      ${sectionBox('CECHY SPECYFICZNE', `
        ${checkboxRow(FIELD_LABELS['vascularPatterns'] ?? 'Unaczynienie', cv(c, 'vascularPatterns'))}
        ${checkboxRow(FIELD_LABELS['perifollicularFeatures'] ?? 'Cechy okołomieszkowe', cv(c, 'perifollicularFeatures'))}
        ${checkboxRow(FIELD_LABELS['scalpDiseases'] ?? 'Choroby skóry głowy', cv(c, 'scalpDiseases'))}
        ${checkboxRow(FIELD_LABELS['otherDiagnostics'] ?? 'Inne', cv(c, 'otherDiagnostics'))}`,
        Boolean(cv(c, 'vascularPatterns') || cv(c, 'perifollicularFeatures') || cv(c, 'scalpDiseases') || cv(c, 'otherDiagnostics')))}
    </div>
  `;

  // ─── DIAGNOSTYKA LABORATORYJNA ────────────────────────────────────────────
  const labSection = lab ? `
    ${sectionHeader('DIAGNOSTYKA LABORATORYJNA')}
    <div class="two-col">
      <div>
        ${fieldRow('Data badania', lab.date ? formatDate(lab.date) : '')}
        ${fieldRow('HGB', lab.hgb)} ${fieldRow('RBC', lab.rbc)} ${fieldRow('WBC', lab.wbc)} ${fieldRow('PLT', lab.plt)}
        ${fieldRow('OB', lab.ob)} ${fieldRow('CRP', lab.crp)}
        ${fieldRow('Żelazo (FE)', lab.iron)}
        ${fieldRow('Ferrytyna', lab.ferritin)}
        ${fieldRow('Kwas foliowy', lab.folicAcid)}
        ${fieldRow('Wit. B12', lab.vitaminB12)}
        ${fieldRow('Wit. D3', lab.vitaminD3)}
      </div>
      <div>
        ${fieldRow('TSH', lab.tsh)} ${fieldRow('fT3', lab.ft3)} ${fieldRow('fT4', lab.ft4)}
        ${fieldRow('ANTY TPO', lab.antiTPO)} ${fieldRow('ANTY TG', lab.antiTG)}
        ${fieldRow('Glukoza', lab.glucose)} ${fieldRow('HbA1c', lab.hba1c)}
        ${fieldRow('Insulina', lab.insulin)}
        ${fieldRow('Testosteron', lab.testosterone)} ${fieldRow('DHEA-S', lab.dheas)}
        ${fieldRow('Prolaktyna', lab.prolactin)} ${fieldRow('Progesteron', lab.progesterone)}
        ${fieldRow('Estradiol', lab.estrogen)}
      </div>
    </div>
  ` : '';

  // ─── DIAGNOSTYKA ŁYSIENIA + ROZPOZNANIE ───────────────────────────────────
  const diagnosisSection = `
    ${sectionHeader('5. ROZPOZNANIE (DIAGNOZA)')}
    <div class="two-col">
      <div>
        <div class="diagnosis-text">${escapeHtml(String(cv(c, 'diagnosis') || 'Brak wpisu'))}</div>
        ${checkboxRow(FIELD_LABELS['alopeciaTypes'] ?? 'Typ łysienia', cv(c, 'alopeciaTypes'))}
        ${fieldRow(FIELD_LABELS['alopeciaType'] ?? 'Klasyfikacja', cv(c, 'alopeciaType'))}
        ${fieldRow(FIELD_LABELS['degreeOfThinning'] ?? 'Stopień przerzedzenia', cv(c, 'degreeOfThinning'))}
        ${checkboxRow(FIELD_LABELS['alopeciaAffectedAreas'] ?? 'Dotkięte obszary', cv(c, 'alopeciaAffectedAreas'))}
        ${fieldRow(FIELD_LABELS['miniaturization'] ?? 'Miniaturyzacja', cv(c, 'miniaturization'))}
        ${fieldRow(FIELD_LABELS['follicularUnits'] ?? 'Jednostki folikularne', cv(c, 'follicularUnits'))}
        ${fieldRow(FIELD_LABELS['pullTest'] ?? 'Pull Test', cv(c, 'pullTest'))}
        ${fieldRow(FIELD_LABELS['alopeciaOther'] ?? 'Inne', cv(c, 'alopeciaOther'))}
        ${fieldRow(FIELD_LABELS['norwoodHamiltonStage'] ?? 'Norwood-Hamilton', cv(c, 'norwoodHamiltonStage'))}
        ${fieldRow(FIELD_LABELS['ludwigStage'] ?? 'Ludwig', cv(c, 'ludwigStage'))}
      </div>
      <div>
        ${sectionHeader('6. ZALECENIA DO PIELĘGNACJI')}
        ${fieldRow(FIELD_LABELS['careRecommendationsWashing'] ?? 'Mycie', cv(c, 'careRecommendationsWashing'))}
        ${fieldRow(FIELD_LABELS['careRecommendationsTopical'] ?? 'Wcierki', cv(c, 'careRecommendationsTopical'))}
        ${fieldRow(FIELD_LABELS['careRecommendationsSupplement'] ?? 'Suplementacja', cv(c, 'careRecommendationsSupplement'))}
        ${fieldRow(FIELD_LABELS['careRecommendationsBehavior'] ?? 'Zmiany behawioralne', cv(c, 'careRecommendationsBehavior'))}
        ${fieldRow(FIELD_LABELS['visitsProcedures'] ?? 'Zabiegi gabinetowe', cv(c, 'visitsProcedures'))}
      </div>
    </div>`;

  // ─── UWAGI ────────────────────────────────────────────────────────────────
  const remarksSection = cv(c, 'generalRemarks') ? `
    ${sectionHeader('8. UWAGI OGÓLNE')}
    <div class="remarks-box">${escapeHtml(String(cv(c, 'generalRemarks')))}</div>
  ` : '';

  // ─── FULL HTML ─────────────────────────────────────────────────────────────
  const html = `
    <!DOCTYPE html>
    <html lang="pl">
    <head>
      <meta charset="UTF-8">
      <title>Karta Konsultacyjna</title>
      <style>
        @page { margin: 14mm 12mm; }
        * { box-sizing: border-box; }
        body {
          font-family: 'Helvetica Neue', 'Arial', sans-serif;
          font-size: 9pt;
          line-height: 1.4;
          color: #111;
          margin: 0;
          padding: 0;
          background: #fff;
        }

        /* ── Document header ── */
        .doc-header {
          text-align: center;
          border-bottom: 2.5px solid #1a3a5c;
          margin-bottom: 14px;
          padding-bottom: 8px;
        }
        .doc-title {
          font-size: 15pt;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 1px;
          color: #1a3a5c;
          margin: 0 0 4px 0;
        }
        .doc-meta {
          font-size: 8.5pt;
          color: #555;
          text-align: right;
        }

        /* ── Patient info ── */
        .patient-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0 20px;
          background: #f6f8fb;
          border-radius: 4px;
          padding: 8px 10px;
          margin-bottom: 12px;
        }

        /* ── Section headers ── */
        .section-header {
          background: #e0e7ef;
          font-weight: 700;
          font-size: 9.5pt;
          padding: 4px 8px;
          margin: 12px 0 6px 0;
          border-left: 4px solid #1a3a5c;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: #1a3a5c;
        }
        .subsection-header {
          font-weight: 700;
          font-size: 8.5pt;
          text-decoration: underline;
          margin: 0 0 4px 0;
          color: #1a3a5c;
        }

        /* ── Grid layouts ── */
        .two-col {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
          margin-bottom: 6px;
        }
        .three-col {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 8px;
          margin-bottom: 6px;
        }

        /* ── Data boxes ── */
        .data-box {
          border: 1px solid #ccd6e0;
          border-radius: 3px;
          padding: 6px 8px;
          background: #fafbfc;
          break-inside: avoid;
        }

        /* ── Field rows ── */
        .field-row {
          display: flex;
          border-bottom: 1px dotted #ddd;
          padding: 1.5px 0;
          gap: 4px;
          font-size: 8.5pt;
        }
        .field-label {
          font-weight: 600;
          min-width: 110px;
          flex-shrink: 0;
          color: #333;
        }
        .field-value {
          color: #111;
          flex: 1;
        }

        /* ── Checkbox items ── */
        .checkbox-item {
          display: flex;
          align-items: flex-start;
          gap: 4px;
          padding: 1.5px 0;
          font-size: 8.5pt;
        }
        .cb-bullet {
          color: #1a3a5c;
          font-size: 9pt;
          flex-shrink: 0;
        }
        .cb-label {
          font-weight: 600;
          min-width: 110px;
          flex-shrink: 0;
          color: #333;
        }
        .cb-value {
          color: #111;
          flex: 1;
        }

        /* ── Care routine row ── */
        .care-row {
          border-top: 1px dashed #ccc;
          margin-top: 6px;
          padding-top: 4px;
          font-size: 8.5pt;
        }

        /* ── Doctor inline notes ── */
        .doctor-note {
          background: #FFFBEB;
          border: 1px solid #FCD34D;
          border-radius: 3px;
          padding: 3px 6px;
          margin: 3px 0;
          font-size: 8pt;
          font-style: italic;
          color: #92400E;
        }
        .doctor-note .note-icon { margin-right: 4px; }
        .doctor-note .note-text { }

        /* ── Empty section state ── */
        .empty-box {
          background: #F8F9FA;
          border-color: #E0E0E0;
          opacity: 0.8;
        }
        .empty-note {
          font-style: italic;
          color: #9E9E9E;
          font-size: 8pt;
          margin: 4px 0;
        }
        .empty-field {
          font-style: italic;
          color: #9E9E9E;
          font-size: 8pt;
        }

        /* ── Diagnosis ── */
        .diagnosis-text {
          font-size: 10pt;
          font-weight: 700;
          margin-bottom: 6px;
          color: #1a3a5c;
        }

        /* ── Remarks ── */
        .remarks-box {
          border: 1px solid #ccd6e0;
          background: #fffbe6;
          border-radius: 3px;
          padding: 6px 8px;
          font-size: 8.5pt;
          margin-bottom: 6px;
        }

        /* ── Footer ── */
        .doc-footer {
          margin-top: 16px;
          padding-top: 6px;
          border-top: 1px solid #ccc;
          font-size: 7.5pt;
          color: #666;
          text-align: right;
        }

        /* ── Page breaks ── */
        .page-break { page-break-before: always; }
      </style>
    </head>
    <body>

      ${getLogoHTMLForPDF('small')}

      <!-- Document header -->
      <div class="doc-header">
        <div class="doc-title">Karta Konsultacyjna</div>
        <div class="doc-meta">Data: <strong>${formatDate(c.consultationDate)}</strong></div>
      </div>

      <!-- Patient info -->
      ${patientSection}

      <!-- Problems -->
      ${problemsSection}

      <!-- Anamnesis -->
      ${anamnesisSection}

      <!-- Trichoscopy -->
      <div class="page-break"></div>
      ${trichoscopySection}

      <!-- Lab results -->
      ${labSection}

      <!-- Diagnosis + Recommendations -->
      <div class="page-break"></div>
      ${diagnosisSection}

      <!-- Remarks -->
      ${remarksSection}

      <!-- Footer -->
      <div class="doc-footer">
        Dokument wygenerowany elektronicznie. Lekarz prowadzący: ${escapeHtml(c.doctor?.name || '')} | Data wydruku: ${formatDateTime(new Date())}
      </div>

    </body>
    </html>
  `;

  let browser;
  try {
    const fs = require('fs');
    let executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
    if (!executablePath) {
      const possiblePaths = [
        '/usr/bin/chromium-browser',
        '/usr/bin/chromium',
        '/snap/bin/chromium',
        '/usr/bin/google-chrome',
        '/usr/bin/google-chrome-stable',
      ];
      for (const path of possiblePaths) {
        if (fs.existsSync(path)) {
          executablePath = path;
          break;
        }
      }
    }

    browser = await puppeteer.launch({
      headless: true,
      executablePath: executablePath || undefined,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
    });

    const page = await browser.newPage();
    await page.setDefaultNavigationTimeout(60000);

    try {
      await page.setContent(html, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (contentError: any) {
      console.warn('Błąd ładowania zawartości HTML z logo:', contentError.message);
      const htmlWithoutLogo = html.replace(/<img[^>]*src="data:image[^"]*"[^>]*>/gi, '');
      await page.setContent(htmlWithoutLogo, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
    });
    return Buffer.from(pdf);
  } catch (error: any) {
    console.error('Błąd generowania PDF konsultacji:', error);
    try {
      if (browser) {
        const page = await browser.newPage();
        const htmlWithoutLogo = html.replace(/<img[^>]*src="data:image[^"]*"[^>]*>/gi, '');
        await page.setContent(htmlWithoutLogo, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await new Promise(resolve => setTimeout(resolve, 1000));
        const pdf = await page.pdf({
          format: 'A4',
          printBackground: true,
          margin: { top: '0', right: '0', bottom: '0', left: '0' },
        });
        await browser.close();
        return Buffer.from(pdf);
      }
    } catch (fallbackError: any) {
      if (browser) await browser.close();
      throw new Error(`Błąd generowania PDF: ${error.message || 'Nieznany błąd'}`);
    }
    throw new Error(`Błąd generowania PDF: ${error.message || 'Nieznany błąd'}`);
  } finally {
    if (browser) await browser.close();
  }
};

export const generateCarePlanPDF = async (carePlan: any): Promise<Buffer> => {
  const html = `
    <!DOCTYPE html>
    <html lang="pl">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Plan Opieki Trychologicznej</title>
      <style>
        body { font-family: Arial, sans-serif; font-size: 11pt; line-height: 1.6; margin: 20px; color: #333; }
        .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
        .header h1 { margin: 0; font-size: 18pt; }
        .patient-info { background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
        .week-section { margin-bottom: 30px; page-break-inside: avoid; border: 1px solid #ddd; padding: 15px; border-radius: 5px; }
        .week-title { font-size: 16pt; font-weight: bold; margin-bottom: 15px; color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 8px; }
        .week-content { margin-left: 10px; }
        .week-item { margin-bottom: 12px; }
        .week-item-label { font-weight: bold; color: #555; margin-bottom: 5px; }
        .week-item-value { margin-left: 15px; }
        .global-notes { background-color: #fff3cd; padding: 15px; border-left: 4px solid #ffc107; margin-bottom: 20px; }
      </style>
    </head>
    <body>
      ${getLogoHTMLForPDF('small')}
      <div class="header">
        <h1>PLAN OPIEKI TRYCHOLOGICZNEJ</h1>
        <p><strong>${carePlan.title}</strong></p>
        <p>Czas trwania: ${carePlan.totalDurationWeeks} tygodni</p>
      </div>
      <div class="patient-info">
        <h2>Dane pacjenta</h2>
        <p><strong>${carePlan.patient.firstName} ${carePlan.patient.lastName}</strong></p>
        ${carePlan.patient.phone ? `<p>Telefon: ${carePlan.patient.phone}</p>` : ''}
        ${carePlan.patient.email ? `<p>Email: ${carePlan.patient.email}</p>` : ''}
      </div>
      ${carePlan.notes ? `<div class="global-notes"><h3>Uwagi ogólne</h3><p>${carePlan.notes}</p></div>` : ''}
      ${carePlan.weeks.map((week: any) => `
        <div class="week-section">
          <div class="week-title">Tydzień ${week.weekNumber}</div>
          <div class="week-content">
            ${week.description ? `<div class="week-item"><div class="week-item-label">Opis:</div><div class="week-item-value">${week.description}</div></div>` : ''}
            ${week.washingRoutine ? `<div class="week-item"><div class="week-item-label">Rutyna mycia:</div><div class="week-item-value">${week.washingRoutine}</div></div>` : ''}
            ${week.topicalProducts ? `<div class="week-item"><div class="week-item-label">Produkty miejscowe:</div><div class="week-item-value">${week.topicalProducts}</div></div>` : ''}
            ${week.supplements ? `<div class="week-item"><div class="week-item-label">Suplementacja:</div><div class="week-item-value">${week.supplements}</div></div>` : ''}
            ${week.inClinicProcedures ? `<div class="week-item"><div class="week-item-label">Zabiegi w klinice:</div><div class="week-item-value">${week.inClinicProcedures}</div></div>` : ''}
            ${week.remarks ? `<div class="week-item"><div class="week-item-label">Uwagi:</div><div class="week-item-value">${week.remarks}</div></div>` : ''}
          </div>
        </div>
      `).join('')}
      <div style="margin-top: 40px; text-align: right; font-size: 9pt; color: #666;">
        <p>Wygenerowano: ${formatDateTime(new Date())}</p>
        <p>Lekarz: ${carePlan.createdBy?.name || ''}</p>
      </div>
    </body>
    </html>
  `;

  let browser;
  try {
    const fs = require('fs');
    let executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
    if (!executablePath) {
      for (const p of ['/usr/bin/chromium-browser', '/usr/bin/chromium', '/snap/bin/chromium', '/usr/bin/google-chrome']) {
        if (fs.existsSync(p)) { executablePath = p; break; }
      }
    }
    browser = await puppeteer.launch({
      headless: true,
      executablePath: executablePath || undefined,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
    });
    const page = await browser.newPage();
    await page.setDefaultNavigationTimeout(30000);
    try {
      await page.setContent(html, { waitUntil: 'domcontentloaded', timeout: 30000 });
    } catch {
      const htmlWithoutLogo = html.replace(/<img[^>]*src="data:image[^"]*"[^>]*>/gi, '');
      await page.setContent(htmlWithoutLogo, { waitUntil: 'domcontentloaded', timeout: 30000 });
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '20mm', right: '15mm', bottom: '20mm', left: '15mm' },
    });
    return Buffer.from(pdf);
  } catch (error: any) {
    console.error('Błąd generowania PDF planu opieki:', error);
    throw new Error(`Błąd generowania PDF: ${error.message || 'Nieznany błąd'}`);
  } finally {
    if (browser) await browser.close();
  }
};

export { generateLabResultPDF, generatePatientInfoPDF } from './pdfServiceAdditional';
