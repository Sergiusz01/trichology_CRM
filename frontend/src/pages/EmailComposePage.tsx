import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  TextField,
  Button,
  Typography,
  Grid,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
} from '@mui/material';
import { Send, AttachFile, Delete } from '@mui/icons-material';
import { api } from '../services/api';

export default function EmailComposePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [patient, setPatient] = useState<any>(null);
  const [consultations, setConsultations] = useState<any[]>([]);
  const [carePlans, setCarePlans] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    subject: '',
    message: '',
    recipientEmail: '',
    attachConsultationId: '',
    attachCarePlanId: '',
  });
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [fileInputKey] = useState(0);

  useEffect(() => {
    if (id) {
      fetchPatientData();
    }
  }, [id]);

  const fetchPatientData = async () => {
    try {
      const response = await api.get(`/patients/${id}`);
      const patientData = response.data.patient;
      setPatient(patientData);
      setFormData((prev) => ({
        ...prev,
        recipientEmail: patientData.email || '',
      }));

      // Fetch consultations
      try {
        const consultationsRes = await api.get(`/consultations/patient/${id}`);
        setConsultations(consultationsRes.data.consultations || []);
      } catch (err) {
        console.error('Błąd pobierania konsultacji:', err);
      }

      // Fetch care plans
      try {
        const carePlansRes = await api.get(`/care-plans/patient/${id}`);
        setCarePlans(carePlansRes.data?.carePlans || carePlansRes.data || []);
      } catch (err) {
        console.error('Błąd pobierania planów opieki:', err);
      }

    } catch (err: any) {
      setError(err.response?.data?.error || 'Błąd pobierania danych pacjenta');
    }
  };

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setAttachedFiles((prev) => [...prev, ...newFiles]);
    }
  };

  const handleRemoveFile = (index: number) => {
    setAttachedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('patientId', id!);
      formDataToSend.append('subject', formData.subject);
      formDataToSend.append('message', formData.message);
      if (formData.recipientEmail) {
        formDataToSend.append('recipientEmail', formData.recipientEmail);
      }
      if (formData.attachConsultationId) {
        formDataToSend.append('attachConsultationId', formData.attachConsultationId);
      }
      if (formData.attachCarePlanId) {
        formDataToSend.append('attachCarePlanId', formData.attachCarePlanId);
      }

      // Add file attachments
      attachedFiles.forEach((file) => {
        formDataToSend.append('attachments', file);
      });

      await api.post('/email/send', formDataToSend, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setSuccess('Email wysłany pomyślnie!');
      setTimeout(() => {
        navigate(`/patients/${id}`);
      }, 2000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Błąd wysyłania emaila');
    } finally {
      setLoading(false);
    }
  };

  const getConsultationLabel = (consultation: any) => {
    return `${new Date(consultation.consultationDate).toLocaleDateString('pl-PL')}${consultation.diagnosis ? ` - ${consultation.diagnosis}` : ''}`;
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Wyślij email do pacjenta
      </Typography>

      {patient && (
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          Pacjent: <strong>{patient.firstName} {patient.lastName}</strong>
        </Typography>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      <Paper sx={{ p: 3 }}>
        <form onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                required
                label="Adres email odbiorcy"
                type="email"
                value={formData.recipientEmail}
                onChange={(e) => handleChange('recipientEmail', e.target.value)}
                helperText={!patient?.email && 'Pacjent nie ma zapisanego adresu email'}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                required
                label="Temat"
                value={formData.subject}
                onChange={(e) => handleChange('subject', e.target.value)}
                placeholder="np. Zalecenia po konsultacji, Plan opieki, Wyniki badań"
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                required
                label="Treść wiadomości"
                multiline
                rows={10}
                value={formData.message}
                onChange={(e) => handleChange('message', e.target.value)}
                placeholder="Wpisz treść wiadomości do pacjenta..."
              />
            </Grid>

            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                Załączniki z systemu
              </Typography>
            </Grid>

            {consultations.length > 0 && (
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Załącz konsultację (PDF)</InputLabel>
                  <Select
                    value={formData.attachConsultationId}
                    onChange={(e) => handleChange('attachConsultationId', e.target.value)}
                    label="Załącz konsultację (PDF)"
                  >
                    <MenuItem value="">Brak</MenuItem>
                    {consultations.map((consultation) => (
                      <MenuItem key={consultation.id} value={consultation.id}>
                        {getConsultationLabel(consultation)}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            )}

            {carePlans.length > 0 && (
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Załącz plan opieki (PDF)</InputLabel>
                  <Select
                    value={formData.attachCarePlanId}
                    onChange={(e) => handleChange('attachCarePlanId', e.target.value)}
                    label="Załącz plan opieki (PDF)"
                  >
                    <MenuItem value="">Brak</MenuItem>
                    {carePlans.map((plan) => (
                      <MenuItem key={plan.id} value={plan.id}>
                        {plan.title} ({plan.totalDurationWeeks} tygodni)
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            )}

            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                Załączniki plików
              </Typography>
              <Box sx={{ mb: 2 }}>
                <input
                  key={fileInputKey}
                  type="file"
                  multiple
                  onChange={handleFileSelect}
                  style={{ display: 'none' }}
                  id="file-upload"
                />
                <label htmlFor="file-upload">
                  <Button
                    variant="outlined"
                    component="span"
                    startIcon={<AttachFile />}
                    sx={{ mr: 2 }}
                  >
                    Dodaj pliki
                  </Button>
                </label>
              </Box>

              {attachedFiles.length > 0 && (
                <List>
                  {attachedFiles.map((file, index) => (
                    <ListItem
                      key={index}
                      secondaryAction={
                        <IconButton
                          edge="end"
                          onClick={() => handleRemoveFile(index)}
                          color="error"
                        >
                          <Delete />
                        </IconButton>
                      }
                    >
                      <ListItemIcon>
                        <AttachFile />
                      </ListItemIcon>
                      <ListItemText
                        primary={file.name}
                        secondary={`${(file.size / 1024).toFixed(2)} KB`}
                      />
                    </ListItem>
                  ))}
                </List>
              )}
            </Grid>

            <Grid item xs={12}>
              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                <Button
                  variant="outlined"
                  onClick={() => navigate(`/patients/${id}`)}
                  disabled={loading}
                >
                  Anuluj
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  startIcon={<Send />}
                  disabled={loading || !formData.subject || !formData.message}
                >
                  {loading ? 'Wysyłanie...' : 'Wyślij email'}
                </Button>
              </Box>
            </Grid>
          </Grid>
        </form>
      </Paper>
    </Box>
  );
}

