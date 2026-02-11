type LabValue = {
    value?: number;
    refLow?: number;
    refHigh?: number;
};
export declare const calculateFlag: (value: LabValue) => "LOW" | "NORMAL" | "HIGH" | null;
export declare const calculateLabFlags: (data: any) => any;
export {};
//# sourceMappingURL=labResults.d.ts.map