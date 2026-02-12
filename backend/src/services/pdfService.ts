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

// Helper: get value from consultation or dynamicData
const cv = (c: any, key: string): any => {
  const v = (c as any)[key];
  if (v !== undefined && v !== null && v !== '') return v;
  return ((c.dynamicData || {}) as Record<string, any>)[key];
};

// Helper: render checkbox (■ if value matches option)
const chk = (val: any, opt: string): string => {
  if (val === null || val === undefined) return '□';
  let s = '';
  if (Array.isArray(val)) s = val.map(String).join(',').toLowerCase();
  else if (typeof val === 'string') {
    try {
      const parsed = JSON.parse(val);
      s = Array.isArray(parsed) ? parsed.map(String).join(',').toLowerCase() : val.toLowerCase();
    } catch {
      s = val.toLowerCase();
    }
  } else s = String(val).toLowerCase();
  const o = opt.toLowerCase();
  return s.includes(o) ? '■' : '□';
};

export const generateConsultationPDF = async (consultation: any): Promise<Buffer> => {
  const c = consultation;
  const p = c.patient || {};
  const dyn = (c.dynamicData || {}) as Record<string, any>;
  const lab = Array.isArray(c.labResults) && c.labResults.length > 0 ? c.labResults[0] : null;

  const html = `
    <!DOCTYPE html>
    <html lang="pl">
    <head>
      <meta charset="UTF-8">
      <title>Karta Konsultacyjna</title>
      <style>
        @page { margin: 12mm; }
        body { font-family: 'Helvetica', 'Arial', sans-serif; font-size: 8pt; line-height: 1.25; color: #000; margin: 0; padding: 0; }
        .page { page-break-after: always; }
        .page:last-child { page-break-after: auto; }
        .header-pdf { text-align: center; border-bottom: 2px solid #000; margin-bottom: 6px; padding-bottom: 4px; }
        .header-title { font-size: 12pt; font-weight: bold; text-transform: uppercase; margin: 0; }
        .page-num { font-size: 7pt; color: #666; text-align: right; margin-top: 2px; }
        .sec { font-weight: bold; font-size: 9pt; margin: 4px 0 2px 0; text-decoration: underline; }
        .row-cb { font-size: 7.5pt; margin: 1px 0; }
        .cb { font-family: monospace; }
      </style>
    </head>
    <body>

    ${getLogoHTMLForPDF('small')}

    <!-- STRONA 1 -->
    <div class="page">
      <div class="header-pdf">
        <div class="header-title">Karta Konsultacyjna</div>
        <div class="page-num">str. 1</div>
      </div>
      <div>Data konsultacji: <strong>${formatDate(c.consultationDate)}</strong></div>
      <div class="sec">DANE PACJENTA</div>
      <div>Imię i nazwisko: <strong>${escapeHtml(p.firstName || '')} ${escapeHtml(p.lastName || '')}</strong></div>
      <div>Wiek: ${p.age ?? '-'} &nbsp;&nbsp; płeć ${p.gender === 'FEMALE' ? '■' : '□'} K ${p.gender === 'MALE' ? '■' : '□'} M</div>
      <div>Wykonywany zawód: ${escapeHtml(p.occupation || '')}</div>
      <div>Adres zamieszkania: ${escapeHtml(p.address || '')}</div>
      <div>Numer telefonu: ${escapeHtml(p.phone || '')} &nbsp; e-mail: ${escapeHtml(p.email || '')}</div>
      <div class="sec">PROBLEM</div>
      <div><strong>1. WYPADANIE WŁOSÓW:</strong></div>
      <div class="row-cb">• Nasilenie: ${chk(cv(c,'hairLossSeverity'),'normie')} normie ${chk(cv(c,'hairLossSeverity'),'nasilone')} nasilone ${chk(cv(c,'hairLossSeverity'),'nadmierne')} nadmierne ${chk(cv(c,'hairLossSeverity'),'okresowe')} okresowe ${chk(cv(c,'hairLossSeverity'),'brak')} brak</div>
      <div class="row-cb">• Lokalizacja: ${chk(cv(c,'hairLossLocalization'),'ciemieniowa')} ciemieniowa ${chk(cv(c,'hairLossLocalization'),'skronie')} skronie ${chk(cv(c,'hairLossLocalization'),'czołowa')} czołowa ${chk(cv(c,'hairLossLocalization'),'tonsura')} tonsura ${chk(cv(c,'hairLossLocalization'),'potylica')} potylica ${chk(cv(c,'hairLossLocalization'),'uogólnione')} uogólnione</div>
      <div class="row-cb">  ${chk(cv(c,'hairLossLocalization'),'brwi')} brwi, rzęsy ${chk(cv(c,'hairLossLocalization'),'pachy')} pachy ${chk(cv(c,'hairLossLocalization'),'pachwiny')} pachwiny</div>
      <div class="row-cb">• Czas trwania: ${chk(cv(c,'hairLossDuration'),'0-6')} 0-6 m-cy ${chk(cv(c,'hairLossDuration'),'6-12')} 6-12 m-cy ${chk(cv(c,'hairLossDuration'),'12-24')} 12-24 m-cy ${chk(cv(c,'hairLossDuration'),'powyżej')} powyżej roku</div>
      <div class="row-cb">• Szampony: ${escapeHtml(String(cv(c,'hairLossShampoos') || ''))}</div>
      <div><strong>2. PRZETŁUSZCZANIE WŁOSÓW:</strong></div>
      <div class="row-cb">• Nasilenie: ${chk(cv(c,'oilyHairSeverity'),'normie')} normie ${chk(cv(c,'oilyHairSeverity'),'nasilone')} nasilone ${chk(cv(c,'oilyHairSeverity'),'nadmierne')} nadmierne ${chk(cv(c,'oilyHairSeverity'),'okresowe')} okresowe ${chk(cv(c,'oilyHairSeverity'),'brak')} brak</div>
      <div class="row-cb">• Częstotliwość mycia: ${chk(cv(c,'oilyHairWashingFreq'),'codziennie')} codziennie ${chk(cv(c,'oilyHairWashingFreq'),'2,3')} co 2,3 dni ${chk(cv(c,'oilyHairWashingFreq'),'tygodniu')} raz w tygodniu</div>
      <div class="row-cb">• Czas trwania: ${chk(cv(c,'oilyHairDuration'),'0-6')} 0-6 m-cy ${chk(cv(c,'oilyHairDuration'),'6-12')} 6-12 m-cy ${chk(cv(c,'oilyHairDuration'),'12-24')} 12-24 m-cy ${chk(cv(c,'oilyHairDuration'),'powyżej')} powyżej roku</div>
      <div class="row-cb">• Szampony: ${escapeHtml(String(cv(c,'oilyHairShampoos') || ''))}</div>
      <div><strong>3. ŁUSZCZENIE SKÓRY GŁOWY:</strong></div>
      <div class="row-cb">• Nasilenie: ${chk(cv(c,'scalingSeverity'),'normie')} normie ${chk(cv(c,'scalingSeverity'),'nasilone')} nasilone ${chk(cv(c,'scalingSeverity'),'nadmierne')} nadmierne ${chk(cv(c,'scalingSeverity'),'okresowe')} okresowe ${chk(cv(c,'scalingSeverity'),'brak')} brak</div>
      <div class="row-cb">• Rodzaj: ${chk(cv(c,'scalingType'),'suchy')} suchy ${chk(cv(c,'scalingType'),'tłusty')} tłusty ${chk(cv(c,'scalingType'),'miejscowy')} miejscowy ${chk(cv(c,'scalingType'),'uogólniony')} uogólniony</div>
      <div class="row-cb">• Czas trwania: ${chk(cv(c,'scalingDuration'),'0-6')} 0-6 m-cy ${chk(cv(c,'scalingDuration'),'6-12')} 6-12 m-cy ${chk(cv(c,'scalingDuration'),'12-24')} 12-24 m-cy ${chk(cv(c,'scalingDuration'),'powyżej')} powyżej roku</div>
      <div class="row-cb">• Inne: ${escapeHtml(String(cv(c,'scalingOther') || ''))}</div>
      <div><strong>4. WRAŻLIWOŚĆ SKÓRY GŁOWY:</strong></div>
      <div class="row-cb">• Nasilenie: ${chk(cv(c,'sensitivitySeverity'),'normie')} normie ${chk(cv(c,'sensitivitySeverity'),'nasilone')} nasilone ${chk(cv(c,'sensitivitySeverity'),'nadmierne')} nadmierne ${chk(cv(c,'sensitivitySeverity'),'okresowe')} okresowe ${chk(cv(c,'sensitivitySeverity'),'brak')} brak</div>
      <div class="row-cb">• Rodzaj problemu: ${chk(cv(c,'sensitivityProblemType'),'świąd')} świąd ${chk(cv(c,'sensitivityProblemType'),'pieczenie')} pieczenie ${chk(cv(c,'sensitivityProblemType'),'nadwrażliwość')} nadwrażliwość na preparaty ${chk(cv(c,'sensitivityProblemType'),'trichodynia')} trichodynia</div>
      <div class="row-cb">• Czas trwania: ${chk(cv(c,'sensitivityDuration'),'0-6')} 0-6 m-cy ${chk(cv(c,'sensitivityDuration'),'6-12')} 6-12 m-cy ${chk(cv(c,'sensitivityDuration'),'12-24')} 12-24 m-cy ${chk(cv(c,'sensitivityDuration'),'powyżej')} powyżej roku</div>
      <div class="row-cb">• Inne: ${escapeHtml(String(cv(c,'sensitivityOther') || ''))}</div>
      <div><strong>5. STANY ZAPALNE/ GRUDKI</strong></div>
      <div>${escapeHtml(String(cv(c,'inflammatoryStates') || ''))}</div>
    </div>

    <!-- STRONA 2 -->
    <div class="page">
      <div class="header-pdf">
        <div class="header-title">Karta Konsultacyjna</div>
        <div class="page-num">str. 2</div>
      </div>
      <div class="sec">WYWIAD</div>
      <div class="row-cb">1. Czy dany problem występuje u innych członków rodziny? ${chk(cv(c,'familyHistory'),'tak')} tak ${chk(cv(c,'familyHistory'),'nie')} nie</div>
      <div class="row-cb">2. Czy była konieczna wizyta u dermatologa? Powód: ${escapeHtml(String(cv(c,'dermatologyVisitsReason') || ''))}</div>
      <div class="row-cb">3. Czy jest Pani w ciąży? ${chk(cv(c,'pregnancy'),'tak')} tak ${chk(cv(c,'pregnancy'),'nie')} nie</div>
      <div class="row-cb">4. Czy miesiączkuje regularnie? ${chk(cv(c,'menstruationRegularity'),'tak')} tak ${chk(cv(c,'menstruationRegularity'),'nie')} nie</div>
      <div class="row-cb">Antykoncepcja hormonalna: ${escapeHtml(String(cv(c,'contraception') || ''))}</div>
      <div class="row-cb">5. Czy zażywa Pan/Pani jakieś leki? ${chk(cv(c,'medications'),'tak')} tak ${chk(cv(c,'medications'),'nie')} nie</div>
      <div class="row-cb">jakie: ${escapeHtml(String(cv(c,'medicationsList') || ''))}</div>
      <div class="row-cb">6. Czy stosuje Pani/Pan suplementy? ${escapeHtml(String(cv(c,'supplements') || ''))}</div>
      <div class="row-cb">7. Poziom stresu w życiu codziennym? ${chk(cv(c,'stressLevel'),'duży')} duży ${chk(cv(c,'stressLevel'),'mały')} mały ${chk(cv(c,'stressLevel'),'średni')} średni</div>
      <div class="row-cb">8. Czy w ostatnim czasie była Pani/Pan poddana: ${chk(cv(c,'anesthesia'),'tak')} narkozie ${chk(cv(c,'chemotherapy'),'tak')} chemioterapii ${chk(cv(c,'radiotherapy'),'tak')} radioterapii ${chk(cv(c,'vaccination'),'tak')} szczepieniu ${escapeHtml(String(cv(c,'antibiotics') || ''))} antybiotyki</div>
      <div class="row-cb">9. Czy choruje Pani/Pan na choroby przewlekłe? ${chk(cv(c,'chronicDiseases'),'tak')} tak ${chk(cv(c,'chronicDiseases'),'nie')} nie jakie: ${escapeHtml(String(cv(c,'chronicDiseasesList') || ''))}</div>
      <div class="row-cb">10. Czy jest Pani/Pan pod opieką specjalisty? ${chk(cv(c,'specialists'),'tak')} tak ${chk(cv(c,'specialists'),'nie')} nie jakiego: ${escapeHtml(String(cv(c,'specialistsList') || ''))}</div>
      <div class="row-cb">11. Czy występują u Pani/Pana zaburzenia odżywiania/wchłaniania? ${chk(cv(c,'eatingDisorders'),'tak')} tak ${chk(cv(c,'eatingDisorders'),'nie')} nie</div>
      <div class="row-cb">Nietolerancje pokarmowe: ${escapeHtml(String(cv(c,'foodIntolerances') || ''))}</div>
      <div class="row-cb">12. Czy w ostatnim czasie była Pani/Pan na diecie? ${chk(cv(c,'diet'),'tak')} tak ${chk(cv(c,'diet'),'nie')} nie</div>
      <div class="row-cb">13. Czy występuje u Pani/Pana alergia lub uczulenie na jakieś substancje? ${chk(cv(c,'allergies'),'tak')} tak ${chk(cv(c,'allergies'),'nie')} nie</div>
      <div class="row-cb">14. Czy ma Pani/Pan jakieś części metalowe w organizmie? ${chk(cv(c,'metalPartsInBody'),'tak')} tak ${chk(cv(c,'metalPartsInBody'),'nie')} nie</div>
      <div class="row-cb">15. Jak pielęgnuje Pani/Pan skórę głowy i włosy:</div>
      <div class="row-cb">• Szampon: ${escapeHtml(String(cv(c,'careRoutineShampoo') || ''))}</div>
      <div class="row-cb">• Odżywka/maska: ${escapeHtml(String(cv(c,'careRoutineConditioner') || ''))}</div>
      <div class="row-cb">• Wcierki/oleje: ${escapeHtml(String(cv(c,'careRoutineOils') || ''))}</div>
      <div class="row-cb">• Zabiegi chemiczne/termiczne: ${escapeHtml(String(cv(c,'careRoutineChemical') || ''))}</div>
    </div>

    <!-- STRONA 3 - TRICHOSKOPIA -->
    <div class="page">
      <div class="header-pdf">
        <div class="header-title">Karta Konsultacyjna</div>
        <div class="page-num">str. 3</div>
      </div>
      <div class="sec">TRICHOSKOPIA</div>
      <div class="row-cb">TYP SKÓRY GŁOWY: ${chk(cv(c,'scalpType'),'sucha')} sucha ${chk(cv(c,'scalpType'),'tłusta')} tłusta ${chk(cv(c,'scalpType'),'wrażliwa')} wrażliwa ${chk(cv(c,'scalpType'),'nadreaktywna')} nadreaktywna ${chk(cv(c,'scalpType'),'erytrodermią')} z erytrodermią ${chk(cv(c,'scalpType'),'normalna')} normalna</div>
      <div class="row-cb">WYGLĄD I OBJAWY NA SKÓRZE: ${chk(cv(c,'scalpAppearance'),'zaczerwienie')} zaczerwienie ${chk(cv(c,'scalpAppearance'),'świąd')} świąd ${chk(cv(c,'scalpAppearance'),'pieczenie')} pieczenie ${chk(cv(c,'scalpAppearance'),'ból')} ból ${chk(cv(c,'scalpAppearance'),'suchość')} suchość ${chk(cv(c,'scalpAppearance'),'łojotok')} łojotok</div>
      <div class="row-cb">WYKWITY SKÓRNE: ${chk(cv(c,'skinLesions'),'plama')} plama ${chk(cv(c,'skinLesions'),'grudka')} grudka ${chk(cv(c,'skinLesions'),'krosta')} krosta ${chk(cv(c,'skinLesions'),'guzek')} guzek ${chk(cv(c,'skinLesions'),'blizna')} blizna ${chk(cv(c,'skinLesions'),'strup')} strup</div>
      <div class="row-cb">HIPERHYDROZA ${chk(cv(c,'hyperhidrosis'),'miejscowa')} miejscowa ${chk(cv(c,'hyperhidrosis'),'uogólniona')} uogólniona ${chk(cv(c,'hyperhidrosis'),'brak')} brak</div>
      <div class="row-cb">HIPERKERATYNIZACJA ${chk(cv(c,'hyperkeratinization'),'miejscowa')} miejscowa ${chk(cv(c,'hyperkeratinization'),'uogólniona')} uogólniona ${chk(cv(c,'hyperkeratinization'),'okołomieszkowa')} okołomieszkowa ${chk(cv(c,'hyperkeratinization'),'tubule')} tubule ${chk(cv(c,'hyperkeratinization'),'brak')} brak</div>
      <div class="row-cb">WYDZIELINA G. ŁOJOWYCH ${chk(cv(c,'sebaceousSecretion'),'oleista')} oleista ${chk(cv(c,'sebaceousSecretion'),'zalegająca')} zalegająca ${chk(cv(c,'sebaceousSecretion'),'brak')} brak</div>
      <div class="row-cb">ŁUPIEŻ ${chk(cv(c,'dandruffType'),'Suchy')} Suchy ${chk(cv(c,'dandruffType'),'Tłusty')} Tłusty ${chk(cv(c,'dandruffType'),'Kosmetyczny')} Kosmetyczny</div>
      <div class="row-cb">WARTOŚĆ pH: ${escapeHtml(String(cv(c,'scalpPH') || ''))}</div>
      <div class="sec">OCENA STANU WŁOSÓW</div>
      <div class="row-cb">USZKODZENIA WŁOSA ${chk(cv(c,'hairDamage'),'naturalne')} naturalne ${chk(cv(c,'hairDamage'),'fizyczne')} fizyczne ${chk(cv(c,'hairDamage'),'mechaniczne')} mechaniczne ${chk(cv(c,'hairDamage'),'chemiczne')} chemiczne</div>
      <div class="row-cb">POWODY USZKODZENIA ${chk(cv(c,'hairDamageReason'),'trwała')} trwała ${chk(cv(c,'hairDamageReason'),'prostowanie')} trwałe prostowanie ${chk(cv(c,'hairDamageReason'),'farby')} farby/rozjaśnianie</div>
      <div class="row-cb">JAKOŚĆ WŁOSA ${chk(cv(c,'hairQuality'),'zdrowe')} zdrowe ${chk(cv(c,'hairQuality'),'suche')} suche ${chk(cv(c,'hairQuality'),'przetłuszczone')} przetłuszczone</div>
      <div class="row-cb">KSZTAŁT WŁOSA ${chk(cv(c,'hairShape'),'prosty')} prosty ${chk(cv(c,'hairShape'),'kręcony')} kręcony ${chk(cv(c,'hairShape'),'falisty')} falisty</div>
      <div class="row-cb">WŁOSY NASTĘPOWE ${chk(cv(c,'regrowingHairs'),'dużo')} dużo ${chk(cv(c,'regrowingHairs'),'niewiele')} niewiele</div>
      <div class="row-cb">WŁOSY VELLUS/ZMINIATURYZOWANE ${chk(cv(c,'vellusMiniaturizedHairs'),'dużo')} dużo ${chk(cv(c,'vellusMiniaturizedHairs'),'mało')} mało ${chk(cv(c,'vellusMiniaturizedHairs'),'uogólnione')} uogólnione ${chk(cv(c,'vellusMiniaturizedHairs'),'miejscowo')} miejscowo ${chk(cv(c,'vellusMiniaturizedHairs'),'brak')} brak</div>
      <div class="sec">DIAGNOSTYKA</div>
      <div class="row-cb">UNACZYNIENIE ${formatJsonField(cv(c,'vascularPatterns')) || '-'}</div>
      <div class="row-cb">CECHY OKOŁO MIESZKOWE ${formatJsonField(cv(c,'perifollicularFeatures')) || '-'}</div>
      <div class="row-cb">CHOROBY SKÓRY GŁOWY ${formatJsonField(cv(c,'scalpDiseases')) || '-'}</div>
      <div class="row-cb">INNE ${formatJsonField(cv(c,'otherDiagnostics')) || '-'}</div>
    </div>

    <!-- STRONA 4 - DIAGNOSTYKA LABORATORYJNA -->
    <div class="page">
      <div class="header-pdf">
        <div class="header-title">Karta Konsultacyjna</div>
        <div class="page-num">str. 4</div>
      </div>
      <div class="sec">DIAGNOSTYKA LABORATORYJNA</div>
      <div>Data: ${lab ? formatDate(lab.date) : ''}</div>
      <div style="font-size:7pt; columns: 2; column-gap: 15px;">
        <div>MORFOLOGIA: ${lab?.hgb != null ? lab.hgb : ''} ${lab?.rbc != null ? 'RBC:'+lab.rbc : ''} ${lab?.wbc != null ? 'WBC:'+lab.wbc : ''} ${lab?.plt != null ? 'PLT:'+lab.plt : ''}</div>
        <div>OB: ${lab?.crp ?? '-'} CRP: ${lab?.crp ?? '-'}</div>
        <div>FE: ${lab?.iron ?? '-'} kw.foliowy: ${lab?.folicAcid ?? '-'}</div>
        <div>ferrytyna: ${lab?.ferritin ?? '-'}</div>
        <div>Wit. B12: ${lab?.vitaminB12 ?? '-'} Homocysteina: -</div>
        <div>Wit. D3: ${lab?.vitaminD3 ?? '-'}</div>
        <div>TSH: ${lab?.tsh ?? '-'} fT3: ${lab?.ft3 ?? '-'} fT4: ${lab?.ft4 ?? '-'}</div>
        <div>ANTY TPO: ${lab?.antiTPO ?? '-'} ANTY TG: ${lab?.antiTG ?? '-'}</div>
        <div>Glukoza: ${lab?.glucose ?? '-'} HbA1c: ${lab?.hba1c ?? '-'}</div>
        <div>Insulina: ${lab?.insulin ?? '-'}</div>
        <div>testosteron: ${lab?.testosterone ?? '-'} DHEA-S: ${lab?.dheas ?? '-'}</div>
        <div>prolaktyna: ${lab?.prolactin ?? '-'} progesteron: ${lab?.progesterone ?? '-'}</div>
        <div>estradiol: ${lab?.estrogen ?? '-'}</div>
      </div>
    </div>

    <!-- STRONA 5 - DIAGNOSTYKA ŁYSIENIA, ROZPOZNANIE, ZALECENIA -->
    <div class="page">
      <div class="header-pdf">
        <div class="header-title">Karta Konsultacyjna</div>
        <div class="page-num">str. 5</div>
      </div>
      <div class="sec">DIAGNOSTYKA ŁYSIENIA</div>
      <div class="row-cb">ŁYSIENIE: ${formatJsonField(cv(c,'alopeciaTypes')) || '-'}</div>
      <div class="row-cb">STOPIEŃ PRZERZEDZENIA: ${escapeHtml(String(cv(c,'degreeOfThinning') || ''))}</div>
      <div class="row-cb">CECHY MINIATURYZACJI MIESZKÓW: ${chk(cv(c,'miniaturization'),'Występują')} Występują ${chk(cv(c,'miniaturization'),'Nie występują')} Nie występują</div>
      <div class="row-cb">ZESPOŁY MIESZKOWE: ${escapeHtml(String(cv(c,'follicularUnits') || ''))}</div>
      <div class="row-cb">PULL TEST: ${chk(cv(c,'pullTest'),'dodatni')} dodatni TE/AE ${chk(cv(c,'pullTest'),'ujemny')} ujemny AGA</div>
      <div class="sec">ROZPOZNANIE</div>
      <div style="min-height:80px; border-bottom:1px solid #ccc;">${escapeHtml(String(cv(c,'diagnosis') || ''))}</div>
      <div class="sec">ZALECENIA DO PIELĘGNACJI</div>
      <div>- preparaty do mycia: ${escapeHtml(String(cv(c,'careRecommendationsWashing') || ''))}</div>
      <div>- preparaty do wcierania: ${escapeHtml(String(cv(c,'careRecommendationsTopical') || ''))}</div>
      <div>- suplementacja: ${escapeHtml(String(cv(c,'careRecommendationsSupplement') || ''))}</div>
      <div>- zmiany w pielęgnacji: ${escapeHtml(String(cv(c,'careRecommendationsBehavior') || ''))}</div>
    </div>

    <!-- STRONA 6 - WIZYTY/ZABIEGI, UWAGI -->
    <div class="page">
      <div class="header-pdf">
        <div class="header-title">Karta Konsultacyjna</div>
        <div class="page-num">str. 6</div>
      </div>
      <div class="sec">WIZYTY/ZABIEGI</div>
      <div style="min-height:180px; border:1px solid #eee; padding:4px;">${escapeHtml(String(cv(c,'visitsProcedures') || ''))}</div>
      <div class="sec">UWAGI</div>
      <div style="min-height:80px; border:1px solid #eee; padding:4px;">${escapeHtml(String(cv(c,'generalRemarks') || ''))}</div>
    </div>

    <!-- STRONA 7 - SKALE NORWOOD-HAMILTON, LUDWIG -->
    <div class="page">
      <div class="header-pdf">
        <div class="header-title">Karta Konsultacyjna</div>
        <div class="page-num">str. 7</div>
      </div>
      <div style="margin-top:20px; font-weight:bold;">Skala Norwooda-Hamiltona: ${escapeHtml(String(cv(c,'norwoodHamiltonStage') ?? dyn.norwoodHamiltonStage ?? ''))} ${cv(c,'norwoodHamiltonNotes') || dyn.norwoodHamiltonNotes ? `(${escapeHtml(String(cv(c,'norwoodHamiltonNotes') ?? dyn.norwoodHamiltonNotes ?? ''))})` : ''}</div>
      <div style="margin-top:15px; font-weight:bold;">Skala M. Ludwiga: ${escapeHtml(String(cv(c,'ludwigStage') ?? dyn.ludwigStage ?? ''))} ${cv(c,'ludwigNotes') || dyn.ludwigNotes ? `(${escapeHtml(String(cv(c,'ludwigNotes') ?? dyn.ludwigNotes ?? ''))})` : ''}</div>
    </div>

    <!-- STRONA 8 - PUSTA -->
    <div class="page">
      <div class="header-pdf">
        <div class="header-title">Karta Konsultacyjna</div>
        <div class="page-num">str. 8</div>
      </div>
      <div style="margin-top:40px; font-size:7pt; color:#666; text-align:right;">
        Dokument wygenerowany elektronicznie. Lekarz: ${escapeHtml(c.doctor?.name || '')} | ${formatDateTime(new Date())}
      </div>
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
