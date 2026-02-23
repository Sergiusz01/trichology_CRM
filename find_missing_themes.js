const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(function(file) {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      results = results.concat(walk(file));
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) { 
      results.push(file);
    }
  });
  return results;
}

const files = walk('frontend/src');
let found = false;
for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  if (content.includes('theme.palette') && !content.includes('useTheme(')) {
    console.log('Missing in:', file);
    found = true;
    
    // Auto-fix
    if (!content.includes('useTheme')) {
        content = content.replace(/import {([^}]*)} from '@mui\/material';/, "import { useTheme, $1 } from '@mui/material';");
    } else {
        content = content.replace(/import {([^}]*useTheme[^}]*)} from '@mui\/material';/, "import {$1} from '@mui/material';");
        // if not there, just add
        if (!content.includes('useTheme')) {
           content = content.replace(/import {([^}]*)} from '@mui\/material';/, "import { useTheme, $1 } from '@mui/material';");
        }
    }
    
    // We basically just inject `const theme = useTheme();` after the first `{` following export default function
    // or const ComponentName = () => {
    
    // A robust way without AST is string substitution for known component names based on filename
    const baseName = path.basename(file, '.tsx');
    const funcRegex1 = new RegExp(`export default function ${baseName}\\([^)]*\\)\\s*{`);
    const funcRegex2 = new RegExp(`const ${baseName}:?\\s*React\\.FC[^=]*=\\s*\\([^)]*\\)\\s*=>\\s*{`);
    const funcRegex3 = new RegExp(`const ${baseName}\\s*=\\s*\\([^)]*\\)\\s*=>\\s*{`);
    const funcRegex4 = new RegExp(`export function ${baseName}\\([^)]*\\)\\s*{`);
    
    if (funcRegex1.test(content)) {
        content = content.replace(funcRegex1, (m) => m + "\n  const theme = useTheme();");
    } else if (funcRegex2.test(content)) {
        content = content.replace(funcRegex2, (m) => m + "\n  const theme = useTheme();");
    } else if (funcRegex3.test(content)) {
        content = content.replace(funcRegex3, (m) => m + "\n  const theme = useTheme();");
    } else if (funcRegex4.test(content)) {
        content = content.replace(funcRegex4, (m) => m + "\n  const theme = useTheme();");
    } else {
        // Fallback: replace the first 'export default function ' 
        content = content.replace(/export default function \w+\([^)]*\)\s*{/, (m) => m + "\n  const theme = useTheme();");
    }
    
    fs.writeFileSync(file, content);
    console.log('Fixed:', file);
  }
}
if (!found) console.log('All clear!');
