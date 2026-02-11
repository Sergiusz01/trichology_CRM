export interface TemplateVariables {
    patientName?: string;
    patientFirstName?: string;
    patientLastName?: string;
    patientEmail?: string;
    patientPhone?: string;
    doctorName?: string;
    consultationDate?: string;
    carePlanTitle?: string;
    carePlanDuration?: string;
    labResultDate?: string;
    [key: string]: any;
}
export declare const renderEmailTemplate: (template: string, variables: TemplateVariables) => string;
//# sourceMappingURL=emailTemplateRenderer.d.ts.map