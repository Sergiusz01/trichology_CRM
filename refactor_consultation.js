const fs = require('fs');

const path = './frontend/src/pages/ConsultationFormPage.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Import Section
if (!content.includes('import { AppCard, AppButton, AppTextField, PageHeader, Section }')) {
  content = content.replace(
    /import \{ AppCard, AppButton, AppTextField, PageHeader \} from '\.\.\/ui';/g,
    "import { AppCard, AppButton, AppTextField, PageHeader, Section } from '../ui';"
  );
  // Just in case it wasn't there
  if (!content.includes('../ui')) {
     content = content.replace(
       /from '@mui\/material';\n/,
       "from '@mui/material';\nimport { AppCard, AppButton, AppTextField, PageHeader, Section } from '../ui';\n"
     );
  }
}

// 2. Replace Accordion with Section
// Pattern:
// <Accordion(?: defaultExpanded)?>
//   <AccordionSummary expandIcon={<ExpandMore />}>
//     <Typography variant="h6">(.*?)</Typography>
//   </AccordionSummary>
//   <AccordionDetails sx={{ p: { xs: 2, sm: 3 } }}>
//     ... content ...
//   </AccordionDetails>
// </Accordion>

const regex = /<Accordion( defaultExpanded)?>[\s\S]*?<Typography variant="h6">(.*?)<\/Typography>[\s\S]*?<AccordionDetails[^>]*>([\s\S]*?)<\/AccordionDetails>\s*<\/Accordion>/g;

content = content.replace(regex, (match, defaultExpanded, title, innerContent) => {
  const expandedProp = defaultExpanded ? ' defaultExpanded' : '';
  return `<Section title="${title}"${expandedProp}>\n${innerContent}\n</Section>`;
});

// 3. Let's do a basic replacement of TextField with AppTextField
content = content.replace(/<TextField/g, '<AppTextField');

// 4. Clean up unused imports like Accordion, AccordionSummary, AccordionDetails
content = content.replace(/\s*Accordion,\n/g, '\n');
content = content.replace(/\s*AccordionSummary,\n/g, '\n');
content = content.replace(/\s*AccordionDetails,\n/g, '\n');

fs.writeFileSync(path, content, 'utf8');
console.log('Refactoring complete!');
