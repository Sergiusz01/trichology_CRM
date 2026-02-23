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
      
      // If it uses theme.palette but doesn't define theme
      if (content.includes('theme.palette') && !content.includes('const theme = useTheme();')) {
          console.log(`Needs fixing: ${filePath}`);
          
          let originalContent = content;
          
          // 1. Import useTheme if missing
          if (!content.includes('useTheme')) {
             content = content.replace(/import {([^}]*)} from '@mui\/material';/, (match, p1) => {
                 return `import { useTheme, ${p1} } from '@mui/material';`;
             });
          }
          
          // 2. Inject const theme = useTheme(); into the main component
          // Simplistic approach: find export default function ...() {
          content = content.replace(/(export default function \w+\([^)]*\)\s*{)/, "$1\n  const theme = useTheme();\n");
          
          // Or find arrow functions: const ... = () => {
          if (!content.includes('const theme = useTheme();')) {
             content = content.replace(/(const \w+ = \([^)]*\)(?:: React\.FC\w*)? =>\s*{)/, "$1\n  const theme = useTheme();\n");
          }
          
          // Or export function ...() {
          if (!content.includes('const theme = useTheme();')) {
             content = content.replace(/(export function \w+\([^)]*\)\s*{)/, "$1\n  const theme = useTheme();\n");
          }
          
          if (content !== originalContent) {
            fs.writeFileSync(filePath, content, 'utf8');
            console.log(`Fixed: ${filePath}`);
          }
      }
    }
  }
}

processDirectory(directoryPath);
