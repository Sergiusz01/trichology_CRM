export declare const formatDate: (date: Date | string | null | undefined) => string;
export declare const formatDateTime: (date: Date | string | null | undefined) => string;
export declare const generateConsultationPDF: (consultation: any) => Promise<Buffer>;
export declare const generateCarePlanPDF: (carePlan: any) => Promise<Buffer>;
export { generateLabResultPDF, generatePatientInfoPDF } from './pdfServiceAdditional';
//# sourceMappingURL=pdfService.d.ts.map