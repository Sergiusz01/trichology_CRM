import { useState, useEffect } from 'react';
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
  Divider,
} from '@mui/material';
import {
  Add,
  Delete,
  Edit,
  DragIndicator,
  Save,
  Cancel,
} from '@mui/icons-material';
import { api } from '../services/api';
import { useNotification } from '../hooks/useNotification';

export interface TemplateField {
  id?: string;
  type: 'TEXT' | 'TEXTAREA' | 'SELECT' | 'MULTISELECT' | 'CHECKBOX' | 'NUMBER' | 'DATE' | 'SECTION' | 'SUBSECTION' | 'IMAGE_SELECT';
  label: string;
  key: string;
  required: boolean;
  placeholder?: string;
  options?: string[];
  defaultValue?: string | number | boolean | string[];
  order: number;
}

export interface ConsultationTemplate {
  id?: string;
  name: string;
  fields: TemplateField[];
  isDefault: boolean;
  isActive: boolean;
}

interface ConsultationTemplateBuilderProps {
  template?: ConsultationTemplate | null;
  onSave: (template: ConsultationTemplate) => void;
  onCancel: () => void;
}

export default function ConsultationTemplateBuilder({
  template,
  onSave,
  onCancel,
}: ConsultationTemplateBuilderProps) {
  const [name, setName] = useState(template?.name || '');
  const [fields, setFields] = useState<TemplateField[]>(
    template?.fields || []
  );
  const [isDefault, setIsDefault] = useState(template?.isDefault || false);
  const [editingFieldIndex, setEditingFieldIndex] = useState<number | null>(null);
  const [fieldDialogOpen, setFieldDialogOpen] = useState(false);
  const [currentField, setCurrentField] = useState<Partial<TemplateField>>({
    type: 'TEXT',
    label: '',
    key: '',
    required: false,
    order: fields.length,
  });
  const { success: showSuccess, error: showError } = useNotification();

  const fieldTypes = [
    { value: 'SECTION', label: 'Nagłówek sekcji' },
    { value: 'SUBSECTION', label: 'Nagłówek podsekcji' },
    { value: 'IMAGE_SELECT', label: 'Wybór na obrazie (skala)' },
    { value: 'TEXT', label: 'Tekst krótki' },
    { value: 'TEXTAREA', label: 'Tekst długi' },
    { value: 'SELECT', label: 'Wybór pojedynczy' },
    { value: 'MULTISELECT', label: 'Wybór wielokrotny' },
    { value: 'CHECKBOX', label: 'Checkbox' },
    { value: 'NUMBER', label: 'Liczba' },
    { value: 'DATE', label: 'Data' },
  ];

  const handleAddField = () => {
    setCurrentField({
      type: 'TEXT',
      label: '',
      key: '',
      required: false,
      order: fields.length,
    });
    setEditingFieldIndex(null);
    setFieldDialogOpen(true);
  };

  const handleEditField = (index: number) => {
    setCurrentField(fields[index]);
    setEditingFieldIndex(index);
    setFieldDialogOpen(true);
  };

  const handleDeleteField = (index: number) => {
    const newFields = fields.filter((_, i) => i !== index);
    // Reorder fields
    setFields(newFields.map((f, i) => ({ ...f, order: i })));
  };

  const handleSaveField = () => {
    if (!currentField.label || !currentField.key) {
      showError('Etykieta i klucz są wymagane');
      return;
    }

    // Validate key format (alphanumeric and underscore)
    if (!/^[a-zA-Z0-9_]+$/.test(currentField.key)) {
      showError('Klucz może zawierać tylko litery, cyfry i podkreślenia');
      return;
    }

    // Check for duplicate keys
    const duplicateKey = fields.some(
      (f, i) => f.key === currentField.key && i !== editingFieldIndex
    );
    if (duplicateKey) {
      showError('Klucz musi być unikalny');
      return;
    }

    // Validate options for SELECT and MULTISELECT
    if (
      (currentField.type === 'SELECT' || currentField.type === 'MULTISELECT') &&
      (!currentField.options || currentField.options.length === 0)
    ) {
      showError('Typy SELECT i MULTISELECT wymagają przynajmniej jednej opcji');
      return;
    }

    const fieldToSave: TemplateField = {
      id: currentField.id,
      type: currentField.type as TemplateField['type'],
      label: currentField.label,
      key: currentField.key,
      required: currentField.required || false,
      placeholder: currentField.placeholder,
      options: currentField.options,
      defaultValue: currentField.defaultValue,
      order: currentField.order ?? fields.length,
    };

    if (editingFieldIndex !== null) {
      // Update existing field
      const newFields = [...fields];
      newFields[editingFieldIndex] = fieldToSave;
      setFields(newFields);
    } else {
      // Add new field
      setFields([...fields, fieldToSave]);
    }

    setFieldDialogOpen(false);
    setCurrentField({
      type: 'TEXT',
      label: '',
      key: '',
      required: false,
      order: fields.length + 1,
    });
    setEditingFieldIndex(null);
  };

  const handleSaveTemplate = () => {
    if (!name.trim()) {
      showError('Nazwa szablonu jest wymagana');
      return;
    }

    if (fields.length === 0) {
      showError('Szablon musi zawierać przynajmniej jedno pole');
      return;
    }

    onSave({
      id: template?.id,
      name: name.trim(),
      fields: fields.sort((a, b) => a.order - b.order),
      isDefault,
      isActive: true,
    });
  };

  const handleAddOption = () => {
    const options = currentField.options || [];
    setCurrentField({
      ...currentField,
      options: [...options, ''],
    });
  };

  const handleUpdateOption = (index: number, value: string) => {
    const options = currentField.options || [];
    const newOptions = [...options];
    newOptions[index] = value;
    setCurrentField({ ...currentField, options: newOptions });
  };

  const handleRemoveOption = (index: number) => {
    const options = currentField.options || [];
    setCurrentField({
      ...currentField,
      options: options.filter((_, i) => i !== index),
    });
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" sx={{ mb: 3, fontWeight: 'bold' }}>
        {template?.id ? 'Edytuj szablon' : 'Nowy szablon konsultacji'}
      </Typography>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Nazwa szablonu"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </Grid>
          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Switch
                  checked={isDefault}
                  onChange={(e) => setIsDefault(e.target.checked)}
                />
              }
              label="Ustaw jako domyślny"
            />
          </Grid>
        </Grid>
      </Paper>

      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">Pola formularza</Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={handleAddField}
        >
          Dodaj pole
        </Button>
      </Box>

      {fields.length === 0 ? (
        <Alert severity="info" sx={{ mb: 2 }}>
          Brak pól. Kliknij "Dodaj pole", aby rozpocząć.
        </Alert>
      ) : (
        <Stack spacing={2}>
          {fields
            .sort((a, b) => a.order - b.order)
            .map((field, index) => (
              <Paper key={index} sx={{ p: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Box sx={{ flex: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <DragIndicator sx={{ color: 'text.secondary' }} />
                      <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                        {field.label}
                      </Typography>
                      <Chip
                        label={fieldTypes.find((t) => t.value === field.type)?.label || field.type}
                        size="small"
                        color="primary"
                        variant="outlined"
                      />
                      {field.required && (
                        <Chip label="Wymagane" size="small" color="error" />
                      )}
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      Klucz: <code>{field.key}</code>
                    </Typography>
                    {field.placeholder && (
                      <Typography variant="body2" color="text.secondary">
                        Placeholder: {field.placeholder}
                      </Typography>
                    )}
                    {field.options && field.options.length > 0 && (
                      <Box sx={{ mt: 1 }}>
                        <Typography variant="body2" color="text.secondary">
                          Opcje:
                        </Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                          {field.options.map((opt, optIdx) => (
                            <Chip key={optIdx} label={opt} size="small" />
                          ))}
                        </Box>
                      </Box>
                    )}
                  </Box>
                  <Box>
                    <IconButton
                      color="primary"
                      onClick={() => handleEditField(index)}
                    >
                      <Edit />
                    </IconButton>
                    <IconButton
                      color="error"
                      onClick={() => handleDeleteField(index)}
                    >
                      <Delete />
                    </IconButton>
                  </Box>
                </Box>
              </Paper>
            ))}
        </Stack>
      )}

      {/* Field Dialog */}
      <Dialog
        open={fieldDialogOpen}
        onClose={() => setFieldDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {editingFieldIndex !== null ? 'Edytuj pole' : 'Dodaj pole'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <FormControl fullWidth required>
                <InputLabel>Typ pytania</InputLabel>
                <Select
                  value={currentField.type}
                  label="Typ pytania"
                  onChange={(e) =>
                    setCurrentField({
                      ...currentField,
                      type: e.target.value as TemplateField['type'],
                      options: e.target.value === 'SELECT' || e.target.value === 'MULTISELECT' ? currentField.options || [''] : undefined,
                    })
                  }
                >
                  {fieldTypes.map((type) => (
                    <MenuItem key={type.value} value={type.value}>
                      {type.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Etykieta"
                value={currentField.label || ''}
                onChange={(e) =>
                  setCurrentField({ ...currentField, label: e.target.value })
                }
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Klucz (identyfikator)"
                value={currentField.key || ''}
                onChange={(e) =>
                  setCurrentField({ ...currentField, key: e.target.value })
                }
                required
                helperText="Tylko litery, cyfry i podkreślenia"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Placeholder"
                value={currentField.placeholder || ''}
                onChange={(e) =>
                  setCurrentField({ ...currentField, placeholder: e.target.value })
                }
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={currentField.required || false}
                    onChange={(e) =>
                      setCurrentField({ ...currentField, required: e.target.checked })
                    }
                  />
                }
                label="Pole wymagane"
              />
            </Grid>
            {(currentField.type === 'SELECT' || currentField.type === 'MULTISELECT') && (
              <Grid item xs={12}>
                <Divider sx={{ my: 2 }} />
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Opcje wyboru
                </Typography>
                <Stack spacing={1}>
                  {(currentField.options || ['']).map((option, optIdx) => (
                    <Box key={optIdx} sx={{ display: 'flex', gap: 1 }}>
                      <TextField
                        fullWidth
                        size="small"
                        value={option}
                        onChange={(e) => handleUpdateOption(optIdx, e.target.value)}
                        placeholder={`Opcja ${optIdx + 1}`}
                      />
                      <IconButton
                        color="error"
                        onClick={() => handleRemoveOption(optIdx)}
                        disabled={(currentField.options || []).length === 1}
                      >
                        <Delete />
                      </IconButton>
                    </Box>
                  ))}
                  <Button
                    startIcon={<Add />}
                    onClick={handleAddOption}
                    variant="outlined"
                    size="small"
                  >
                    Dodaj opcję
                  </Button>
                </Stack>
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFieldDialogOpen(false)} startIcon={<Cancel />}>
            Anuluj
          </Button>
          <Button
            onClick={handleSaveField}
            variant="contained"
            startIcon={<Save />}
          >
            Zapisz pole
          </Button>
        </DialogActions>
      </Dialog>

      {/* Actions */}
      <Box sx={{ mt: 4, display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
        <Button onClick={onCancel} variant="outlined">
          Anuluj
        </Button>
        <Button
          onClick={handleSaveTemplate}
          variant="contained"
          startIcon={<Save />}
          disabled={!name.trim() || fields.length === 0}
        >
          Zapisz szablon
        </Button>
      </Box>
    </Box>
  );
}
