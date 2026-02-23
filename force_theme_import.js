const fs = require('fs');
const path = require('path');

const directoryPath = path.join(__dirname, 'frontend/src');

function processDirectory(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      processDirectory(filePath);
    } else if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
      let content = fs.readFileSync(filePath, 'utf8');
      
      if (content.includes('theme.palette')) {
          let modified = false;
          
          if (!content.includes('useTheme')) {
             content = content.replace(/import {([^}]*)} from '@mui\/material';/, (match, p1) => {
                 return `import { useTheme, ${p1} } from '@mui/material';`;
             });
             modified = true;
          }
          
          if (!content.includes('const theme = useTheme();')) {
             // Find the first component definition
             const exportDefaultRegex = /export default function (\w+)\(([^)]*)\)\s*{/;
             const exportFunctionRegex = /export function (\w+)\(([^)]*)\)\s*{/;
             const constRegex = /const (\w+)\s*=\s*\(([^)]*)\)(?:: React\.FC[^{]*)?\s*=>\s*{/;
             
             if (exportDefaultRegex.test(content)) {
                 content = content.replace(exportDefaultRegex, (match) => { return match + "\n  const theme = useTheme();"; });
                 modified = true;
             } else if (exportFunctionRegex.test(content)) {
                 content = content.replace(exportFunctionRegex, (match) => { return match + "\n  const theme = useTheme();"; });
                 modified = true;
             } else if (constRegex.test(content)) {
                 content = content.replace(constRegex, (match) => { return match + "\n  const theme = useTheme();"; });
                 modified = true;
             }
          }
          
          if (modified) {
            fs.writeFileSync(filePath, content, 'utf8');
            console.log(`Force fixed: ${filePath}`);
          }
      }
    }
  }
}

processDirectory(directoryPath);
