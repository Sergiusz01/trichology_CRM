/**
 * Get logo as base64 data URL for embedding in emails and PDFs
 */
export declare function getLogoBase64(): string;
/**
 * Get logo HTML for emails (with fallback alt text)
 */
export declare function getLogoHTML(baseUrl?: string, size?: 'small' | 'medium' | 'large'): string;
/**
 * Get logo HTML for PDF (using base64)
 */
export declare function getLogoHTMLForPDF(size?: 'small' | 'medium' | 'large'): string;
//# sourceMappingURL=logo.d.ts.map