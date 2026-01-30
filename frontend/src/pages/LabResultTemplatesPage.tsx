import { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Dialog,
  DialogContent,
  Alert,
  Chip,
  Stack,
  CircularProgress,
} from '@mui/material';
import { Add, Edit, Delete, Science } from '@mui/icons-material';
import { api } from '../services/api';
import { useNotification } from '../hooks/useNotification';
import LabResultTemplateBuilder, {
  type LabResultTemplate,
} from '../components/LabResultTemplateBuilder';

export default function LabResultTemplatesPage() {
  const [templates, setTemplates] = useState<LabResultTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [editing, setEditing] = useState<LabResultTemplate | null>(null);
  const { success: showSuccess, error: showError } = useNotification();

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const res = await api.get('/lab-result-templates');
      setTemplates(res.data.templates || []);
    } catch (e: any) {
      showError(e.response?.data?.error || 'Błąd pobierania szablonów');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditing(null);
    setBuilderOpen(true);
  };

  const handleEdit = (t: LabResultTemplate) => {
    setEditing(t);
    setBuilderOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Czy na pewno chcesz usunąć ten szablon?')) return;
    try {
      await api.delete(`/lab-result-templates/${id}`);
      showSuccess('Szablon usunięty');
      fetchTemplates();
    } catch (e: any) {
      showError(e.response?.data?.error || 'Błąd usuwania szablonu');
    }
  };

  const handleSave = async (t: LabResultTemplate) => {
    try {
      if (t.id) {
        await api.put(`/lab-result-templates/${t.id}`, t);
        showSuccess('Szablon zaktualizowany');
      } else {
        await api.post('/lab-result-templates', t);
        showSuccess('Szablon utworzony');
      }
      setBuilderOpen(false);
      setEditing(null);
      fetchTemplates();
    } catch (e: any) {
      showError(e.response?.data?.error || 'Błąd zapisywania szablonu');
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
          <Science />
          Zarządzaj szablonami badań
        </Typography>
        <Button variant="contained" startIcon={<Add />} onClick={handleCreate}>
          Nowy szablon
        </Button>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : templates.length === 0 ? (
        <Alert severity="info">
          Brak szablonów. Kliknij „Nowy szablon”, aby dodać np. Cynk, Selen, Testosteron, DHEA-S.
        </Alert>
      ) : (
        <List>
          {templates
            .sort((a, b) => (a.isDefault && !b.isDefault ? -1 : !a.isDefault && b.isDefault ? 1 : 0))
            .map((t) => (
              <Paper key={t.id} sx={{ mb: 2 }}>
                <ListItem>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="h6">{t.name}</Typography>
                        {t.isDefault && <Chip label="Domyślny" color="primary" size="small" />}
                      </Box>
                    }
                    secondary={
                      <Typography variant="body2" color="text.secondary">
                        {(t.fields || []).length} {(t.fields || []).length === 1 ? 'pole' : 'pól'}
                      </Typography>
                    }
                  />
                  <ListItemSecondaryAction>
                    <Stack direction="row" spacing={1}>
                      <IconButton edge="end" color="primary" onClick={() => handleEdit(t)} title="Edytuj">
                        <Edit />
                      </IconButton>
                      {!t.isDefault && t.id && (
                        <IconButton edge="end" color="error" onClick={() => handleDelete(t.id!)} title="Usuń">
                          <Delete />
                        </IconButton>
                      )}
                    </Stack>
                  </ListItemSecondaryAction>
                </ListItem>
              </Paper>
            ))}
        </List>
      )}

      <Dialog
        open={builderOpen}
        onClose={() => { setBuilderOpen(false); setEditing(null); }}
        maxWidth="lg"
        fullWidth
        PaperProps={{ sx: { height: '90vh', maxHeight: '90vh' } }}
      >
        <DialogContent sx={{ p: 0, overflow: 'auto' }}>
          <LabResultTemplateBuilder
            template={editing}
            onSave={handleSave}
            onCancel={() => { setBuilderOpen(false); setEditing(null); }}
          />
        </DialogContent>
      </Dialog>
    </Box>
  );
}
