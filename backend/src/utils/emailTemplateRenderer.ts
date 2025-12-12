// Utility to render email templates with variables
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
  [key: string]: any; // Allow additional variables
}

export const renderEmailTemplate = (
  template: string,
  variables: TemplateVariables
): string => {
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

