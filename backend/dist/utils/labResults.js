"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateLabFlags = exports.calculateFlag = void 0;
exports.calculateDynamicDataFlags = calculateDynamicDataFlags;
const calculateFlag = (value) => {
    if (value.value === undefined || value.value === null) {
        return null;
    }
    if (value.refLow !== undefined && value.value < value.refLow) {
        return 'LOW';
    }
    if (value.refHigh !== undefined && value.value > value.refHigh) {
        return 'HIGH';
    }
    return 'NORMAL';
};
exports.calculateFlag = calculateFlag;
const calculateLabFlags = (data) => {
    const result = { ...data };
    // Helper to calculate flag for a parameter
    const setFlag = (prefix) => {
        const value = data[prefix];
        const refLow = data[`${prefix}RefLow`];
        const refHigh = data[`${prefix}RefHigh`];
        if (value !== undefined && value !== null) {
            result[`${prefix}Flag`] = (0, exports.calculateFlag)({ value, refLow, refHigh });
        }
    };
    // Calculate flags for all parameters
    const parameters = [
        'hgb', 'rbc', 'wbc', 'plt',
        'crp',
        'iron', 'ferritin',
        'vitaminD3', 'vitaminB12', 'folicAcid',
        'tsh', 'ft3', 'ft4', 'antiTPO', 'antiTG', 'trab',
        'estrogen', 'progesterone', 'testosterone', 'dheas', 'prolactin',
        'glucose', 'insulin', 'hba1c',
    ];
    parameters.forEach(param => setFlag(param));
    // HOMA-IR is calculated differently (no standard ref ranges, but we can set flag if needed)
    if (data.homaIR !== undefined && data.homaIR !== null) {
        // HOMA-IR > 2.5 is often considered insulin resistance
        if (data.homaIRRefHigh !== undefined) {
            result.homaIRFlag = data.homaIR > data.homaIRRefHigh ? 'HIGH' : 'NORMAL';
        }
    }
    return result;
};
exports.calculateLabFlags = calculateLabFlags;
function calculateDynamicDataFlags(fields, dynamicData) {
    const out = { ...dynamicData };
    for (const f of fields) {
        if (f.type !== 'NUMBER')
            continue;
        const v = dynamicData[f.key];
        if (v === null || v === undefined || typeof v !== 'number')
            continue;
        const refLow = (f.refLow ?? dynamicData[`${f.key}RefLow`]);
        const refHigh = (f.refHigh ?? dynamicData[`${f.key}RefHigh`]);
        let flag = null;
        if (refLow !== undefined && refLow !== null && v < refLow)
            flag = 'LOW';
        else if (refHigh !== undefined && refHigh !== null && v > refHigh)
            flag = 'HIGH';
        else if (refLow != null || refHigh != null)
            flag = 'NORMAL';
        if (flag !== null)
            out[`${f.key}Flag`] = flag;
    }
    return out;
}
//# sourceMappingURL=labResults.js.map