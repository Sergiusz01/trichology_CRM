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

// Helper functions are now exported above

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

// Pomocnik do formatowania pól JSON (tablice)
const formatJsonField = (value: any): string => {
  if (!value) return '';
  if (Array.isArray(value)) {
    return escapeHtml(value.join(', '));
  }
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return escapeHtml(parsed.join(', '));
      }
      return escapeHtml(value);
    } catch {
      return escapeHtml(value);
    }
  }
  return escapeHtml(String(value));
};

// Pomocnik do renderowania "checkboxa" (wizualna reprezentacja wyboru)
const renderCheckboxInfo = (label: string, value: any, isBoolean = false) => {
  if (!value && value !== false && value !== 0) return '';
  const displayValue = isBoolean ? (value ? 'TAK' : 'NIE') : formatJsonField(value);
  return `
    <div class="checkbox-item">
      <span class="cb-box">■</span>
      <span class="cb-label">${escapeHtml(label)}:</span>
      <span class="cb-value">${displayValue}</span>
    </div>
  `;
};

export const generateConsultationPDF = async (consultation: any): Promise<Buffer> => {
  const getDynamicValue = (key: string) => {
    if (consultation?.dynamicData && Object.prototype.hasOwnProperty.call(consultation.dynamicData, key)) {
      return consultation.dynamicData[key];
    }
    return consultation?.[key];
  };

  const html = `
    <!DOCTYPE html>
    <html lang="pl">
    <head>
      <meta charset="UTF-8">
      <title>Karta Konsultacyjna</title>
      <style>
        @page {
          margin: 10mm 10mm 10mm 10mm; /* Małe marginesy dla oszczędności papieru */
        }
        body {
          font-family: 'Helvetica', 'Arial', sans-serif;
          font-size: 9pt; /* Mniejsza czcionka, by zmieścić więcej */
          line-height: 1.3;
          color: #000;
          margin: 0;
          padding: 0;
        }
        
        /* Layout Grid System */
        .container { width: 100%; }
        .row { display: flex; width: 100%; margin-bottom: 4px; }
        .col-2 { width: 50%; padding-right: 5px; }
        .col-3 { width: 33.33%; padding-right: 5px; }
        .col-4 { width: 25%; padding-right: 5px; }
        
        /* Stylistyka nagłówków jak w formularzu */
        .header-main {
          text-align: center;
          border-bottom: 2px solid #000;
          margin-bottom: 10px;
          padding-bottom: 5px;
        }
        .header-title { font-size: 14pt; font-weight: bold; text-transform: uppercase; margin: 0; }
        .header-sub { font-size: 8pt; letter-spacing: 2px; text-transform: uppercase; }

        .section-header {
          background-color: #e0e0e0;
          font-weight: bold;
          font-size: 10pt;
          padding: 2px 5px;
          margin-top: 8px;
          margin-bottom: 4px;
          border-left: 5px solid #333;
          text-transform: uppercase;
        }

        .sub-header {
          font-weight: bold;
          font-size: 9pt;
          margin-top: 4px;
          margin-bottom: 2px;
          text-decoration: underline;
        }

        /* Styl pól danych */
        .field-row {
          display: flex;
          border-bottom: 1px dotted #ccc;
          padding-bottom: 1px;
          margin-bottom: 2px;
        }
        .field-label { font-weight: bold; margin-right: 5px; min-width: 80px; }
        .field-value { flex: 1; font-weight: normal; }

        /* Stylizacja "checkboxów" */
        .checkbox-group { display: flex; flex-wrap: wrap; gap: 8px; }
        .checkbox-item { display: flex; align-items: center; margin-right: 10px; font-size: 8.5pt; }
        .cb-box { font-size: 10px; margin-right: 3px; color: #333; }
        .cb-label { color: #444; margin-right: 3px; }
        .cb-value { font-weight: bold; color: #000; }

        /* Ramki dla sekcji problemów (aby wyglądało jak tabela) */
        .boxed-section {
          border: 1px solid #ccc;
          padding: 5px;
          margin-bottom: 5px;
          break-inside: avoid;
        }
        
        .footer {
          margin-top: 20px;
          font-size: 7pt;
          text-align: right;
          color: #666;
          border-top: 1px solid #ddd;
        }
      </style>
    </head>
    <body>

      ${getLogoHTMLForPDF('small')}
      <div class="header-main">
        <div class="header-title">Karta Konsultacyjna</div>
        <div class="header-sub">Rich Diagnostic</div>
        <div style="font-size: 9pt; margin-top: 5px; text-align: right;">
          Data konsultacji: <strong>${formatDate(consultation.consultationDate)}</strong>
        </div>
      </div>

      <div class="section-header">Dane Pacjenta</div>
      <div class="row">
        <div class="col-2">
           <div class="field-row"><span class="field-label">Pacjent:</span><span class="field-value">${escapeHtml(consultation.patient?.firstName || '')} ${escapeHtml(consultation.patient?.lastName || '')}</span></div>
           <div class="field-row"><span class="field-label">Wiek/Płeć:</span><span class="field-value">${consultation.patient?.age || '-'} lat / ${consultation.patient?.gender === 'MALE' ? 'M' : consultation.patient?.gender === 'FEMALE' ? 'K' : '-'}</span></div>
        </div>
        <div class="col-2">
           <div class="field-row"><span class="field-label">Telefon:</span><span class="field-value">${escapeHtml(consultation.patient?.phone || '-')}</span></div>
           <div class="field-row"><span class="field-label">Email:</span><span class="field-value">${escapeHtml(consultation.patient?.email || '-')}</span></div>
        </div>
      </div>

      <div class="section-header">Problem Główny</div>
      <div class="row">
        <div class="col-2 boxed-section">
            <div class="sub-header">1. WYPADANIE WŁOSÓW</div>
            ${consultation.hairLossSeverity ? renderCheckboxInfo('Nasilenie', consultation.hairLossSeverity) : ''}
            ${consultation.hairLossLocalization ? renderCheckboxInfo('Lokalizacja', consultation.hairLossLocalization) : ''}
            ${consultation.hairLossDuration ? renderCheckboxInfo('Czas trwania', consultation.hairLossDuration) : ''}
            ${consultation.hairLossShampoos ? `<div class="field-row"><span style="font-size:8pt">Szampon: ${escapeHtml(consultation.hairLossShampoos)}</span></div>` : ''}
            ${getDynamicValue('hairLossNotes') ? `<div class="field-row"><span style="font-size:8pt">Uwagi: ${escapeHtml(getDynamicValue('hairLossNotes'))}</span></div>` : ''}
        </div>

        <div class="col-2 boxed-section">
            <div class="sub-header">2. PRZETŁUSZCZANIE</div>
            ${consultation.oilyHairSeverity ? renderCheckboxInfo('Nasilenie', consultation.oilyHairSeverity) : ''}
            ${consultation.oilyHairWashingFreq ? renderCheckboxInfo('Mycie', consultation.oilyHairWashingFreq) : ''}
            ${consultation.oilyHairDuration ? renderCheckboxInfo('Trwanie', consultation.oilyHairDuration) : ''}
            ${consultation.oilyHairShampoos ? `<div class="field-row"><span style="font-size:8pt">Szampon: ${escapeHtml(consultation.oilyHairShampoos)}</span></div>` : ''}
            ${getDynamicValue('oilyHairNotes') ? `<div class="field-row"><span style="font-size:8pt">Uwagi: ${escapeHtml(getDynamicValue('oilyHairNotes'))}</span></div>` : ''}
        </div>
      </div>
      
      <div class="row">
         <div class="col-2 boxed-section">
            <div class="sub-header">3. ŁUSZCZENIE</div>
            ${consultation.scalingType ? renderCheckboxInfo('Rodzaj', consultation.scalingType) : ''}
            ${consultation.scalingSeverity ? renderCheckboxInfo('Nasilenie', consultation.scalingSeverity) : ''}
            ${consultation.scalingDuration ? renderCheckboxInfo('Czas trwania', consultation.scalingDuration) : ''}
            ${consultation.scalingOther ? `<div class="field-row"><span style="font-size:8pt">Inne: ${escapeHtml(consultation.scalingOther)}</span></div>` : ''}
        </div>
         <div class="col-2 boxed-section">
            <div class="sub-header">4. WRAŻLIWOŚĆ / INNE</div>
            ${consultation.sensitivityProblemType ? renderCheckboxInfo('Problem', consultation.sensitivityProblemType) : ''}
            ${consultation.sensitivitySeverity ? renderCheckboxInfo('Nasilenie', consultation.sensitivitySeverity) : ''}
            ${consultation.sensitivityDuration ? renderCheckboxInfo('Czas trwania', consultation.sensitivityDuration) : ''}
            ${consultation.sensitivityOther ? `<div class="field-row"><span style="font-size:8pt">Inne: ${escapeHtml(consultation.sensitivityOther)}</span></div>` : ''}
            ${consultation.inflammatoryStates ? renderCheckboxInfo('Stany zapalne', consultation.inflammatoryStates) : ''}
        </div>
      </div>

      <div class="section-header">Wywiad (Anamneza)</div>
      <div class="row" style="font-size: 8pt;">
        <div class="col-2">
            ${renderCheckboxInfo('Rodzina', consultation.familyHistory)}
            ${renderCheckboxInfo('Dermatolog', consultation.dermatologyVisits)}
            ${consultation.dermatologyVisitsReason ? `<div class="field-row"><span class="field-label">Powód:</span><span class="field-value">${escapeHtml(consultation.dermatologyVisitsReason)}</span></div>` : ''}
            ${renderCheckboxInfo('Ciąża', consultation.pregnancy)}
            ${renderCheckboxInfo('Miesiączki', consultation.menstruationRegularity)}
            ${consultation.contraception ? `<div class="field-row"><span class="field-label">Hormony:</span><span class="field-value">${escapeHtml(consultation.contraception)}</span></div>` : ''}
            ${renderCheckboxInfo('Stres', consultation.stressLevel)}
            ${renderCheckboxInfo('Leki', consultation.medications)}
            ${consultation.medicationsList ? `<div class="field-row"><span class="field-label">Lista leków:</span><span class="field-value">${escapeHtml(consultation.medicationsList)}</span></div>` : ''}
            ${consultation.supplements ? `<div class="field-row"><span class="field-label">Suplementy:</span><span class="field-value">${escapeHtml(consultation.supplements)}</span></div>` : ''}
            ${getDynamicValue('supplementsDetails') ? `<div class="field-row"><span class="field-label">Jakie suplementy?:</span><span class="field-value">${escapeHtml(getDynamicValue('supplementsDetails'))}</span></div>` : ''}
        </div>
        <div class="col-2">
             ${renderCheckboxInfo('Znieczulenie', consultation.anesthesia)}
             ${renderCheckboxInfo('Chemioterapia', consultation.chemotherapy)}
             ${renderCheckboxInfo('Radioterapia', consultation.radiotherapy)}
             ${renderCheckboxInfo('Szczepienia', consultation.vaccination)}
             ${consultation.antibiotics ? `<div class="field-row"><span class="field-label">Antybiotyki:</span><span class="field-value">${escapeHtml(consultation.antibiotics)}</span></div>` : ''}
             ${getDynamicValue('antibioticsDetails') ? `<div class="field-row"><span class="field-label">Jakie antybiotyki? / kiedy?:</span><span class="field-value">${escapeHtml(getDynamicValue('antibioticsDetails'))}</span></div>` : ''}
             ${renderCheckboxInfo('Choroby', consultation.chronicDiseases)}
             ${consultation.chronicDiseasesList ? `<div class="field-row"><span class="field-label">Lista chorób:</span><span class="field-value">${escapeHtml(consultation.chronicDiseasesList)}</span></div>` : ''}
             ${renderCheckboxInfo('Specjaliści', consultation.specialists)}
             ${consultation.specialistsList ? `<div class="field-row"><span class="field-label">Jakiego:</span><span class="field-value">${escapeHtml(consultation.specialistsList)}</span></div>` : ''}
             ${renderCheckboxInfo('Zab. odżywiania', consultation.eatingDisorders)}
             ${consultation.foodIntolerances ? `<div class="field-row"><span class="field-label">Nietolerancje:</span><span class="field-value">${escapeHtml(consultation.foodIntolerances)}</span></div>` : ''}
             ${renderCheckboxInfo('Dieta', consultation.diet)}
             ${renderCheckboxInfo('Alergie', consultation.allergies)}
             ${renderCheckboxInfo('Metal w ciele', consultation.metalPartsInBody)}
        </div>
      </div>
      
      ${(consultation.careRoutineShampoo || consultation.careRoutineConditioner || consultation.careRoutineOils || consultation.careRoutineChemical) ? `
      <div style="border-top: 1px dashed #ccc; margin-top: 5px; padding-top:2px; font-size: 8pt;">
         <strong>Aktualna pielęgnacja:</strong> 
         ${consultation.careRoutineShampoo ? `Szampon: ${escapeHtml(consultation.careRoutineShampoo)}, ` : ''}
         ${consultation.careRoutineConditioner ? `Odżywka: ${escapeHtml(consultation.careRoutineConditioner)}, ` : ''}
         ${consultation.careRoutineOils ? `Wcierki: ${escapeHtml(consultation.careRoutineOils)}, ` : ''}
         ${consultation.careRoutineChemical ? `Zabiegi: ${escapeHtml(consultation.careRoutineChemical)}` : ''}
      </div>` : ''}

      <div class="section-header">Trichoskopia - Badanie</div>
      <div class="row">
        <div class="col-3 boxed-section">
            <div class="sub-header">SKÓRA GŁOWY</div>
            ${consultation.scalpType ? renderCheckboxInfo('Typ', consultation.scalpType) : ''}
            ${consultation.scalpAppearance ? renderCheckboxInfo('Objawy', consultation.scalpAppearance) : ''}
            ${consultation.skinLesions ? renderCheckboxInfo('Wykwity', consultation.skinLesions) : ''}
            ${consultation.hyperhidrosis ? renderCheckboxInfo('Potliwość', consultation.hyperhidrosis) : ''}
            ${consultation.hyperkeratinization ? renderCheckboxInfo('Hiperkeratynizacja', consultation.hyperkeratinization) : ''}
            ${consultation.sebaceousSecretion ? renderCheckboxInfo('Wydzielina', consultation.sebaceousSecretion) : ''}
            ${consultation.seborrheaType ? renderCheckboxInfo('Łojotok', consultation.seborrheaType) : ''}
            ${consultation.seborrheaTypeOther ? `<div class="field-row"><span style="font-size:8pt">Inne: ${escapeHtml(consultation.seborrheaTypeOther)}</span></div>` : ''}
            ${consultation.dandruffType ? renderCheckboxInfo('Złuszczanie', consultation.dandruffType) : ''}
            ${consultation.scalpPH ? renderCheckboxInfo('pH', consultation.scalpPH) : ''}
        </div>

        <div class="col-3 boxed-section">
            <div class="sub-header">STAN WŁOSÓW</div>
            ${consultation.hairQuality ? renderCheckboxInfo('Jakość', consultation.hairQuality) : ''}
            ${consultation.hairDamage ? renderCheckboxInfo('Uszkodzenia', consultation.hairDamage) : ''}
            ${consultation.hairDamageReason ? renderCheckboxInfo('Przyczyna', consultation.hairDamageReason) : ''}
            ${consultation.hairShape ? renderCheckboxInfo('Kształt', consultation.hairShape) : ''}
            ${consultation.hairTypes ? renderCheckboxInfo('Typy', consultation.hairTypes) : ''}
            ${consultation.regrowingHairs ? renderCheckboxInfo('Odrastające', consultation.regrowingHairs) : ''}
            ${consultation.vellusMiniaturizedHairs ? renderCheckboxInfo('Vellus', consultation.vellusMiniaturizedHairs) : ''}
        </div>

        <div class="col-3 boxed-section">
             <div class="sub-header">CECHY SPECYFICZNE</div>
             <div class="checkbox-group">
                ${consultation.vascularPatterns ? `<span class="checkbox-item">[x] ${formatJsonField(consultation.vascularPatterns)}</span>` : ''}
                ${consultation.perifollicularFeatures ? `<span class="checkbox-item">[x] ${formatJsonField(consultation.perifollicularFeatures)}</span>` : ''}
                ${consultation.scalpDiseases ? `<span class="checkbox-item">[x] ${formatJsonField(consultation.scalpDiseases)}</span>` : ''}
                ${consultation.otherDiagnostics ? `<span class="checkbox-item">[x] ${formatJsonField(consultation.otherDiagnostics)}</span>` : ''}
             </div>
        </div>
      </div>

      <div class="row">
         <div class="col-2">
            <div class="section-header">Rozpoznanie (Diagnoza)</div>
            <div style="font-weight:bold; font-size: 10pt; margin: 5px 0;">
                ${escapeHtml(consultation.diagnosis || 'Brak wpisu')}
            </div>
            ${consultation.alopeciaTypes ? `<div style="font-size: 8.5pt;">Typ: ${formatJsonField(consultation.alopeciaTypes)}</div>` : ''}
            ${consultation.alopeciaType ? `<div style="font-size: 8.5pt;">Klasyfikacja: ${escapeHtml(consultation.alopeciaType)}</div>` : ''}
            ${consultation.degreeOfThinning ? `<div style="font-size: 8.5pt;">Przerzedzenie: ${escapeHtml(consultation.degreeOfThinning)}</div>` : ''}
            ${consultation.alopeciaAffectedAreas ? `<div style="font-size: 8.5pt;">Obszary: ${formatJsonField(consultation.alopeciaAffectedAreas)}</div>` : ''}
            ${consultation.miniaturization ? `<div style="font-size: 8.5pt;">Miniaturyzacja: ${escapeHtml(consultation.miniaturization)}</div>` : ''}
            ${consultation.follicularUnits ? `<div style="font-size: 8.5pt;">Jednostki: ${escapeHtml(consultation.follicularUnits)}</div>` : ''}
            ${consultation.pullTest ? `<div style="font-size: 8.5pt;">Pull Test: ${escapeHtml(consultation.pullTest)}</div>` : ''}
            ${consultation.alopeciaOther ? `<div style="font-size: 8.5pt;">Inne: ${escapeHtml(consultation.alopeciaOther)}</div>` : ''}
            ${consultation.norwoodHamiltonStage ? `<div style="font-size: 8.5pt; margin-top: 5px;">Norwood-Hamilton: ${escapeHtml(consultation.norwoodHamiltonStage)}${consultation.norwoodHamiltonNotes ? ` (${escapeHtml(consultation.norwoodHamiltonNotes)})` : ''}</div>` : ''}
            ${consultation.ludwigStage ? `<div style="font-size: 8.5pt;">Ludwig: ${escapeHtml(consultation.ludwigStage)}${consultation.ludwigNotes ? ` (${escapeHtml(consultation.ludwigNotes)})` : ''}</div>` : ''}
         </div>
         
         <div class="col-2" style="background-color: #f9f9f9; border: 1px solid #ddd; padding: 5px;">
            <div class="section-header" style="background:none; border:none; padding:0; margin:0;">Zalecenia Domowe</div>
            <div style="font-size: 8.5pt;">
                ${consultation.careRecommendationsWashing ? `<div><strong>Mycie:</strong> ${escapeHtml(consultation.careRecommendationsWashing)}</div>` : ''}
                ${consultation.careRecommendationsTopical ? `<div><strong>Wcierki:</strong> ${escapeHtml(consultation.careRecommendationsTopical)}</div>` : ''}
                ${consultation.careRecommendationsSupplement ? `<div><strong>Suplementy:</strong> ${escapeHtml(consultation.careRecommendationsSupplement)}</div>` : ''}
                ${consultation.careRecommendationsBehavior ? `<div><strong>Zachowanie:</strong> ${escapeHtml(consultation.careRecommendationsBehavior)}</div>` : ''}
                ${consultation.visitsProcedures ? `<div><strong>Gabinet:</strong> ${escapeHtml(consultation.visitsProcedures)}</div>` : ''}
            </div>
         </div>
      </div>
      
      ${consultation.generalRemarks ? `
       <div class="boxed-section" style="margin-top: 5px; background: #fffbe6;">
         <strong>Uwagi dodatkowe:</strong> ${escapeHtml(consultation.generalRemarks)}
       </div>
      ` : ''}

      <div class="footer">
        Dokument wygenerowany elektronicznie. Lekarz prowadzący: ${escapeHtml(consultation.doctor?.name || 'Nieznany')} | Data wydruku: ${formatDateTime(new Date())}
      </div>

    </body>
    </html>
  `;

  let browser;
  try {
    // Try to find system Chromium first, then use Puppeteer's bundled Chrome
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
    // Set a longer timeout for page content loading
    await page.setDefaultNavigationTimeout(60000);
    
    // Try to load HTML with logo, but if it fails, use fallback
    try {
      await page.setContent(html, { 
        waitUntil: 'domcontentloaded', 
        timeout: 60000 
      });
      // Wait a bit for images to load
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (contentError: any) {
      console.warn('Błąd ładowania zawartości HTML z logo:', contentError.message);
      // Try without logo if base64 image causes issues
      const htmlWithoutLogo = html.replace(/<img[^>]*src="data:image[^"]*"[^>]*>/gi, '');
      await page.setContent(htmlWithoutLogo, { 
        waitUntil: 'domcontentloaded', 
        timeout: 60000 
      });
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      // Minimalne marginesy ustawione w @page CSS, tutaj zerujemy domyślne puppeteer'a
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
    });
    return Buffer.from(pdf);
  } catch (error: any) {
    console.error('Błąd generowania PDF konsultacji:', error);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    // Try to generate PDF without logo as last resort
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
      console.error('Błąd fallback PDF:', fallbackError);
      if (browser) await browser.close();
      throw new Error(`Błąd generowania PDF: ${error.message || 'Nieznany błąd'}`);
    }
    throw new Error(`Błąd generowania PDF: ${error.message || 'Nieznany błąd'}`);
  } finally {
    if (browser) {
      await browser.close();
    }
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
        body {
          font-family: Arial, sans-serif;
          font-size: 11pt;
          line-height: 1.6;
          margin: 20px;
          color: #333;
        }
        .header {
          text-align: center;
          margin-bottom: 30px;
          border-bottom: 2px solid #333;
          padding-bottom: 20px;
        }
        .header h1 {
          margin: 0;
          font-size: 18pt;
        }
        .patient-info {
          background-color: #f9f9f9;
          padding: 15px;
          border-radius: 5px;
          margin-bottom: 20px;
        }
        .week-section {
          margin-bottom: 30px;
          page-break-inside: avoid;
          border: 1px solid #ddd;
          padding: 15px;
          border-radius: 5px;
        }
        .week-title {
          font-size: 16pt;
          font-weight: bold;
          margin-bottom: 15px;
          color: #2c3e50;
          border-bottom: 2px solid #3498db;
          padding-bottom: 8px;
        }
        .week-content {
          margin-left: 10px;
        }
        .week-item {
          margin-bottom: 12px;
        }
        .week-item-label {
          font-weight: bold;
          color: #555;
          margin-bottom: 5px;
        }
        .week-item-value {
          margin-left: 15px;
        }
        .global-notes {
          background-color: #fff3cd;
          padding: 15px;
          border-left: 4px solid #ffc107;
          margin-bottom: 20px;
        }
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

      ${carePlan.notes ? `
      <div class="global-notes">
        <h3>Uwagi ogólne</h3>
        <p>${carePlan.notes}</p>
      </div>
      ` : ''}

      ${carePlan.weeks.map((week: any) => `
        <div class="week-section">
          <div class="week-title">Tydzień ${week.weekNumber}</div>
          <div class="week-content">
            ${week.description ? `
            <div class="week-item">
              <div class="week-item-label">Opis:</div>
              <div class="week-item-value">${week.description}</div>
            </div>
            ` : ''}
            ${week.washingRoutine ? `
            <div class="week-item">
              <div class="week-item-label">Rutyna mycia:</div>
              <div class="week-item-value">${week.washingRoutine}</div>
            </div>
            ` : ''}
            ${week.topicalProducts ? `
            <div class="week-item">
              <div class="week-item-label">Produkty miejscowe:</div>
              <div class="week-item-value">${week.topicalProducts}</div>
            </div>
            ` : ''}
            ${week.supplements ? `
            <div class="week-item">
              <div class="week-item-label">Suplementacja:</div>
              <div class="week-item-value">${week.supplements}</div>
            </div>
            ` : ''}
            ${week.inClinicProcedures ? `
            <div class="week-item">
              <div class="week-item-label">Zabiegi w klinice:</div>
              <div class="week-item-value">${week.inClinicProcedures}</div>
            </div>
            ` : ''}
            ${week.remarks ? `
            <div class="week-item">
              <div class="week-item-label">Uwagi:</div>
              <div class="week-item-value">${week.remarks}</div>
            </div>
            ` : ''}
          </div>
        </div>
      `).join('')}

      <div style="margin-top: 40px; text-align: right; font-size: 9pt; color: #666;">
        <p>Wygenerowano: ${formatDateTime(new Date())}</p>
        <p>Lekarz: ${carePlan.createdBy.name}</p>
      </div>
    </body>
    </html>
  `;

  let browser;
  try {
    // Try to find system Chromium first, then use Puppeteer's bundled Chrome
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
    // Set a longer timeout for page content loading
    await page.setDefaultNavigationTimeout(30000);
    
    // Try to load HTML with logo, but if it fails, use fallback
    try {
      await page.setContent(html, { waitUntil: 'domcontentloaded', timeout: 30000 });
    } catch (contentError: any) {
      console.warn('Błąd ładowania zawartości HTML, próba bez logo:', contentError.message);
      // Try without logo if base64 image causes issues
      const htmlWithoutLogo = html.replace(/<img[^>]*src="data:image[^"]*"[^>]*>/gi, '');
      await page.setContent(htmlWithoutLogo, { waitUntil: 'domcontentloaded', timeout: 30000 });
    }
    
    // Wait a bit for images to load
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20mm',
        right: '15mm',
        bottom: '20mm',
        left: '15mm',
      },
    });
    return Buffer.from(pdf);
  } catch (error: any) {
    console.error('Błąd generowania PDF planu opieki:', error);
    console.error('Error details:', error.message, error.stack);
    throw new Error(`Błąd generowania PDF: ${error.message || 'Nieznany błąd'}`);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
};

// Re-export functions from pdfServiceAdditional
export { generateLabResultPDF, generatePatientInfoPDF } from './pdfServiceAdditional';
