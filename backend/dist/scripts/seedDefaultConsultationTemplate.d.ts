interface TemplateField {
    type: 'TEXT' | 'TEXTAREA' | 'SELECT' | 'MULTISELECT' | 'CHECKBOX' | 'NUMBER' | 'DATE';
    label: string;
    key: string;
    required: boolean;
    placeholder?: string;
    options?: string[];
    defaultValue?: string | number | boolean | string[];
    order: number;
}
declare function seedDefaultTemplate(): Promise<void>;
declare function generateDefaultFields(): TemplateField[];
export { seedDefaultTemplate, generateDefaultFields };
//# sourceMappingURL=seedDefaultConsultationTemplate.d.ts.map