/**
 * Generates iCalendar (.ics) file content for a visit
 */
export function generateVisitICS(visit: {
  id: string;
  data: Date;
  rodzajZabiegu: string;
  notatki?: string | null;
  patient: {
    firstName: string;
    lastName: string;
    email?: string | null;
  };
  clinicName?: string;
  clinicAddress?: string;
  clinicPhone?: string;
}): string {
  const startDate = new Date(visit.data);
  const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // 1 hour duration
  const now = new Date();

  // Format dates to ICS format (YYYYMMDDTHHmmssZ)
  const formatICSDate = (date: Date): string => {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    const hours = String(date.getUTCHours()).padStart(2, '0');
    const minutes = String(date.getUTCMinutes()).padStart(2, '0');
    const seconds = String(date.getUTCSeconds()).padStart(2, '0');
    return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
  };

  const escapeICS = (text: string): string => {
    return text
      .replace(/\\/g, '\\\\')
      .replace(/;/g, '\\;')
      .replace(/,/g, '\\,')
      .replace(/\n/g, '\\n');
  };

  const dtstart = formatICSDate(startDate);
  const dtend = formatICSDate(endDate);
  const dtstamp = formatICSDate(now);
  const uid = `visit-${visit.id}@trichology-clinic.pl`;

  const summary = escapeICS(`Wizyta: ${visit.rodzajZabiegu}`);
  const description = escapeICS(
    `Wizyta: ${visit.rodzajZabiegu}\n` +
    `Pacjent: ${visit.patient.firstName} ${visit.patient.lastName}\n` +
    (visit.notatki ? `Notatki: ${visit.notatki}\n` : '') +
    (visit.clinicName ? `Klinika: ${visit.clinicName}\n` : '') +
    (visit.clinicPhone ? `Telefon: ${visit.clinicPhone}` : '')
  );

  const location = visit.clinicAddress ? escapeICS(visit.clinicAddress) : '';

  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Trichology Clinic//Visit Reminder//PL',
    'CALSCALE:GREGORIAN',
    'METHOD:REQUEST',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${dtstamp}`,
    `DTSTART:${dtstart}`,
    `DTEND:${dtend}`,
    `SUMMARY:${summary}`,
    `DESCRIPTION:${description}`,
    location ? `LOCATION:${location}` : '',
    'STATUS:CONFIRMED',
    'SEQUENCE:0',
    'BEGIN:VALARM',
    'TRIGGER:-PT24H',
    'ACTION:EMAIL',
    `DESCRIPTION:Przypomnienie o wizycie: ${summary}`,
    'END:VALARM',
    'BEGIN:VALARM',
    'TRIGGER:-PT1H',
    'ACTION:DISPLAY',
    `DESCRIPTION:Przypomnienie o wizycie: ${summary}`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ]
    .filter((line) => line !== '')
    .join('\r\n');

  return icsContent;
}

/**
 * Generates a Google Calendar URL for a visit
 */
export function generateGoogleCalendarURL(visit: {
  data: Date;
  rodzajZabiegu: string;
  notatki?: string | null;
  patient: {
    firstName: string;
    lastName: string;
  };
  clinicName?: string;
  clinicAddress?: string;
}): string {
  const startDate = new Date(visit.data);
  const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // 1 hour duration

  const formatGoogleDate = (date: Date): string => {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: `Wizyta: ${visit.rodzajZabiegu}`,
    dates: `${formatGoogleDate(startDate)}/${formatGoogleDate(endDate)}`,
    details: `Wizyta: ${visit.rodzajZabiegu}\nPacjent: ${visit.patient.firstName} ${visit.patient.lastName}${visit.notatki ? `\nNotatki: ${visit.notatki}` : ''}`,
    location: visit.clinicAddress || visit.clinicName || '',
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/**
 * Generates an Outlook Calendar URL for a visit
 */
export function generateOutlookCalendarURL(visit: {
  data: Date;
  rodzajZabiegu: string;
  notatki?: string | null;
  patient: {
    firstName: string;
    lastName: string;
  };
  clinicName?: string;
  clinicAddress?: string;
}): string {
  const startDate = new Date(visit.data);
  const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);

  const formatOutlookDate = (date: Date): string => {
    return date.toISOString();
  };

  const params = new URLSearchParams({
    subject: `Wizyta: ${visit.rodzajZabiegu}`,
    startdt: formatOutlookDate(startDate),
    enddt: formatOutlookDate(endDate),
    body: `Wizyta: ${visit.rodzajZabiegu}\nPacjent: ${visit.patient.firstName} ${visit.patient.lastName}${visit.notatki ? `\nNotatki: ${visit.notatki}` : ''}`,
    location: visit.clinicAddress || visit.clinicName || '',
  });

  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
}
