import fs from 'fs';
import path from 'path';

/**
 * Get logo as base64 data URL for embedding in emails and PDFs
 */
export function getLogoBase64(): string {
  try {
    // Try multiple possible paths (for both development and production builds)
    const possiblePaths = [
      path.join(__dirname, '../../public/assets/logo.png'), // From dist/utils/logo.js
      path.join(__dirname, '../../../public/assets/logo.png'), // Alternative path
      path.join(process.cwd(), 'public/assets/logo.png'), // From project root
      path.join(process.cwd(), 'backend/public/assets/logo.png'), // From workspace root
    ];

    for (const logoPath of possiblePaths) {
      if (fs.existsSync(logoPath)) {
        const logoBuffer = fs.readFileSync(logoPath);
        const base64 = logoBuffer.toString('base64');
        return `data:image/png;base64,${base64}`;
      }
    }
  } catch (error) {
    console.error('Błąd wczytywania logo:', error);
  }
  return '';
}

/**
 * Get logo HTML for emails (with fallback alt text)
 */
export function getLogoHTML(baseUrl?: string, size: 'small' | 'medium' | 'large' = 'medium'): string {
  const logoBase64 = getLogoBase64();
  
  const sizes = {
    small: 'height: 40px;',
    medium: 'height: 60px;',
    large: 'height: 100px;',
  };

  if (logoBase64) {
    return `
      <div style="text-align: center; margin-bottom: 20px;">
        <img src="${logoBase64}" alt="Trichdiagnostic - gabinet trychologiczno- zabiegowy" style="${sizes[size]} width: auto; max-width: 300px;" />
      </div>
    `;
  }

  // Fallback text if logo not found
  return `
    <div style="text-align: center; margin-bottom: 20px;">
      <h1 style="color: #4CAF50; margin: 0; font-size: 24px; font-weight: bold;">trichdiagnostic</h1>
      <p style="color: #333; margin: 5px 0 0 0; font-size: 12px;">gabinet trychologiczno- zabiegowy</p>
    </div>
  `;
}

/**
 * Get logo HTML for PDF (using base64)
 */
export function getLogoHTMLForPDF(size: 'small' | 'medium' | 'large' = 'medium'): string {
  const logoBase64 = getLogoBase64();
  
  const sizes = {
    small: 'height: 30px;',
    medium: 'height: 50px;',
    large: 'height: 80px;',
  };

  if (logoBase64) {
    return `
      <div style="text-align: center; margin-bottom: 10px;">
        <img src="${logoBase64}" alt="Trichdiagnostic" style="${sizes[size]} width: auto; max-width: 250px;" />
      </div>
    `;
  }

  // Fallback text if logo not found
  return `
    <div style="text-align: center; margin-bottom: 10px;">
      <div style="color: #4CAF50; font-size: 18px; font-weight: bold;">trichdiagnostic</div>
      <div style="color: #333; font-size: 9px; margin-top: 2px;">gabinet trychologiczno- zabiegowy</div>
    </div>
  `;
}
