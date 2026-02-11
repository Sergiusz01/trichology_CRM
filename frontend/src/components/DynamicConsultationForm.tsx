import { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Checkbox,
  Grid2,
  Typography,
  Paper,
} from '@mui/material';
import MultiSelectCheckboxes from './MultiSelectCheckboxes';
import { TemplateField } from './ConsultationTemplateBuilder';

interface DynamicConsultationFormProps {
  fields: TemplateField[];
  formData: Record<string, any>;
  onChange: (key: string, value: any) => void;
}

export default function DynamicConsultationForm({
  fields,
  formData,
  onChange,
}: DynamicConsultationFormProps) {
  const sortedFields = [...fields].sort((a, b) => a.order - b.order);

  const renderField = (field: TemplateField) => {
    const value = formData[field.key] ?? field.defaultValue ?? '';

    switch (field.type) {
      case 'SECTION':
        return (
          <Box sx={{ mt: 3, mb: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>
              {field.label}
            </Typography>
          </Box>
        );

      case 'SUBSECTION':
        return (
          <Box sx={{ mt: 2, mb: 1 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, textTransform: 'uppercase' }}>
              {field.label}
            </Typography>
          </Box>
        );

      case 'TEXT':
        return (
          <TextField
            fullWidth
            label={field.label}
            value={value}
            onChange={(e) => onChange(field.key, e.target.value)}
            required={field.required}
            placeholder={field.placeholder}
          />
        );

      case 'TEXTAREA':
        return (
          <TextField
            fullWidth
            multiline
            rows={4}
            label={field.label}
            value={value}
            onChange={(e) => onChange(field.key, e.target.value)}
            required={field.required}
            placeholder={field.placeholder}
          />
        );

      case 'SELECT':
        return (
          <FormControl fullWidth required={field.required}>
            <InputLabel>{field.label}</InputLabel>
            <Select
              value={value || ''}
              label={field.label}
              onChange={(e) => onChange(field.key, e.target.value)}
            >
              {field.options?.map((option) => (
                <MenuItem key={option} value={option}>
                  {option}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        );

      case 'MULTISELECT':
        return (
          <MultiSelectCheckboxes
            label={field.label}
            options={field.options || []}
            value={Array.isArray(value) ? value : []}
            onChange={(selected) => onChange(field.key, selected)}
            required={field.required}
          />
        );

      case 'CHECKBOX':
        return (
          <FormControlLabel
            control={
              <Checkbox
                checked={Boolean(value)}
                onChange={(e) => onChange(field.key, e.target.checked)}
              />
            }
            label={field.label}
          />
        );

      case 'NUMBER':
        return (
          <TextField
            fullWidth
            type="number"
            label={field.label}
            value={value || ''}
            onChange={(e) => onChange(field.key, parseFloat(e.target.value) || 0)}
            required={field.required}
            placeholder={field.placeholder}
          />
        );

      case 'DATE':
        return (
          <TextField
            fullWidth
            type="date"
            label={field.label}
            value={value || ''}
            onChange={(e) => onChange(field.key, e.target.value)}
            required={field.required}
            InputLabelProps={{
              shrink: true,
            }}
          />
        );

      default:
        return null;
    }
  };

  return (
    <Box>
      {sortedFields.map((field, index) => (
        <Box key={field.key || index} sx={{ mb: 3 }}>
          {renderField(field)}
        </Box>
      ))}
    </Box>
  );
}
