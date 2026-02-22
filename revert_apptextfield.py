import os

file_path = './frontend/src/pages/ConsultationFormPage.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Revert AppTextField back to TextField
content = content.replace('<AppTextField', '<TextField')

# Add TextField back to the material imports
if 'TextField,' not in content:
    content = content.replace(
        '  Button,\n  Grid,\n',
        '  Button,\n  TextField,\n  Grid,\n'
    )

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print('Reverted AppTextField to TextField')
