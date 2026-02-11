"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderEmailTemplate = void 0;
const renderEmailTemplate = (template, variables) => {
    let rendered = template;
    // Replace variables in format {{variableName}}
    Object.keys(variables).forEach((key) => {
        const value = variables[key];
        if (value !== null && value !== undefined) {
            const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
            rendered = rendered.replace(regex, String(value));
        }
    });
    // Remove any remaining unreplaced variables
    rendered = rendered.replace(/\{\{[^}]+\}\}/g, '');
    return rendered;
};
exports.renderEmailTemplate = renderEmailTemplate;
//# sourceMappingURL=emailTemplateRenderer.js.map