import puppeteer from 'puppeteer';
import { prisma } from '../prisma';
import { getLogoHTMLForPDF } from '../utils/logo';

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

export const generateConsultationPDF = async (consultation: any): Promise<Buffer> => {
  const c = consultation;
  const p = c.patient || {};
  const lab = Array.isArray(c.labResults) && c.labResults.length > 0 ? c.labResults[0] : null;

  // ─── Section helpers ───────────────────────────────────────────────────────
  const sectionHeader = (title: string) =>
    `<div class="section-header">${escapeHtml(title)}</div>`;

  const subsectionHeader = (title: string) =>
    `<p class="subsection-header">${escapeHtml(title)}</p>`;

  const box = (content: string) =>
    content.trim() ? `<div class="data-box">${content}</div>` : '';

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

  // ─── PROBLEMY ─────────────────────────────────────────────────────────────
  const hairLossBox = cv(c, 'hairLossSeverity') || cv(c, 'hairLossLocalization') || cv(c, 'hairLossDuration')
    ? box(`
        ${subsectionHeader('1. WYPADANIE WŁOSÓW')}
        ${checkboxRow('Nasilenie', cv(c, 'hairLossSeverity'))}
        ${checkboxRow('Lokalizacja', cv(c, 'hairLossLocalization'))}
        ${checkboxRow('Czas trwania', cv(c, 'hairLossDuration'))}
        ${fieldRow('Szampony', cv(c, 'hairLossShampoos'))}
        ${fieldRow('Uwagi', cv(c, 'hairLossNotes'))}
      `)
    : '';

  const oilyHairBox = cv(c, 'oilyHairSeverity') || cv(c, 'oilyHairWashingFreq')
    ? box(`
        ${subsectionHeader('2. PRZETŁUSZCZANIE WŁOSÓW')}
        ${checkboxRow('Nasilenie', cv(c, 'oilyHairSeverity'))}
        ${checkboxRow('Częstotliwość mycia', cv(c, 'oilyHairWashingFreq'))}
        ${checkboxRow('Czas trwania', cv(c, 'oilyHairDuration'))}
        ${fieldRow('Szampony', cv(c, 'oilyHairShampoos'))}
        ${fieldRow('Uwagi', cv(c, 'oilyHairNotes'))}
      `)
    : '';

  const scalingBox = cv(c, 'scalingSeverity') || cv(c, 'scalingType')
    ? box(`
        ${subsectionHeader('3. ŁUSZCZENIE SKÓRY GŁOWY')}
        ${checkboxRow('Nasilenie', cv(c, 'scalingSeverity'))}
        ${checkboxRow('Typ', cv(c, 'scalingType'))}
        ${checkboxRow('Czas trwania', cv(c, 'scalingDuration'))}
        ${fieldRow('Inne', cv(c, 'scalingOther'))}
      `)
    : '';

  const sensitivityBox = cv(c, 'sensitivitySeverity') || cv(c, 'sensitivityProblemType')
    ? box(`
        ${subsectionHeader('4. WRAŻLIWOŚĆ / INNE')}
        ${checkboxRow('Problem', cv(c, 'sensitivityProblemType'))}
        ${checkboxRow('Nasilenie', cv(c, 'sensitivitySeverity'))}
        ${checkboxRow('Czas trwania', cv(c, 'sensitivityDuration'))}
        ${fieldRow('Inne', cv(c, 'sensitivityOther'))}
        ${fieldRow('Stany zapalne', cv(c, 'inflammatoryStates'))}
      `)
    : '';

  const problemsSection = (hairLossBox || oilyHairBox || scalingBox || sensitivityBox)
    ? `
      ${sectionHeader('PROBLEMY ZGŁASZANE PRZEZ PACJENTA')}
      <div class="two-col">
        ${hairLossBox}
        ${oilyHairBox}
        ${scalingBox}
        ${sensitivityBox}
      </div>`
    : '';

  // ─── WYWIAD ───────────────────────────────────────────────────────────────
  const hasAnamnesis = cv(c, 'familyHistory') || cv(c, 'medications') || cv(c, 'stressLevel') ||
    cv(c, 'supplements') || cv(c, 'antibiotics') || cv(c, 'chronicDiseases');

  const anamnesisSection = hasAnamnesis ? `
    ${sectionHeader('WYWIAD (ANAMNEZA)')}
    <div class="two-col">
      <div>
        ${checkboxRow('Rodzina', cv(c, 'familyHistory'))}
        ${checkboxRow('Dermatolog', cv(c, 'dermatologyVisits'))}
        ${fieldRow('Powód dermatolog', cv(c, 'dermatologyVisitsReason'))}
        ${checkboxRow('Ciąża', cv(c, 'pregnancy'))}
        ${checkboxRow('Miesiączki', cv(c, 'menstruationRegularity'))}
        ${fieldRow('Hormony/Antykoncepcja', cv(c, 'contraception'))}
        ${checkboxRow('Stres', cv(c, 'stressLevel'))}
        ${checkboxRow('Leki', cv(c, 'medications'))}
        ${fieldRow('Lista leków', cv(c, 'medicationsList'))}
        ${fieldRow('Suplementy', cv(c, 'supplements'))}
        ${fieldRow('Jakie suplementy', cv(c, 'supplementsDetails'))}
      </div>
      <div>
        ${checkboxRow('Znieczulenie', cv(c, 'anesthesia'))}
        ${checkboxRow('Chemioterapia', cv(c, 'chemotherapy'))}
        ${checkboxRow('Radioterapia', cv(c, 'radiotherapy'))}
        ${checkboxRow('Szczepienia', cv(c, 'vaccination'))}
        ${fieldRow('Antybiotyki', cv(c, 'antibiotics'))}
        ${fieldRow('Jakie antybiotyki / kiedy', cv(c, 'antibioticsDetails'))}
        ${checkboxRow('Choroby przewlekłe', cv(c, 'chronicDiseases'))}
        ${fieldRow('Lista chorób', cv(c, 'chronicDiseasesList'))}
        ${checkboxRow('Specjaliści', cv(c, 'specialists'))}
        ${fieldRow('Jakiego specjalisty', cv(c, 'specialistsList'))}
        ${checkboxRow('Zaburzenia odżywiania', cv(c, 'eatingDisorders'))}
        ${fieldRow('Nietolerancje', cv(c, 'foodIntolerances'))}
        ${checkboxRow('Dieta', cv(c, 'diet'))}
        ${checkboxRow('Alergie', cv(c, 'allergies'))}
        ${checkboxRow('Metal w ciele', cv(c, 'metalPartsInBody'))}
      </div>
    </div>
    ${(cv(c, 'careRoutineShampoo') || cv(c, 'careRoutineConditioner') || cv(c, 'careRoutineOils') || cv(c, 'careRoutineChemical')) ? `
      <div class="care-row">
        <strong>Aktualna pielęgnacja:</strong>
        ${cv(c, 'careRoutineShampoo') ? `Szampon: ${escapeHtml(cv(c, 'careRoutineShampoo'))}, ` : ''}
        ${cv(c, 'careRoutineConditioner') ? `Odżywka: ${escapeHtml(cv(c, 'careRoutineConditioner'))}, ` : ''}
        ${cv(c, 'careRoutineOils') ? `Wcierki: ${escapeHtml(cv(c, 'careRoutineOils'))}, ` : ''}
        ${cv(c, 'careRoutineChemical') ? `Zabiegi: ${escapeHtml(cv(c, 'careRoutineChemical'))}` : ''}
      </div>` : ''}
  ` : '';

  // ─── TRICHOSKOPIA ─────────────────────────────────────────────────────────
  const hasTrichoscopy = cv(c, 'scalpType') || cv(c, 'hairQuality') || cv(c, 'seborrheaType') ||
    cv(c, 'scalpAppearance') || cv(c, 'skinLesions') || cv(c, 'hairDamage') ||
    cv(c, 'hairTypes') || cv(c, 'vellusMiniaturizedHairs') || cv(c, 'vascularPatterns') ||
    cv(c, 'perifollicularFeatures') || cv(c, 'scalpDiseases') || cv(c, 'otherDiagnostics');

  const trichoscopySection = hasTrichoscopy ? `
    ${sectionHeader('TRICHOSKOPIA — BADANIE')}
    <div class="three-col">
      ${box(`
        ${subsectionHeader('SKÓRA GŁOWY')}
        ${checkboxRow('Typ', cv(c, 'scalpType'))}
        ${checkboxRow('Objawy', cv(c, 'scalpAppearance'))}
        ${checkboxRow('Wykwity', cv(c, 'skinLesions'))}
        ${checkboxRow('Potliwość', cv(c, 'hyperhidrosis'))}
        ${checkboxRow('Hiperkeratynizacja', cv(c, 'hyperkeratinization'))}
        ${checkboxRow('Wydzielina', cv(c, 'sebaceousSecretion'))}
        ${checkboxRow('Łojotok', cv(c, 'seborrheaType'))}
        ${fieldRow('Inne łojotok', cv(c, 'seborrheaTypeOther'))}
        ${checkboxRow('Złuszczanie', cv(c, 'dandruffType'))}
        ${fieldRow('pH', cv(c, 'scalpPH'))}
      `)}
      ${box(`
        ${subsectionHeader('STAN WŁOSÓW')}
        ${checkboxRow('Jakość', cv(c, 'hairQuality'))}
        ${checkboxRow('Uszkodzenia', cv(c, 'hairDamage'))}
        ${checkboxRow('Przyczyna uszkodzeń', cv(c, 'hairDamageReason'))}
        ${checkboxRow('Kształt', cv(c, 'hairShape'))}
        ${checkboxRow('Typy', cv(c, 'hairTypes'))}
        ${checkboxRow('Odrastające', cv(c, 'regrowingHairs'))}
        ${checkboxRow('Vellus / Zminiaturyzowane', cv(c, 'vellusMiniaturizedHairs'))}
      `)}
      ${box(`
        ${subsectionHeader('CECHY SPECYFICZNE')}
        ${checkboxRow('Unaczynienie', cv(c, 'vascularPatterns'))}
        ${checkboxRow('Cechy okołomieszkowe', cv(c, 'perifollicularFeatures'))}
        ${checkboxRow('Choroby skóry głowy', cv(c, 'scalpDiseases'))}
        ${checkboxRow('Inne diagnostyki', cv(c, 'otherDiagnostics'))}
      `)}
    </div>
  ` : '';

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
    ${sectionHeader('ROZPOZNANIE (DIAGNOZA)')}
    <div class="two-col">
      <div>
        <div class="diagnosis-text">${escapeHtml(String(cv(c, 'diagnosis') || 'Brak wpisu'))}</div>
        ${checkboxRow('Typ łysienia', cv(c, 'alopeciaTypes'))}
        ${fieldRow('Klasyfikacja', cv(c, 'alopeciaType'))}
        ${fieldRow('Stopień przerzedzenia', cv(c, 'degreeOfThinning'))}
        ${checkboxRow('Obszary', cv(c, 'alopeciaAffectedAreas'))}
        ${fieldRow('Miniaturyzacja', cv(c, 'miniaturization'))}
        ${fieldRow('Jednostki mieszkowe', cv(c, 'follicularUnits'))}
        ${fieldRow('Pull Test', cv(c, 'pullTest'))}
        ${fieldRow('Inne', cv(c, 'alopeciaOther'))}
        ${fieldRow('Norwood-Hamilton', cv(c, 'norwoodHamiltonStage'))}
        ${fieldRow('Ludwig', cv(c, 'ludwigStage'))}
      </div>
      <div>
        ${sectionHeader('ZALECENIA DOMOWE')}
        ${fieldRow('Mycie', cv(c, 'careRecommendationsWashing'))}
        ${fieldRow('Wcierki', cv(c, 'careRecommendationsTopical'))}
        ${fieldRow('Suplementy', cv(c, 'careRecommendationsSupplement'))}
        ${fieldRow('Zachowanie', cv(c, 'careRecommendationsBehavior'))}
        ${fieldRow('Zabiegi gabinetowe', cv(c, 'visitsProcedures'))}
      </div>
    </div>`;

  // ─── UWAGI ────────────────────────────────────────────────────────────────
  const remarksSection = cv(c, 'generalRemarks') ? `
    ${sectionHeader('UWAGI DODATKOWE')}
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
      ${hasTrichoscopy ? '<div class="page-break"></div>' : ''}
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
