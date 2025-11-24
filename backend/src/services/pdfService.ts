import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const formatDate = (date: Date): string => {
  return new Date(date).toLocaleDateString('pl-PL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

const formatDateTime = (date: Date): string => {
  return new Date(date).toLocaleString('pl-PL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const generateConsultationPDF = async (consultation: any): Promise<Buffer> => {
  const html = `
    <!DOCTYPE html>
    <html lang="pl">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Karta Konsultacyjna</title>
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
        .section {
          margin-bottom: 25px;
          page-break-inside: avoid;
        }
        .section-title {
          font-size: 14pt;
          font-weight: bold;
          margin-bottom: 10px;
          padding: 8px;
          background-color: #f0f0f0;
          border-left: 4px solid #333;
        }
        .field {
          margin-bottom: 8px;
        }
        .field-label {
          font-weight: bold;
          display: inline-block;
          min-width: 200px;
        }
        .field-value {
          display: inline-block;
        }
        .two-columns {
          display: flex;
          gap: 20px;
        }
        .column {
          flex: 1;
        }
        .patient-info {
          background-color: #f9f9f9;
          padding: 15px;
          border-radius: 5px;
          margin-bottom: 20px;
        }
        .empty-field {
          color: #999;
          font-style: italic;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>KARTA KONSULTACYJNA TRYCHOLOGICZNA</h1>
        <p>Data konsultacji: ${formatDate(consultation.consultationDate)}</p>
      </div>

      <div class="patient-info">
        <h2>Dane pacjenta</h2>
        <div class="field">
          <span class="field-label">Imię i nazwisko:</span>
          <span class="field-value">${consultation.patient.firstName} ${consultation.patient.lastName}</span>
        </div>
        ${consultation.patient.age ? `
        <div class="field">
          <span class="field-label">Wiek:</span>
          <span class="field-value">${consultation.patient.age} lat</span>
        </div>
        ` : ''}
        ${consultation.patient.gender ? `
        <div class="field">
          <span class="field-label">Płeć:</span>
          <span class="field-value">${consultation.patient.gender === 'MALE' ? 'Mężczyzna' : consultation.patient.gender === 'FEMALE' ? 'Kobieta' : 'Inna'}</span>
        </div>
        ` : ''}
        ${consultation.patient.phone ? `
        <div class="field">
          <span class="field-label">Telefon:</span>
          <span class="field-value">${consultation.patient.phone}</span>
        </div>
        ` : ''}
        ${consultation.patient.email ? `
        <div class="field">
          <span class="field-label">Email:</span>
          <span class="field-value">${consultation.patient.email}</span>
        </div>
        ` : ''}
      </div>

      ${consultation.hairLossSeverity || consultation.hairLossLocalization ? `
      <div class="section">
        <div class="section-title">1. Wypadanie włosów</div>
        ${consultation.hairLossSeverity ? `<div class="field"><span class="field-label">Nasilenie:</span><span class="field-value">${consultation.hairLossSeverity}</span></div>` : ''}
        ${consultation.hairLossLocalization ? `<div class="field"><span class="field-label">Lokalizacja:</span><span class="field-value">${consultation.hairLossLocalization}</span></div>` : ''}
        ${consultation.hairLossDuration ? `<div class="field"><span class="field-label">Czas trwania:</span><span class="field-value">${consultation.hairLossDuration}</span></div>` : ''}
        ${consultation.hairLossShampoos ? `<div class="field"><span class="field-label">Używane szampony:</span><span class="field-value">${consultation.hairLossShampoos}</span></div>` : ''}
        ${consultation.hairLossNotes ? `<div class="field"><span class="field-label">Uwagi:</span><span class="field-value">${consultation.hairLossNotes}</span></div>` : ''}
      </div>
      ` : ''}

      ${consultation.oilyHairSeverity || consultation.oilyHairWashingFreq ? `
      <div class="section">
        <div class="section-title">2. Przetłuszczanie się włosów</div>
        ${consultation.oilyHairSeverity ? `<div class="field"><span class="field-label">Nasilenie:</span><span class="field-value">${consultation.oilyHairSeverity}</span></div>` : ''}
        ${consultation.oilyHairWashingFreq ? `<div class="field"><span class="field-label">Częstotliwość mycia:</span><span class="field-value">${consultation.oilyHairWashingFreq}</span></div>` : ''}
        ${consultation.oilyHairDuration ? `<div class="field"><span class="field-label">Czas trwania:</span><span class="field-value">${consultation.oilyHairDuration}</span></div>` : ''}
        ${consultation.oilyHairShampoos ? `<div class="field"><span class="field-label">Używane szampony:</span><span class="field-value">${consultation.oilyHairShampoos}</span></div>` : ''}
        ${consultation.oilyHairNotes ? `<div class="field"><span class="field-label">Uwagi:</span><span class="field-value">${consultation.oilyHairNotes}</span></div>` : ''}
      </div>
      ` : ''}

      ${consultation.scalingSeverity || consultation.scalingType ? `
      <div class="section">
        <div class="section-title">3. Łuszczenie się skóry głowy</div>
        ${consultation.scalingSeverity ? `<div class="field"><span class="field-label">Nasilenie:</span><span class="field-value">${consultation.scalingSeverity}</span></div>` : ''}
        ${consultation.scalingType ? `<div class="field"><span class="field-label">Typ:</span><span class="field-value">${consultation.scalingType}</span></div>` : ''}
        ${consultation.scalingDuration ? `<div class="field"><span class="field-label">Czas trwania:</span><span class="field-value">${consultation.scalingDuration}</span></div>` : ''}
        ${consultation.scalingNotes ? `<div class="field"><span class="field-label">Uwagi:</span><span class="field-value">${consultation.scalingNotes}</span></div>` : ''}
      </div>
      ` : ''}

      ${consultation.sensitivitySeverity || consultation.sensitivityProblemType ? `
      <div class="section">
        <div class="section-title">4. Wrażliwość skóry głowy</div>
        ${consultation.sensitivitySeverity ? `<div class="field"><span class="field-label">Nasilenie:</span><span class="field-value">${consultation.sensitivitySeverity}</span></div>` : ''}
        ${consultation.sensitivityProblemType ? `<div class="field"><span class="field-label">Typ problemu:</span><span class="field-value">${consultation.sensitivityProblemType}</span></div>` : ''}
        ${consultation.sensitivityDuration ? `<div class="field"><span class="field-label">Czas trwania:</span><span class="field-value">${consultation.sensitivityDuration}</span></div>` : ''}
        ${consultation.sensitivityNotes ? `<div class="field"><span class="field-label">Uwagi:</span><span class="field-value">${consultation.sensitivityNotes}</span></div>` : ''}
      </div>
      ` : ''}

      ${consultation.inflammatoryStates || consultation.papules ? `
      <div class="section">
        <div class="section-title">5. Stany zapalne / Grudki</div>
        ${consultation.inflammatoryStates ? `<div class="field"><span class="field-label">Stany zapalne:</span><span class="field-value">${consultation.inflammatoryStates}</span></div>` : ''}
        ${consultation.papules ? `<div class="field"><span class="field-label">Grudki:</span><span class="field-value">${consultation.papules}</span></div>` : ''}
      </div>
      ` : ''}

      ${consultation.familyHistory || consultation.medications || consultation.stressLevel ? `
      <div class="section">
        <div class="section-title">6. Wywiad / Anamneza</div>
        <div class="two-columns">
          <div class="column">
            ${consultation.familyHistory ? `<div class="field"><span class="field-label">Wywiad rodzinny:</span><span class="field-value">${consultation.familyHistory}</span></div>` : ''}
            ${consultation.dermatologyVisits ? `<div class="field"><span class="field-label">Wizyty u dermatologa:</span><span class="field-value">${consultation.dermatologyVisits}</span></div>` : ''}
            ${consultation.pregnancy ? `<div class="field"><span class="field-label">Ciąża:</span><span class="field-value">${consultation.pregnancy}</span></div>` : ''}
            ${consultation.menstruationRegularity ? `<div class="field"><span class="field-label">Regularność miesiączkowania:</span><span class="field-value">${consultation.menstruationRegularity}</span></div>` : ''}
            ${consultation.contraception ? `<div class="field"><span class="field-label">Antykoncepcja:</span><span class="field-value">${consultation.contraception}</span></div>` : ''}
            ${consultation.stressLevel ? `<div class="field"><span class="field-label">Poziom stresu:</span><span class="field-value">${consultation.stressLevel}</span></div>` : ''}
            ${consultation.medications ? `<div class="field"><span class="field-label">Leki:</span><span class="field-value">${consultation.medications}</span></div>` : ''}
            ${consultation.supplements ? `<div class="field"><span class="field-label">Suplementy:</span><span class="field-value">${consultation.supplements}</span></div>` : ''}
          </div>
          <div class="column">
            ${consultation.anesthesia ? `<div class="field"><span class="field-label">Znieczulenie:</span><span class="field-value">${consultation.anesthesia}</span></div>` : ''}
            ${consultation.chemotherapy ? `<div class="field"><span class="field-label">Chemioterapia:</span><span class="field-value">${consultation.chemotherapy}</span></div>` : ''}
            ${consultation.radiotherapy ? `<div class="field"><span class="field-label">Radioterapia:</span><span class="field-value">${consultation.radiotherapy}</span></div>` : ''}
            ${consultation.vaccination ? `<div class="field"><span class="field-label">Szczepienia:</span><span class="field-value">${consultation.vaccination}</span></div>` : ''}
            ${consultation.antibiotics ? `<div class="field"><span class="field-label">Antybiotyki:</span><span class="field-value">${consultation.antibiotics}</span></div>` : ''}
            ${consultation.chronicDiseases ? `<div class="field"><span class="field-label">Choroby przewlekłe:</span><span class="field-value">${consultation.chronicDiseases}</span></div>` : ''}
            ${consultation.specialists ? `<div class="field"><span class="field-label">Specjaliści:</span><span class="field-value">${consultation.specialists}</span></div>` : ''}
            ${consultation.eatingDisorders ? `<div class="field"><span class="field-label">Zaburzenia odżywiania:</span><span class="field-value">${consultation.eatingDisorders}</span></div>` : ''}
            ${consultation.foodIntolerances ? `<div class="field"><span class="field-label">Nietolerancje pokarmowe:</span><span class="field-value">${consultation.foodIntolerances}</span></div>` : ''}
            ${consultation.diet ? `<div class="field"><span class="field-label">Dieta:</span><span class="field-value">${consultation.diet}</span></div>` : ''}
            ${consultation.allergies ? `<div class="field"><span class="field-label">Alergie:</span><span class="field-value">${consultation.allergies}</span></div>` : ''}
            ${consultation.metalPartsInBody ? `<div class="field"><span class="field-label">Metalowe części w ciele:</span><span class="field-value">${consultation.metalPartsInBody}</span></div>` : ''}
          </div>
        </div>
        ${consultation.careRoutineShampoo || consultation.careRoutineConditioner ? `
        <div style="margin-top: 15px;">
          <strong>Rutyna pielęgnacyjna:</strong>
          ${consultation.careRoutineShampoo ? `<div class="field"><span class="field-label">Szampon:</span><span class="field-value">${consultation.careRoutineShampoo}</span></div>` : ''}
          ${consultation.careRoutineConditioner ? `<div class="field"><span class="field-label">Odżywka/Maska:</span><span class="field-value">${consultation.careRoutineConditioner}</span></div>` : ''}
          ${consultation.careRoutineOils ? `<div class="field"><span class="field-label">Oleje/Lotiony:</span><span class="field-value">${consultation.careRoutineOils}</span></div>` : ''}
          ${consultation.careRoutineChemical ? `<div class="field"><span class="field-label">Zabiegi chemiczne/Termiczne:</span><span class="field-value">${consultation.careRoutineChemical}</span></div>` : ''}
        </div>
        ` : ''}
      </div>
      ` : ''}

      ${consultation.scalpType || consultation.hairQuality || consultation.seborrheaType ? `
      <div class="section">
        <div class="section-title">7. Trichoskopia</div>
        <div class="two-columns">
          <div class="column">
            ${consultation.scalpType ? `<div class="field"><span class="field-label">Typ skóry głowy:</span><span class="field-value">${consultation.scalpType}</span></div>` : ''}
            ${consultation.scalpAppearance ? `<div class="field"><span class="field-label">Wygląd skóry głowy:</span><span class="field-value">${consultation.scalpAppearance}</span></div>` : ''}
            ${consultation.scalpSymptoms ? `<div class="field"><span class="field-label">Objawy:</span><span class="field-value">${consultation.scalpSymptoms}</span></div>` : ''}
            ${consultation.skinLesions ? `<div class="field"><span class="field-label">Zmiany skórne:</span><span class="field-value">${consultation.skinLesions}</span></div>` : ''}
            ${consultation.hyperhidrosis ? `<div class="field"><span class="field-label">Nadmierna potliwość:</span><span class="field-value">${consultation.hyperhidrosis}</span></div>` : ''}
            ${consultation.hyperkeratinization ? `<div class="field"><span class="field-label">Hiperkeratynizacja:</span><span class="field-value">${consultation.hyperkeratinization}</span></div>` : ''}
            ${consultation.sebaceousSecretion ? `<div class="field"><span class="field-label">Wydzielina łojowa:</span><span class="field-value">${consultation.sebaceousSecretion}</span></div>` : ''}
            ${consultation.seborrheaType ? `<div class="field"><span class="field-label">Typ łojotoku:</span><span class="field-value">${consultation.seborrheaType}</span></div>` : ''}
            ${consultation.dandruffType ? `<div class="field"><span class="field-label">Typ łupieżu:</span><span class="field-value">${consultation.dandruffType}</span></div>` : ''}
            ${consultation.scalpPH ? `<div class="field"><span class="field-label">pH skóry głowy:</span><span class="field-value">${consultation.scalpPH}</span></div>` : ''}
          </div>
          <div class="column">
            ${consultation.hairDamage ? `<div class="field"><span class="field-label">Uszkodzenie włosów:</span><span class="field-value">${consultation.hairDamage}</span></div>` : ''}
            ${consultation.hairDamageReason ? `<div class="field"><span class="field-label">Przyczyna uszkodzenia:</span><span class="field-value">${consultation.hairDamageReason}</span></div>` : ''}
            ${consultation.hairQuality ? `<div class="field"><span class="field-label">Jakość włosów:</span><span class="field-value">${consultation.hairQuality}</span></div>` : ''}
            ${consultation.hairShape ? `<div class="field"><span class="field-label">Kształt włosów:</span><span class="field-value">${consultation.hairShape}</span></div>` : ''}
            ${consultation.hairTypes ? `<div class="field"><span class="field-label">Typy włosów:</span><span class="field-value">${consultation.hairTypes}</span></div>` : ''}
            ${consultation.regrowingHairs ? `<div class="field"><span class="field-label">Włosy odrastające:</span><span class="field-value">${consultation.regrowingHairs}</span></div>` : ''}
            ${consultation.vellusMiniaturizedHairs ? `<div class="field"><span class="field-label">Włosy vellus/miniaturyzowane:</span><span class="field-value">${consultation.vellusMiniaturizedHairs}</span></div>` : ''}
          </div>
        </div>
      </div>
      ` : ''}

      ${consultation.vascularPatterns || consultation.seborrheicDermatitis || consultation.LLP ? `
      <div class="section">
        <div class="section-title">8. Diagnostyka</div>
        ${consultation.vascularPatterns ? `<div class="field"><span class="field-label">Wzorce naczyniowe:</span><span class="field-value">${consultation.vascularPatterns}</span></div>` : ''}
        ${consultation.perifollicularFeatures ? `<div class="field"><span class="field-label">Cechy okołomieszkowe:</span><span class="field-value">${consultation.perifollicularFeatures}</span></div>` : ''}
        ${consultation.seborrheicDermatitis ? `<div class="field"><span class="field-label">Łojotokowe zapalenie skóry:</span><span class="field-value">${consultation.seborrheicDermatitis}</span></div>` : ''}
        ${consultation.LLP ? `<div class="field"><span class="field-label">LLP:</span><span class="field-value">${consultation.LLP}</span></div>` : ''}
        ${consultation.AD ? `<div class="field"><span class="field-label">AD:</span><span class="field-value">${consultation.AD}</span></div>` : ''}
        ${consultation.mycosis ? `<div class="field"><span class="field-label">Grzybica:</span><span class="field-value">${consultation.mycosis}</span></div>` : ''}
        ${consultation.psoriasis ? `<div class="field"><span class="field-label">Łuszczyca:</span><span class="field-value">${consultation.psoriasis}</span></div>` : ''}
        ${consultation.otherDiagnostics ? `<div class="field"><span class="field-label">Inne cechy:</span><span class="field-value">${consultation.otherDiagnostics}</span></div>` : ''}
        ${consultation.trichodynia ? `<div class="field"><span class="field-label">Trychodynia:</span><span class="field-value">${consultation.trichodynia}</span></div>` : ''}
        ${consultation.hairlineRecession ? `<div class="field"><span class="field-label">Cofanie linii włosów:</span><span class="field-value">${consultation.hairlineRecession}</span></div>` : ''}
        ${consultation.trichokinesis ? `<div class="field"><span class="field-label">Trychokineza:</span><span class="field-value">${consultation.trichokinesis}</span></div>` : ''}
      </div>
      ` : ''}

      ${consultation.alopeciaTypes || consultation.degreeOfThinning ? `
      <div class="section">
        <div class="section-title">9. Diagnostyka łysienia</div>
        ${consultation.alopeciaTypes ? `<div class="field"><span class="field-label">Typy łysienia:</span><span class="field-value">${consultation.alopeciaTypes}</span></div>` : ''}
        ${consultation.degreeOfThinning ? `<div class="field"><span class="field-label">Stopień przerzedzenia:</span><span class="field-value">${consultation.degreeOfThinning}</span></div>` : ''}
        ${consultation.affectedAreas ? `<div class="field"><span class="field-label">Obszary objęte:</span><span class="field-value">${consultation.affectedAreas}</span></div>` : ''}
        ${consultation.miniaturization ? `<div class="field"><span class="field-label">Miniaturyzacja:</span><span class="field-value">${consultation.miniaturization}</span></div>` : ''}
        ${consultation.follicularUnits ? `<div class="field"><span class="field-label">Jednostki mieszkowe:</span><span class="field-value">${consultation.follicularUnits}</span></div>` : ''}
        ${consultation.pullTest ? `<div class="field"><span class="field-label">Test pociągania:</span><span class="field-value">${consultation.pullTest}</span></div>` : ''}
        ${consultation.alopeciaOther ? `<div class="field"><span class="field-label">Inne:</span><span class="field-value">${consultation.alopeciaOther}</span></div>` : ''}
      </div>
      ` : ''}

      ${consultation.diagnosis ? `
      <div class="section">
        <div class="section-title">10. Rozpoznanie</div>
        <div class="field-value" style="font-size: 12pt; font-weight: bold;">${consultation.diagnosis}</div>
      </div>
      ` : ''}

      ${consultation.careRecommendationsWashing || consultation.careRecommendationsTopical ? `
      <div class="section">
        <div class="section-title">11. Zalecenia</div>
        ${consultation.careRecommendationsWashing ? `<div class="field"><span class="field-label">Produkty do mycia:</span><span class="field-value">${consultation.careRecommendationsWashing}</span></div>` : ''}
        ${consultation.careRecommendationsTopical ? `<div class="field"><span class="field-label">Produkty miejscowe:</span><span class="field-value">${consultation.careRecommendationsTopical}</span></div>` : ''}
        ${consultation.careRecommendationsSupplement ? `<div class="field"><span class="field-label">Suplementacja:</span><span class="field-value">${consultation.careRecommendationsSupplement}</span></div>` : ''}
        ${consultation.careRecommendationsBehavior ? `<div class="field"><span class="field-label">Zmiany w zachowaniu:</span><span class="field-value">${consultation.careRecommendationsBehavior}</span></div>` : ''}
        ${consultation.careRecommendationsDiet ? `<div class="field"><span class="field-label">Dieta:</span><span class="field-value">${consultation.careRecommendationsDiet}</span></div>` : ''}
        ${consultation.careRecommendationsOther ? `<div class="field"><span class="field-label">Inne:</span><span class="field-value">${consultation.careRecommendationsOther}</span></div>` : ''}
      </div>
      ` : ''}

      ${consultation.visitsProcedures ? `
      <div class="section">
        <div class="section-title">12. Wizyty / Zabiegi</div>
        <div class="field-value">${consultation.visitsProcedures}</div>
      </div>
      ` : ''}

      ${consultation.norwoodHamiltonStage || consultation.ludwigStage ? `
      <div class="section">
        <div class="section-title">13. Skale Norwood-Hamilton i Ludwig</div>
        ${consultation.norwoodHamiltonStage ? `<div class="field"><span class="field-label">Stopień Norwood-Hamilton:</span><span class="field-value">${consultation.norwoodHamiltonStage}</span></div>` : ''}
        ${consultation.norwoodHamiltonNotes ? `<div class="field"><span class="field-label">Uwagi:</span><span class="field-value">${consultation.norwoodHamiltonNotes}</span></div>` : ''}
        ${consultation.ludwigStage ? `<div class="field"><span class="field-label">Stopień Ludwig:</span><span class="field-value">${consultation.ludwigStage}</span></div>` : ''}
        ${consultation.ludwigNotes ? `<div class="field"><span class="field-label">Uwagi:</span><span class="field-value">${consultation.ludwigNotes}</span></div>` : ''}
      </div>
      ` : ''}

      ${consultation.generalRemarks ? `
      <div class="section">
        <div class="section-title">14. Uwagi ogólne</div>
        <div class="field-value">${consultation.generalRemarks}</div>
      </div>
      ` : ''}

      <div style="margin-top: 40px; text-align: right; font-size: 9pt; color: #666;">
        <p>Wygenerowano: ${formatDateTime(new Date())}</p>
        <p>Lekarz: ${consultation.doctor.name}</p>
      </div>
    </body>
    </html>
  `;

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
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
  } finally {
    await browser.close();
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

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
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
  } finally {
    await browser.close();
  }
};


