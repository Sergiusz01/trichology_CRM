import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  DialogTitle,
  DialogContent,
  Alert,
  Chip,
  Stack,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Settings,
} from '@mui/icons-material';
import { api } from '../services/api';
import { useNotification } from '../hooks/useNotification';
import ConsultationTemplateBuilder, {
  ConsultationTemplate,
} from '../components/ConsultationTemplateBuilder';

export default function ConsultationTemplatesPage() {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<ConsultationTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ConsultationTemplate | null>(null);
  const { success: showSuccess, error: showError } = useNotification();

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const response = await api.get('/consultation-templates');
      console.log('[ConsultationTemplatesPage] Templates response:', response.data);
      const templatesList = response.data.templates || [];
      console.log('[ConsultationTemplatesPage] Templates count:', templatesList.length);
      templatesList.forEach((t: any) => {
        console.log(`[ConsultationTemplatesPage] Template: ${t.name}, isDefault: ${t.isDefault}, fields: ${t.fields?.length || 0}`);
      });
      setTemplates(templatesList);
    } catch (error: any) {
      console.error('Błąd pobierania szablonów:', error);
      showError('Błąd pobierania szablonów');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTemplate = () => {
    setEditingTemplate(null);
    setBuilderOpen(true);
  };

  const handleEditTemplate = (template: ConsultationTemplate) => {
    setEditingTemplate(template);
    setBuilderOpen(true);
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (!window.confirm('Czy na pewno chcesz usunąć ten szablon?')) {
      return;
    }

    try {
      await api.delete(`/consultation-templates/${templateId}`);
      showSuccess('Szablon usunięty');
      fetchTemplates();
    } catch (error: any) {
      console.error('Błąd usuwania szablonu:', error);
      showError('Błąd usuwania szablonu');
    }
  };

  const handleSaveTemplate = async (template: ConsultationTemplate) => {
    try {
      if (template.id) {
        // Update existing
        await api.put(`/consultation-templates/${template.id}`, template);
        showSuccess('Szablon zaktualizowany');
      } else {
        // Create new
        await api.post('/consultation-templates', template);
        showSuccess('Szablon utworzony');
      }
      setBuilderOpen(false);
      setEditingTemplate(null);
      fetchTemplates();
    } catch (error: any) {
      console.error('Błąd zapisywania szablonu:', error);
      const errorMessage = error.response?.data?.error || 'Błąd zapisywania szablonu';
      showError(errorMessage);
    }
  };

  const handleCancelBuilder = () => {
    setBuilderOpen(false);
    setEditingTemplate(null);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
          Szablony kart konsultacji
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={handleCreateTemplate}
        >
          Nowy szablon
        </Button>
      </Box>

      {loading ? (
        <Typography>Ładowanie...</Typography>
      ) : templates.length === 0 ? (
        <Alert severity="info">
          Brak szablonów. Kliknij "Nowy szablon", aby utworzyć pierwszy szablon.
        </Alert>
      ) : (
        <List>
          {/* Show default template first */}
          {templates
            .sort((a, b) => {
              if (a.isDefault && !b.isDefault) return -1;
              if (!a.isDefault && b.isDefault) return 1;
              return 0;
            })
            .map((template) => (
              <Paper key={template.id} sx={{ mb: 2 }}>
                <ListItem>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="h6">{template.name}</Typography>
                        {template.isDefault && (
                          <Chip label="Domyślny (Standardowy arkusz)" color="primary" size="small" />
                        )}
                      </Box>
                    }
                    secondary={
                      <Typography variant="body2" color="text.secondary">
                        {template.fields.length} {template.fields.length === 1 ? 'pole' : 'pól'}
                        {template.isDefault && ' • Używany automatycznie przy tworzeniu nowej konsultacji'}
                      </Typography>
                    }
                  />
                  <ListItemSecondaryAction>
                    <Stack direction="row" spacing={1}>
                      <IconButton
                        edge="end"
                        color="primary"
                        onClick={() => {
                          console.log('[ConsultationTemplatesPage] Editing template:', template);
                          handleEditTemplate(template);
                        }}
                        title="Edytuj szablon"
                      >
                        <Edit />
                      </IconButton>
                      {!template.isDefault && template.id && (
                        <IconButton
                          edge="end"
                          color="error"
                          onClick={() => handleDeleteTemplate(template.id)}
                          title="Usuń szablon"
                        >
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
        onClose={handleCancelBuilder}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            height: '90vh',
            maxHeight: '90vh',
          },
        }}
      >
        <DialogContent sx={{ p: 0, overflow: 'auto' }}>
          <ConsultationTemplateBuilder
            template={editingTemplate}
            onSave={handleSaveTemplate}
            onCancel={handleCancelBuilder}
          />
        </DialogContent>
      </Dialog>
    </Box>
  );
}
