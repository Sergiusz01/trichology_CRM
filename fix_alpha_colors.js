const fs = require('fs');
const path = require('path');

const directoryPath = path.join(__dirname, 'frontend/src');

const replacements = [
  { regex: /alpha\(['"]#1976d2['"]/g, replace: "alpha(theme.palette.primary.main" },
  { regex: /alpha\(['"]#1565c0['"]/g, replace: "alpha(theme.palette.primary.dark" },
  { regex: /alpha\(['"]#007AFF['"]/g, replace: "alpha(theme.palette.primary.main" },
  { regex: /alpha\(['"]#0051D5['"]/g, replace: "alpha(theme.palette.primary.dark" },
  { regex: /alpha\(['"]#AF52DE['"]/g, replace: "alpha(theme.palette.secondary.main" },
  { regex: /alpha\(['"]#9B30D9['"]/g, replace: "alpha(theme.palette.secondary.dark" },
  { regex: /alpha\(['"]#34C759['"]/g, replace: "alpha(theme.palette.success.main" },
  { regex: /alpha\(['"]#FF9500['"]/g, replace: "alpha(theme.palette.warning.main" },
  { regex: /alpha\(['"]#FF3B30['"]/g, replace: "alpha(theme.palette.error.main" },
  { regex: /alpha\(['"]#d32f2f['"]/g, replace: "alpha(theme.palette.error.main" },
  { regex: /alpha\(['"]#000['"]/g, replace: "alpha(theme.palette.common.black" },
  { regex: /alpha\(['"]#f5f5f7['"]/g, replace: "alpha(theme.palette.background.default" }
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
      
      // Fix VisitsPage.tsx specifically if it has VISIT_STATUS_CONFIG
      if (filePath.includes('VisitsPage.tsx')) {
        content = content.replace(/bgColor: alpha\(theme\.palette\.primary\.main, 0\.1\)/g, "bgColor: 'rgba(0, 122, 255, 0.1)'");
        content = content.replace(/bgColor: alpha\(theme\.palette\.success\.main, 0\.1\)/g, "bgColor: 'rgba(52, 199, 89, 0.1)'");
        content = content.replace(/bgColor: alpha\(theme\.palette\.warning\.main, 0\.1\)/g, "bgColor: 'rgba(255, 149, 0, 0.1)'");
        content = content.replace(/bgColor: alpha\(theme\.palette\.error\.main, 0\.1\)/g, "bgColor: 'rgba(255, 59, 48, 0.1)'");
      }
      
      if (content !== originalContent) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Updated: ${filePath}`);
      }
    }
  }
}

processDirectory(directoryPath);
