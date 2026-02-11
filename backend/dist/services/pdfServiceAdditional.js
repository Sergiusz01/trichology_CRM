"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generatePatientInfoPDF = exports.generateLabResultPDF = void 0;
const puppeteer_1 = __importDefault(require("puppeteer"));
// Re-export formatDate and formatDateTime if needed, or import them
// For now, let's duplicate the helper functions
const formatDateHelper = (date) => {
    if (!date)
        return '-';
    return new Date(date).toLocaleDateString('pl-PL', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    });
};
const formatDateTimeHelper = (date) => {
    return new Date(date).toLocaleString('pl-PL', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
};
// Generate PDF for lab result
const generateLabResultPDF = async (labResult, patient) => {
    const getFlagColor = (flag) => {
        if (!flag)
            return '#666';
        switch (flag) {
            case 'LOW':
            case 'HIGH':
                return '#d32f2f';
            case 'NORMAL':
                return '#2e7d32';
            default:
                return '#666';
        }
    };
    const renderLabValue = (label, value, unit, refLow, refHigh, flag) => {
        if (value === null || value === undefined)
            return '';
        const flagColor = getFlagColor(flag);
        const flagText = flag ? ` (${flag})` : '';
        return `
      <tr>
        <td><strong>${label}</strong></td>
        <td>${value} ${unit || ''}</td>
        <td>${refLow !== null && refLow !== undefined ? refLow : '-'} - ${refHigh !== null && refHigh !== undefined ? refHigh : '-'}</td>
        <td style="color: ${flagColor}">${flag || '-'}${flagText}</td>
      </tr>
    `;
    };
    const html = `
    <!DOCTYPE html>
    <html lang="pl">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Wynik Badań Laboratoryjnych</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          font-size: 10pt;
          line-height: 1.5;
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
        .patient-info table {
          width: 100%;
          border-collapse: collapse;
        }
        .patient-info td {
          padding: 5px;
          border-bottom: 1px solid #ddd;
        }
        .patient-info td:first-child {
          font-weight: bold;
          width: 40%;
        }
        .lab-results {
          margin-top: 20px;
        }
        .lab-results table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
        }
        .lab-results th {
          background-color: #2c3e50;
          color: white;
          padding: 10px;
          text-align: left;
          border: 1px solid #1a252f;
        }
        .lab-results td {
          padding: 8px;
          border: 1px solid #ddd;
        }
        .lab-results tr:nth-child(even) {
          background-color: #f9f9f9;
        }
        .section-title {
          font-size: 14pt;
          font-weight: bold;
          margin-top: 25px;
          margin-bottom: 10px;
          color: #2c3e50;
          border-bottom: 2px solid #3498db;
          padding-bottom: 5px;
        }
        .notes {
          margin-top: 20px;
          padding: 15px;
          background-color: #fff3cd;
          border-left: 4px solid #ffc107;
        }
        .footer {
          margin-top: 40px;
          text-align: right;
          font-size: 9pt;
          color: #666;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>WYNIK BADAŃ LABORATORYJNYCH</h1>
        <p>Data badania: ${formatDateHelper(labResult.date)}</p>
      </div>

      <div class="patient-info">
        <table>
          <tr>
            <td>Pacjent:</td>
            <td>${patient.firstName} ${patient.lastName}</td>
          </tr>
          ${patient.age ? `<tr><td>Wiek:</td><td>${patient.age} lat</td></tr>` : ''}
          ${patient.gender ? `<tr><td>Płeć:</td><td>${patient.gender === 'MALE' ? 'Mężczyzna' : patient.gender === 'FEMALE' ? 'Kobieta' : 'Inna'}</td></tr>` : ''}
          ${patient.phone ? `<tr><td>Telefon:</td><td>${patient.phone}</td></tr>` : ''}
          ${patient.email ? `<tr><td>Email:</td><td>${patient.email}</td></tr>` : ''}
        </table>
      </div>

      <div class="lab-results">
        ${(labResult.hgb !== null && labResult.hgb !== undefined) ||
        (labResult.rbc !== null && labResult.rbc !== undefined) ||
        (labResult.wbc !== null && labResult.wbc !== undefined) ||
        (labResult.plt !== null && labResult.plt !== undefined) ? `
        <div class="section-title">MORFOLOGIA KRWI</div>
        <table>
          <thead>
            <tr>
              <th>Parametr</th>
              <th>Wartość</th>
              <th>Zakres referencyjny</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${renderLabValue('Hemoglobina (HGB)', labResult.hgb, labResult.hgbUnit || '', labResult.hgbRefLow, labResult.hgbRefHigh, labResult.hgbFlag)}
            ${renderLabValue('Erytrocyty (RBC)', labResult.rbc, labResult.rbcUnit || '', labResult.rbcRefLow, labResult.rbcRefHigh, labResult.rbcFlag)}
            ${renderLabValue('Leukocyty (WBC)', labResult.wbc, labResult.wbcUnit || '', labResult.wbcRefLow, labResult.wbcRefHigh, labResult.wbcFlag)}
            ${renderLabValue('Płytki krwi (PLT)', labResult.plt, labResult.pltUnit || '', labResult.pltRefLow, labResult.pltRefHigh, labResult.pltFlag)}
          </tbody>
        </table>
        ` : ''}

        ${(labResult.ferritin !== null && labResult.ferritin !== undefined) ||
        (labResult.iron !== null && labResult.iron !== undefined) ? `
        <div class="section-title">ŻELAZO</div>
        <table>
          <thead>
            <tr>
              <th>Parametr</th>
              <th>Wartość</th>
              <th>Zakres referencyjny</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${renderLabValue('Ferrytyna', labResult.ferritin, labResult.ferritinUnit || '', labResult.ferritinRefLow, labResult.ferritinRefHigh, labResult.ferritinFlag)}
            ${renderLabValue('Żelazo', labResult.iron, labResult.ironUnit || '', labResult.ironRefLow, labResult.ironRefHigh, labResult.ironFlag)}
          </tbody>
        </table>
        ` : ''}

        ${(labResult.vitaminD3 !== null && labResult.vitaminD3 !== undefined) ||
        (labResult.vitaminB12 !== null && labResult.vitaminB12 !== undefined) ||
        (labResult.folicAcid !== null && labResult.folicAcid !== undefined) ? `
        <div class="section-title">WITAMINY</div>
        <table>
          <thead>
            <tr>
              <th>Parametr</th>
              <th>Wartość</th>
              <th>Zakres referencyjny</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${renderLabValue('Witamina D3', labResult.vitaminD3, labResult.vitaminD3Unit || '', labResult.vitaminD3RefLow, labResult.vitaminD3RefHigh, labResult.vitaminD3Flag)}
            ${renderLabValue('Witamina B12', labResult.vitaminB12, labResult.vitaminB12Unit || '', labResult.vitaminB12RefLow, labResult.vitaminB12RefHigh, labResult.vitaminB12Flag)}
            ${renderLabValue('Kwas foliowy', labResult.folicAcid, labResult.folicAcidUnit || '', labResult.folicAcidRefLow, labResult.folicAcidRefHigh, labResult.folicAcidFlag)}
          </tbody>
        </table>
        ` : ''}

        ${(labResult.tsh !== null && labResult.tsh !== undefined) ||
        (labResult.ft3 !== null && labResult.ft3 !== undefined) ||
        (labResult.ft4 !== null && labResult.ft4 !== undefined) ? `
        <div class="section-title">FUNKCJA TARCZYCY</div>
        <table>
          <thead>
            <tr>
              <th>Parametr</th>
              <th>Wartość</th>
              <th>Zakres referencyjny</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${renderLabValue('TSH', labResult.tsh, labResult.tshUnit || '', labResult.tshRefLow, labResult.tshRefHigh, labResult.tshFlag)}
            ${renderLabValue('FT3', labResult.ft3, labResult.ft3Unit || '', labResult.ft3RefLow, labResult.ft3RefHigh, labResult.ft3Flag)}
            ${renderLabValue('FT4', labResult.ft4, labResult.ft4Unit || '', labResult.ft4RefLow, labResult.ft4RefHigh, labResult.ft4Flag)}
          </tbody>
        </table>
        ` : ''}
      </div>

      ${labResult.notes ? `
      <div class="notes">
        <strong>Uwagi:</strong><br>
        ${labResult.notes}
      </div>
      ` : ''}

      <div class="footer">
        <p>Wygenerowano: ${formatDateTimeHelper(new Date())}</p>
      </div>
    </body>
    </html>
  `;
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
    let browser;
    try {
        browser = await puppeteer_1.default.launch({
            headless: true,
            executablePath: executablePath || undefined,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
        });
        const page = await browser.newPage();
        await page.setDefaultNavigationTimeout(60000);
        await page.setContent(html, {
            waitUntil: 'domcontentloaded',
            timeout: 60000
        });
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
    }
    catch (error) {
        console.error('Błąd generowania PDF wyniku badania:', error);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        throw error;
    }
    finally {
        if (browser) {
            await browser.close();
        }
    }
};
exports.generateLabResultPDF = generateLabResultPDF;
// Generate PDF for patient info
const generatePatientInfoPDF = async (patient) => {
    const html = `
    <!DOCTYPE html>
    <html lang="pl">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Informacje o Pacjencie</title>
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
        .info-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 20px;
        }
        .info-table td {
          padding: 10px;
          border-bottom: 1px solid #ddd;
        }
        .info-table td:first-child {
          font-weight: bold;
          width: 40%;
          background-color: #f5f5f5;
        }
        .footer {
          margin-top: 40px;
          text-align: right;
          font-size: 9pt;
          color: #666;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>INFORMACJE O PACJENCIE</h1>
      </div>

      <table class="info-table">
        <tr>
          <td>Imię i nazwisko:</td>
          <td>${patient.firstName} ${patient.lastName}</td>
        </tr>
        ${patient.age ? `<tr><td>Wiek:</td><td>${patient.age} lat</td></tr>` : ''}
        ${patient.gender ? `<tr><td>Płeć:</td><td>${patient.gender === 'MALE' ? 'Mężczyzna' : patient.gender === 'FEMALE' ? 'Kobieta' : 'Inna'}</td></tr>` : ''}
        ${patient.occupation ? `<tr><td>Zawód:</td><td>${patient.occupation}</td></tr>` : ''}
        ${patient.address ? `<tr><td>Adres:</td><td>${patient.address}</td></tr>` : ''}
        ${patient.phone ? `<tr><td>Telefon:</td><td>${patient.phone}</td></tr>` : ''}
        ${patient.email ? `<tr><td>Email:</td><td>${patient.email}</td></tr>` : ''}
        <tr>
          <td>Data utworzenia:</td>
          <td>${formatDateTimeHelper(patient.createdAt)}</td>
        </tr>
        <tr>
          <td>Data ostatniej aktualizacji:</td>
          <td>${formatDateTimeHelper(patient.updatedAt)}</td>
        </tr>
      </table>

      <div class="footer">
        <p>Wygenerowano: ${formatDateTimeHelper(new Date())}</p>
      </div>
    </body>
    </html>
  `;
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
    let browser;
    try {
        browser = await puppeteer_1.default.launch({
            headless: true,
            executablePath: executablePath || undefined,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
        });
        const page = await browser.newPage();
        await page.setDefaultNavigationTimeout(60000);
        await page.setContent(html, {
            waitUntil: 'domcontentloaded',
            timeout: 60000
        });
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
    }
    catch (error) {
        console.error('Błąd generowania PDF informacji o pacjencie:', error);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        throw error;
    }
    finally {
        if (browser) {
            await browser.close();
        }
    }
};
exports.generatePatientInfoPDF = generatePatientInfoPDF;
//# sourceMappingURL=pdfServiceAdditional.js.map