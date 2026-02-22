import os
import re

file_path = './frontend/src/pages/ConsultationFormPage.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 2. Replace Accordion with Section
# Using a simpler regex that matches any character lazy
pattern = r'<Accordion( defaultExpanded)?>.*?<Typography variant="h6">(.*?)<\/Typography>.*?<AccordionDetails[^>]*>(.*?)<\/AccordionDetails>\s*<\/Accordion>'

def replace_accordion(match):
    expanded = match.group(1) or ""
    title = match.group(2)
    inner = match.group(3)
    return f'<Section title="{title}"{expanded}>{inner}</Section>'

content = re.sub(pattern, replace_accordion, content, flags=re.DOTALL)

# Clean up imports
content = re.sub(r'\s*Accordion,', '', content)
content = re.sub(r'\s*AccordionSummary,', '', content)
content = re.sub(r'\s*AccordionDetails,', '', content)
content = re.sub(r'\s*TextField,', '', content)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print('Refactoring complete 2!')
