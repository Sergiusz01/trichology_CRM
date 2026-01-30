import { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Chip,
  Stack,
  Switch,
  FormControlLabel,
  Alert,
} from '@mui/material';
import { Add, Delete, Edit, DragIndicator } from '@mui/icons-material';
import { useNotification } from '../hooks/useNotification';

export interface LabResultTemplateField {
  id?: string;
  type: 'NUMBER' | 'TEXT' | 'SELECT';
  label: string;
  key: string;
  unit?: string;
  refLow?: number;
  refHigh?: number;
  order: number;
  options?: string[];
}

export interface LabResultTemplate {
  id?: string;
  name: string;
  fields: LabResultTemplateField[];
  isDefault: boolean;
  isActive: boolean;
  isGlobal?: boolean;
}

interface LabResultTemplateBuilderProps {
  template?: LabResultTemplate | null;
  onSave: (t: LabResultTemplate) => void;
  onCancel: () => void;
}

const FIELD_TYPES = [
  { value: 'NUMBER' as const, label: 'Liczba (wynik + jednostka + ref.)' },
  { value: 'TEXT' as const, label: 'Tekst' },
  { value: 'SELECT' as const, label: 'Wybór z listy' },
];

export default function LabResultTemplateBuilder({
  template,
  onSave,
  onCancel,
}: LabResultTemplateBuilderProps) {
  const [name, setName] = useState(template?.name ?? '');
  const [fields, setFields] = useState<LabResultTemplateField[]>(template?.fields ?? []);
  const [isDefault, setIsDefault] = useState(template?.isDefault ?? false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [current, setCurrent] = useState<Partial<LabResultTemplateField>>({
    type: 'NUMBER',
    label: '',
    key: '',
    order: fields.length,
  });
  const { success: showSuccess, error: showError } = useNotification();

  const openAdd = () => {
    setCurrent({ type: 'NUMBER', label: '', key: '', order: fields.length });
    setEditingIndex(null);
    setDialogOpen(true);
  };

  const openEdit = (index: number) => {
    setCurrent(fields[index]);
    setEditingIndex(index);
    setDialogOpen(true);
  };

  const removeField = (index: number) => {
    const next = fields.filter((_, i) => i !== index).map((f, i) => ({ ...f, order: i }));
    setFields(next);
  };

  const saveField = () => {
    if (!current.label?.trim()) {
      showError('Etykieta jest wymagana');
      return;
    }
    if (!current.key?.trim()) {
      showError('Klucz jest wymagany');
      return;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(current.key)) {
      showError('Klucz: tylko litery, cyfry, podkreślenia');
      return;
    }
    const keys = fields.map((f) => f.key);
    if (editingIndex !== null) {
      const other = keys.filter((_, i) => i !== editingIndex);
      if (other.includes(current.key)) {
        showError('Klucz musi być unikalny');
        return;
      }
    } else {
      if (keys.includes(current.key)) {
        showError('Klucz musi być unikalny');
        return;
      }
    }
    if ((current.type === 'SELECT') && (!current.options || current.options.length === 0)) {
      showError('SELECT wymaga co najmniej jednej opcji');
      return;
    }

    const saved: LabResultTemplateField = {
      type: (current.type ?? 'NUMBER') as 'NUMBER' | 'TEXT' | 'SELECT',
      label: current.label.trim(),
      key: current.key.trim(),
      unit: current.unit || undefined,
      refLow: current.refLow,
      refHigh: current.refHigh,
      order: current.order ?? fields.length,
      options: current.options?.filter(Boolean),
    };

    if (editingIndex !== null) {
      const next = [...fields];
      next[editingIndex] = saved;
      setFields(next);
    } else {
      setFields([...fields, saved]);
    }
    setDialogOpen(false);
    setCurrent({ type: 'NUMBER', label: '', key: '', order: fields.length + 1 });
    setEditingIndex(null);
  };

  const handleSave = () => {
    if (!name.trim()) {
      showError('Nazwa szablonu jest wymagana');
      return;
    }
    if (fields.length === 0) {
      showError('Szablon musi zawierać co najmniej jedno pole');
      return;
    }
    onSave({
      id: template?.id,
      name: name.trim(),
      fields: fields.slice().sort((a, b) => a.order - b.order),
      isDefault,
      isActive: true,
    });
  };

  const updateOption = (idx: number, val: string) => {
    const opts = [...(current.options || [])];
    opts[idx] = val;
    setCurrent({ ...current, options: opts });
  };

  const addOption = () => {
    setCurrent({ ...current, options: [...(current.options || []), ''] });
  };

  const removeOption = (idx: number) => {
    const opts = (current.options || []).filter((_, i) => i !== idx);
    setCurrent({ ...current, options: opts });
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" sx={{ mb: 3, fontWeight: 'bold' }}>
        {template?.id ? 'Edytuj szablon wyników badań' : 'Nowy szablon wyników badań'}
      </Typography>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12 }}>
            <TextField
              fullWidth
              label="Nazwa szablonu"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <FormControlLabel
              control={<Switch checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} />}
              label="Ustaw jako domyślny"
            />
          </Grid>
        </Grid>
      </Paper>

      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">Pola (parametry badań)</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={openAdd}>
          Dodaj pole
        </Button>
      </Box>

      {fields.length === 0 ? (
        <Alert severity="info" sx={{ mb: 2 }}>
          Brak pól. Kliknij „Dodaj pole”, np. Cynk, Selen, Testosteron, DHEA-S itd.
        </Alert>
      ) : (
        <Stack spacing={2}>
          {fields
            .slice()
            .sort((a, b) => a.order - b.order)
            .map((f, idx) => (
              <Paper key={idx} sx={{ p: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Box sx={{ flex: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <DragIndicator sx={{ color: 'text.secondary' }} />
                      <Typography variant="subtitle1" fontWeight="bold">
                        {f.label}
                      </Typography>
                      <Chip
                        label={FIELD_TYPES.find((t) => t.value === f.type)?.label ?? f.type}
                        size="small"
                        color="primary"
                        variant="outlined"
                      />
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      Klucz: <code>{f.key}</code>
                      {f.unit && ` • Jednostka: ${f.unit}`}
                      {(f.refLow != null || f.refHigh != null) &&
                        ` • Ref.: ${f.refLow ?? '?'} – ${f.refHigh ?? '?'}`}
                    </Typography>
                  </Box>
                  <Box>
                    <IconButton color="primary" onClick={() => openEdit(idx)}>
                      <Edit />
                    </IconButton>
                    <IconButton color="error" onClick={() => removeField(idx)}>
                      <Delete />
                    </IconButton>
                  </Box>
                </Box>
              </Paper>
            ))}
        </Stack>
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingIndex !== null ? 'Edytuj pole' : 'Dodaj pole'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label="Etykieta"
                value={current.label ?? ''}
                onChange={(e) => setCurrent({ ...current, label: e.target.value })}
                required
                placeholder="np. Cynk, Selen, Testosteron"
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label="Klucz (bez spacji, tylko a–z, 0–9, _)"
                value={current.key ?? ''}
                onChange={(e) => setCurrent({ ...current, key: e.target.value })}
                required
                placeholder="np. zinc, selenium, testosterone"
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <FormControl fullWidth>
                <InputLabel>Typ</InputLabel>
                <Select
                  value={current.type ?? 'NUMBER'}
                  label="Typ"
                  onChange={(e) => setCurrent({ ...current, type: e.target.value as 'NUMBER' | 'TEXT' | 'SELECT' })}
                >
                  {FIELD_TYPES.map((t) => (
                    <MenuItem key={t.value} value={t.value}>
                      {t.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            {(current.type === 'NUMBER' || !current.type) && (
              <>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <TextField
                    fullWidth
                    label="Jednostka (domyślnie)"
                    value={current.unit ?? ''}
                    onChange={(e) => setCurrent({ ...current, unit: e.target.value || undefined })}
                    placeholder="np. ng/mL"
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Ref. dolna"
                    value={current.refLow ?? ''}
                    onChange={(e) =>
                      setCurrent({ ...current, refLow: e.target.value === '' ? undefined : Number(e.target.value) })
                    }
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Ref. górna"
                    value={current.refHigh ?? ''}
                    onChange={(e) =>
                      setCurrent({ ...current, refHigh: e.target.value === '' ? undefined : Number(e.target.value) })
                    }
                  />
                </Grid>
              </>
            )}
            {current.type === 'SELECT' && (
              <Grid size={{ xs: 12 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Opcje
                </Typography>
                <Stack direction="row" flexWrap="wrap" gap={1}>
                  {(current.options ?? []).map((opt, i) => (
                    <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <TextField
                        size="small"
                        value={opt}
                        onChange={(e) => updateOption(i, e.target.value)}
                        placeholder="Opcja"
                        sx={{ width: 140 }}
                      />
                      <IconButton size="small" onClick={() => removeOption(i)}>
                        <Delete fontSize="small" />
                      </IconButton>
                    </Box>
                  ))}
                  <Button size="small" onClick={addOption}>
                    + Opcja
                  </Button>
                </Stack>
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Anuluj</Button>
          <Button variant="contained" onClick={saveField}>
            {editingIndex !== null ? 'Zapisz' : 'Dodaj'}
          </Button>
        </DialogActions>
      </Dialog>

      <Box sx={{ display: 'flex', gap: 2, mt: 4 }}>
        <Button variant="outlined" onClick={onCancel}>
          Anuluj
        </Button>
        <Button variant="contained" onClick={handleSave}>
          Zapisz szablon
        </Button>
      </Box>
    </Box>
  );
}
