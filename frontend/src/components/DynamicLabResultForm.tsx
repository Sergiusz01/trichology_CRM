import {
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Typography,
  Divider,
} from '@mui/material';
import type { LabResultTemplateField } from './LabResultTemplateBuilder';

interface DynamicLabResultFormProps {
  fields: LabResultTemplateField[];
  formData: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
}

export default function DynamicLabResultForm({
  fields,
  formData,
  onChange,
}: DynamicLabResultFormProps) {
  const sorted = [...fields].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  const renderField = (f: LabResultTemplateField) => {
    const value = formData[f.key];
    const unitKey = `${f.key}Unit`;
    const refLowKey = `${f.key}RefLow`;
    const refHighKey = `${f.key}RefHigh`;

    if (f.type === 'NUMBER') {
      const unit = (formData[unitKey] as string) ?? f.unit ?? '';
      const refLow = formData[refLowKey] as number | undefined;
      const refHigh = formData[refHighKey] as number | undefined;
      return (
        <Grid container spacing={2} key={f.key} size={{ xs: 12 }} alignItems="center" sx={{ width: '100%' }}>
          <Grid size={{ xs: 12, md: 3 }}>
            <Typography variant="subtitle1" fontWeight={600} color="text.secondary">
              {f.label}
            </Typography>
          </Grid>
          <Grid size={{ xs: 6, sm: 4, md: 3 }}>
            <TextField
              fullWidth
              label="Wynik"
              type="number"
              size="small"
              value={value === undefined || value === null ? '' : value}
              onChange={(e) => {
                const v = e.target.value === '' ? undefined : parseFloat(e.target.value);
                onChange(f.key, v);
              }}
            />
          </Grid>
          <Grid size={{ xs: 6, sm: 4, md: 2 }}>
            <TextField
              fullWidth
              label="Jedn."
              size="small"
              value={unit}
              onChange={(e) => onChange(unitKey, e.target.value)}
            />
          </Grid>
          <Grid size={{ xs: 6, sm: 2, md: 2 }}>
            <TextField
              fullWidth
              label="Ref. dół"
              type="number"
              size="small"
              value={refLow ?? ''}
              onChange={(e) =>
                onChange(refLowKey, e.target.value === '' ? undefined : parseFloat(e.target.value))
              }
            />
          </Grid>
          <Grid size={{ xs: 6, sm: 2, md: 2 }}>
            <TextField
              fullWidth
              label="Ref. góra"
              type="number"
              size="small"
              value={refHigh ?? ''}
              onChange={(e) =>
                onChange(refHighKey, e.target.value === '' ? undefined : parseFloat(e.target.value))
              }
            />
          </Grid>
        </Grid>
      );
    }

    if (f.type === 'SELECT') {
      const opts = f.options ?? [];
      return (
        <Grid key={f.key} size={{ xs: 12 }}>
          <FormControl fullWidth size="small" sx={{ maxWidth: 400 }}>
            <InputLabel>{f.label}</InputLabel>
            <Select
              value={(value as string) ?? ''}
              label={f.label}
              onChange={(e) => onChange(f.key, e.target.value)}
            >
              {opts.map((o) => (
                <MenuItem key={o} value={o}>
                  {o}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
      );
    }

    return (
      <Grid key={f.key} size={{ xs: 12 }}>
        <TextField
          fullWidth
          label={f.label}
          multiline={f.type === 'TEXT' && (f.label.toLowerCase().includes('notat') || f.key === 'notes')}
          rows={f.key === 'notes' ? 4 : 1}
          value={(value as string) ?? ''}
          onChange={(e) => onChange(f.key, e.target.value)}
        />
      </Grid>
    );
  };

  return (
    <Grid container spacing={2}>
      {sorted.map((f, i) => (
        <Grid size={{ xs: 12 }} key={f.key}>
          {i > 0 && <Divider sx={{ my: 1, opacity: 0.6 }} />}
          {renderField(f)}
        </Grid>
      ))}
    </Grid>
  );
}
