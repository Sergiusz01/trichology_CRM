/**
 * Generates iCalendar (.ics) file content for a visit
 */
export declare function generateVisitICS(visit: {
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
}): string;
/**
 * Generates a Google Calendar URL for a visit
 */
export declare function generateGoogleCalendarURL(visit: {
    data: Date;
    rodzajZabiegu: string;
    notatki?: string | null;
    patient: {
        firstName: string;
        lastName: string;
    };
    clinicName?: string;
    clinicAddress?: string;
}): string;
/**
 * Generates an Outlook Calendar URL for a visit
 */
export declare function generateOutlookCalendarURL(visit: {
    data: Date;
    rodzajZabiegu: string;
    notatki?: string | null;
    patient: {
        firstName: string;
        lastName: string;
    };
    clinicName?: string;
    clinicAddress?: string;
}): string;
//# sourceMappingURL=icalendar.d.ts.map