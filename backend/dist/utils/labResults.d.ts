type LabValue = {
    value?: number;
    refLow?: number;
    refHigh?: number;
};
export declare const calculateFlag: (value: LabValue) => "LOW" | "NORMAL" | "HIGH" | null;
export declare const calculateLabFlags: (data: any) => any;
export type LabResultTemplateField = {
    key: string;
    type: string;
    label: string;
    unit?: string;
    refLow?: number;
    refHigh?: number;
    order?: number;
    options?: string[];
};
export declare function calculateDynamicDataFlags(fields: LabResultTemplateField[], dynamicData: Record<string, unknown>): Record<string, unknown>;
export {};
//# sourceMappingURL=labResults.d.ts.map