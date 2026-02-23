const fs = require('fs');
const path = require('path');

const directoryPath = path.join(__dirname, 'frontend/src');

const replacements = [
  { regex: /bgcolor:\s*['"]#1976d2['"]/g, replace: "bgcolor: 'primary.main'" },
  { regex: /bgcolor:\s*['"]#1565c0['"]/g, replace: "bgcolor: 'primary.dark'" },
  { regex: /bgcolor:\s*['"]#007AFF['"]/g, replace: "bgcolor: 'primary.main'" },
  { regex: /bgcolor:\s*['"]#0051D5['"]/g, replace: "bgcolor: 'primary.dark'" },
  { regex: /bgcolor:\s*['"]#AF52DE['"]/g, replace: "bgcolor: 'secondary.main'" },
  { regex: /bgcolor:\s*['"]#9B30D9['"]/g, replace: "bgcolor: 'secondary.dark'" },
  { regex: /bgcolor:\s*['"]#34C759['"]/g, replace: "bgcolor: 'success.main'" },
  { regex: /bgcolor:\s*['"]#2DA047['"]/g, replace: "bgcolor: 'success.dark'" },
  { regex: /bgcolor:\s*['"]#FF9500['"]/g, replace: "bgcolor: 'warning.main'" },
  { regex: /bgcolor:\s*['"]#E68900['"]/g, replace: "bgcolor: 'warning.dark'" },
  { regex: /bgcolor:\s*['"]#FF3B30['"]/g, replace: "bgcolor: 'error.main'" },
  { regex: /bgcolor:\s*['"]#F8FAFC['"]/g, replace: "bgcolor: 'background.default'" },
  { regex: /bgcolor:\s*['"]#F1F5F9['"]/g, replace: "bgcolor: 'action.hover'" },
  { regex: /bgcolor:\s*['"]#f5f5f7['"]/g, replace: "bgcolor: 'background.default'" },
  { regex: /bgcolor:\s*['"]#1d1d1f['"]/g, replace: "bgcolor: 'background.paper'" },
  { regex: /bgcolor:\s*['"]#000['"]/g, replace: "bgcolor: 'background.paper'" },
  { regex: /color:\s*['"]#1976d2['"]/g, replace: "color: 'primary.main'" },
  { regex: /color:\s*['"]#007AFF['"]/g, replace: "color: 'primary.main'" },
  { regex: /color:\s*['"]#AF52DE['"]/g, replace: "color: 'secondary.main'" },
  { regex: /color:\s*['"]#34C759['"]/g, replace: "color: 'success.main'" },
  { regex: /color:\s*['"]#FF9500['"]/g, replace: "color: 'warning.main'" },
  { regex: /color:\s*['"]#FF3B30['"]/g, replace: "color: 'error.main'" },
  { regex: /color:\s*['"]#0F172A['"]/g, replace: "color: 'text.primary'" },
  { regex: /color:\s*['"]#64748B['"]/g, replace: "color: 'text.secondary'" },
  { regex: /borderColor:\s*['"]#AF52DE['"]/g, replace: "borderColor: 'secondary.main'" },
  { regex: /borderColor:\s*['"]#1976d2['"]/g, replace: "borderColor: 'primary.main'" },
  { regex: /borderColor:\s*['"]#007AFF['"]/g, replace: "borderColor: 'primary.main'" },
  { regex: /borderColor:\s*['"]#E2E8F0['"]/g, replace: "borderColor: 'divider'" },
];

function processDirectory(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      processDirectory(filePath);
    } else if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
      let content = fs.readFileSync(filePath, 'utf8');
      let originalContent = content;
      
      replacements.forEach(({ regex, replace }) => {
        content = content.replace(regex, replace);
      });
      
      if (content !== originalContent) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Updated: ${filePath}`);
      }
    }
  }
}

processDirectory(directoryPath);
