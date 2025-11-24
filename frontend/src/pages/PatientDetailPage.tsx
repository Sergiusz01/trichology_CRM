import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Button,
  Tabs,
  Tab,
  Grid,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  IconButton,
  Alert,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Email,
  History,
  Assignment,
  Science,
  PhotoCamera,
  LocalHospital,
} from '@mui/icons-material';
import { api } from '../services/api';

interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  age?: number;
  gender?: string;
  phone?: string;
  email?: string;
  occupation?: string;
  address?: string;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`patient-tabpanel-${index}`}
      aria-labelledby={`patient-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

export default function PatientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0);
  const [consultations, setConsultations] = useState<any[]>([]);
  const [labResults, setLabResults] = useState<any[]>([]);
  const [scalpPhotos, setScalpPhotos] = useState<any[]>([]);
  const [carePlans, setCarePlans] = useState<any[]>([]);
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    type: 'patient' | 'consultation' | 'labResult' | 'scalpPhoto' | 'carePlan' | null;
    id: string | null;
    name: string;
  }>({ open: false, type: null, id: null, name: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (id) {
      fetchPatient();
    }
  }, [id]);

  const fetchPatient = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/patients/${id}`);
      setPatient(response.data.patient);
      setConsultations(response.data.patient.consultations || []);
      setLabResults(response.data.patient.labResults || []);
      setScalpPhotos(response.data.patient.scalpPhotos || []);
      setCarePlans(response.data.patient.carePlans || []);
    } catch (error) {
      console.error('Błąd pobierania pacjenta:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (
    type: 'patient' | 'consultation' | 'labResult' | 'scalpPhoto' | 'carePlan',
    id: string,
    name: string
  ) => {
    setDeleteDialog({ open: true, type, id, name });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteDialog.id || !deleteDialog.type) return;

    try {
      setError('');
      setSuccess('');

      switch (deleteDialog.type) {
        case 'patient':
          await api.delete(`/patients/${deleteDialog.id}`);
          setSuccess('Pacjent został zarchiwizowany');
          setTimeout(() => navigate('/patients'), 1500);
          break;
        case 'consultation':
          await api.delete(`/consultations/${deleteDialog.id}`);
          setSuccess('Konsultacja została usunięta');
          fetchPatient();
          break;
        case 'labResult':
          await api.delete(`/lab-results/${deleteDialog.id}`);
          setSuccess('Wynik badania został usunięty');
          fetchPatient();
          break;
        case 'scalpPhoto':
          await api.delete(`/scalp-photos/${deleteDialog.id}`);
          setSuccess('Zdjęcie zostało usunięte');
          fetchPatient();
          break;
        case 'carePlan':
          await api.delete(`/care-plans/${deleteDialog.id}`);
          setSuccess('Plan opieki został usunięty');
          fetchPatient();
          break;
      }

      setDeleteDialog({ open: false, type: null, id: null, name: '' });
    } catch (err: any) {
      setError(err.response?.data?.error || 'Błąd podczas usuwania');
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialog({ open: false, type: null, id: null, name: '' });
  };

  if (loading) {
    return <Typography>Ładowanie...</Typography>;
  }

  if (!patient) {
    return <Typography>Pacjent nie znaleziony</Typography>;
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Box>
          <Typography variant="h4">
            {patient.firstName} {patient.lastName}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {patient.age && `${patient.age} lat`} {patient.gender && `• ${patient.gender === 'MALE' ? 'Mężczyzna' : 'Kobieta'}`}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Button
            variant="outlined"
            startIcon={<Edit />}
            onClick={() => navigate(`/patients/${id}/edit`)}
          >
            Edytuj
          </Button>
          {patient.email && (
            <>
              <Button
                variant="contained"
                color="primary"
                startIcon={<Email />}
                onClick={() => navigate(`/patients/${id}/email`)}
              >
                Wyślij email
              </Button>
              <Button
                variant="outlined"
                startIcon={<History />}
                onClick={() => navigate(`/patients/${id}/email-history`)}
              >
                Historia emaili
              </Button>
            </>
          )}
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => navigate(`/patients/${id}/consultations/new`)}
          >
            Nowa konsultacja
          </Button>
          <Button
            variant="outlined"
            color="error"
            startIcon={<Delete />}
            onClick={() => handleDeleteClick('patient', id!, `${patient.firstName} ${patient.lastName}`)}
          >
            Usuń
          </Button>
        </Box>
      </Box>

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

      <Paper>
        <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)}>
          <Tab label="Przegląd" />
          <Tab label="Konsultacje" icon={<Assignment />} iconPosition="start" />
          <Tab label="Wyniki badań" icon={<Science />} iconPosition="start" />
          <Tab label="Zdjęcia" icon={<PhotoCamera />} iconPosition="start" />
          <Tab label="Plany opieki" icon={<LocalHospital />} iconPosition="start" />
        </Tabs>

        <TabPanel value={tabValue} index={0}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Dane osobowe
                  </Typography>
                  <Typography><strong>Imię:</strong> {patient.firstName}</Typography>
                  <Typography><strong>Nazwisko:</strong> {patient.lastName}</Typography>
                  {patient.age && (
                    <Typography><strong>Wiek:</strong> {patient.age} lat</Typography>
                  )}
                  {patient.gender && (
                    <Typography>
                      <strong>Płeć:</strong>{' '}
                      {patient.gender === 'MALE'
                        ? 'Mężczyzna'
                        : patient.gender === 'FEMALE'
                        ? 'Kobieta'
                        : 'Inna'}
                    </Typography>
                  )}
                  {patient.phone && (
                    <Typography><strong>Telefon:</strong> {patient.phone}</Typography>
                  )}
                  {patient.email && (
                    <Typography><strong>Email:</strong> {patient.email}</Typography>
                  )}
                  {patient.occupation && (
                    <Typography><strong>Zawód:</strong> {patient.occupation}</Typography>
                  )}
                  {patient.address && (
                    <Typography><strong>Adres:</strong> {patient.address}</Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Statystyki
                  </Typography>
                  <Typography>
                    <strong>Konsultacje:</strong> {consultations.length}
                  </Typography>
                  <Typography>
                    <strong>Wyniki badań:</strong> {labResults.length}
                  </Typography>
                  <Typography>
                    <strong>Zdjęcia:</strong> {scalpPhotos.length}
                  </Typography>
                  <Typography>
                    <strong>Plany opieki:</strong> {carePlans.length}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <Box sx={{ mb: 2 }}>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => navigate(`/patients/${id}/consultations/new`)}
            >
              Nowa konsultacja
            </Button>
          </Box>
          {consultations.length === 0 ? (
            <Typography>Brak konsultacji</Typography>
          ) : (
            consultations.map((consultation) => (
              <Card key={consultation.id} sx={{ mb: 2 }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box>
                      <Typography variant="h6">
                        {new Date(consultation.consultationDate).toLocaleDateString('pl-PL')}
                      </Typography>
                      {consultation.diagnosis && (
                        <Typography variant="body2" color="text.secondary">
                          {consultation.diagnosis}
                        </Typography>
                      )}
                    </Box>
                    <Box>
                      <Button
                        size="small"
                        onClick={() => navigate(`/consultations/${consultation.id}`)}
                        sx={{ mr: 1 }}
                      >
                        Zobacz
                      </Button>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() =>
                          handleDeleteClick(
                            'consultation',
                            consultation.id,
                            new Date(consultation.consultationDate).toLocaleDateString('pl-PL')
                          )
                        }
                      >
                        <Delete />
                      </IconButton>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            ))
          )}
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          <Box sx={{ mb: 2 }}>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => navigate(`/patients/${id}/lab-results`)}
            >
              Dodaj wynik
            </Button>
          </Box>
          {labResults.length === 0 ? (
            <Typography>Brak wyników badań</Typography>
          ) : (
            labResults.map((result) => (
              <Card key={result.id} sx={{ mb: 2 }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box>
                      <Typography variant="h6">
                        {new Date(result.date).toLocaleDateString('pl-PL')}
                      </Typography>
                      {result.notes && (
                        <Typography variant="body2" color="text.secondary">
                          {result.notes}
                        </Typography>
                      )}
                    </Box>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() =>
                        handleDeleteClick(
                          'labResult',
                          result.id,
                          new Date(result.date).toLocaleDateString('pl-PL')
                        )
                      }
                    >
                      <Delete />
                    </IconButton>
                  </Box>
                </CardContent>
              </Card>
            ))
          )}
        </TabPanel>

        <TabPanel value={tabValue} index={3}>
          <Box sx={{ mb: 2 }}>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => navigate(`/patients/${id}/scalp-photos`)}
            >
              Dodaj zdjęcie
            </Button>
          </Box>
          {scalpPhotos.length === 0 ? (
            <Typography>Brak zdjęć</Typography>
          ) : (
            <Grid container spacing={2}>
              {scalpPhotos.map((photo) => (
                <Grid item xs={12} sm={6} md={4} key={photo.id}>
                  <Card>
                    <Box sx={{ position: 'relative' }}>
                      <Box
                        component="img"
                        src={`http://localhost:3001/uploads/${photo.filePath}`}
                        alt={photo.originalFilename}
                        sx={{
                          width: '100%',
                          height: 200,
                          objectFit: 'cover',
                        }}
                      />
                      <IconButton
                        size="small"
                        color="error"
                        sx={{
                          position: 'absolute',
                          top: 8,
                          right: 8,
                          backgroundColor: 'rgba(255, 255, 255, 0.8)',
                        }}
                        onClick={() =>
                          handleDeleteClick('scalpPhoto', photo.id, photo.originalFilename)
                        }
                      >
                        <Delete />
                      </IconButton>
                    </Box>
                    <CardContent>
                      <Typography variant="body2" color="text.secondary">
                        {new Date(photo.createdAt).toLocaleDateString('pl-PL')}
                      </Typography>
                      {photo.notes && (
                        <Typography variant="body2">{photo.notes}</Typography>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </TabPanel>

        <TabPanel value={tabValue} index={4}>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => navigate(`/patients/${id}/care-plans`)}
            sx={{ mb: 2 }}
          >
            Nowy plan opieki
          </Button>
          {carePlans.length === 0 ? (
            <Typography>Brak planów opieki</Typography>
          ) : (
            carePlans.map((plan) => (
              <Card key={plan.id} sx={{ mb: 2 }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box>
                      <Typography variant="h6">{plan.title}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {plan.totalDurationWeeks} tygodni
                      </Typography>
                    </Box>
                    <Box>
                      <Button
                        size="small"
                        onClick={() => navigate(`/care-plans/${plan.id}`)}
                        sx={{ mr: 1 }}
                      >
                        Zobacz
                      </Button>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleDeleteClick('carePlan', plan.id, plan.title)}
                      >
                        <Delete />
                      </IconButton>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            ))
          )}
        </TabPanel>
      </Paper>

      <Dialog open={deleteDialog.open} onClose={handleDeleteCancel}>
        <DialogTitle>Potwierdzenie usunięcia</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Czy na pewno chcesz usunąć{' '}
            {deleteDialog.type === 'patient' && 'pacjenta'}
            {deleteDialog.type === 'consultation' && 'konsultację'}
            {deleteDialog.type === 'labResult' && 'wynik badania'}
            {deleteDialog.type === 'scalpPhoto' && 'zdjęcie'}
            {deleteDialog.type === 'carePlan' && 'plan opieki'}{' '}
            <strong>{deleteDialog.name}</strong>?
            {deleteDialog.type === 'patient' && (
              <Typography variant="body2" color="warning.main" sx={{ mt: 1 }}>
                Uwaga: Pacjent zostanie zarchiwizowany (soft delete). Wszystkie powiązane dane pozostaną w systemie.
              </Typography>
            )}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel}>Anuluj</Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">
            Usuń
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}


