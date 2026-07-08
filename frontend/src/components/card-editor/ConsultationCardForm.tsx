// ============================================================
// ConsultationCardForm — Card editor in fill mode for consultations
// Auto-fills patient data, doctor info, consultation date
// Responsive, full-width layout for easy filling
// ============================================================

import { useState, useCallback, useEffect } from 'react';
import {
  Box, Button, Typography, Alert, Snackbar, Paper, Chip,
  TextField, CircularProgress, Accordion, AccordionSummary,
  AccordionDetails, Checkbox, FormControlLabel, Divider,
  FormGroup, IconButton, Dialog, DialogTitle, DialogContent, DialogActions,
  Select, MenuItem, FormControl, InputLabel,
} from '@mui/material';
import {
  Save, Edit as EditIcon, ArrowBack, Close, Add,
  ExpandMore, Person, MedicalServices, CheckCircle,
  EventAvailable, CalendarToday,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../services/api';
import { usePatientVisits, useCreateVisit, Visit } from '../../hooks/queries/useVisits';

interface ConsultationCardFormProps {
  patientId: string;
  consultationId?: string; // if provided → EDIT mode (PUT)
  consultationDate: string;
  onDateChange: (date: string) => void;
  onSuccess: () => void;
  onError: (msg: string) => void;
  existingData?: any;
}

// All form sections mapped from the original consultation card
interface FormData {
  // Wypadanie
  hairLossSeverity: string;
  hairLossDuration: string;
  hairLossLocalization: string[];
  hairLossShampoos: string;
  hairLossNotes: string;
  // Przetłuszczanie
  oilyHairSeverity: string;
  oilyHairWashingFreq: string;
  oilyHairDuration: string;
  oilyHairShampoos: string;
  oilyHairNotes: string;
  // Łuszczenie
  scalingSeverity: string;
  scalingType: string[];
  scalingDuration: string;
  scalingOther: string;
  // Wrażliwość
  sensitivitySeverity: string;
  sensitivityProblemType: string[];
  sensitivityDuration: string;
  sensitivityOther: string;
  // Stany zapalne
  inflammatoryStates: string;
  // Wywiad
  familyHistory: string;
  dermatologyVisits: string;
  dermatologyVisitsReason: string;
  pregnancy: string;
  menstruationRegularity: string;
  contraception: string;
  medications: string;
  medicationsList: string;
  supplements: string;
  supplementsDetails: string;
  stressLevel: string;
  anesthesia: string;
  chemotherapy: string;
  radiotherapy: string;
  vaccination: string;
  antibiotics: string;
  antibioticsDetails: string;
  chronicDiseases: string;
  chronicDiseasesList: string;
  specialists: string;
  specialistsList: string;
  eatingDisorders: string;
  foodIntolerances: string;
  diet: string;
  allergies: string;
  metalPartsInBody: string;
  careRoutineShampoo: string;
  careRoutineConditioner: string;
  careRoutineOils: string;
  careRoutineChemical: string;
  // Trichoskopia
  scalpType: string[];
  scalpAppearance: string[];
  skinLesions: string[];
  hyperhidrosis: string;
  hyperkeratinization: string;
  sebaceousSecretion: string;
  seborrheaType: string[];
  seborrheaTypeOther: string;
  dandruffType: string[];
  scalpPH: string;
  hairDamage: string[];
  hairDamageReason: string[];
  hairQuality: string;
  hairShape: string;
  hairTypes: string[];
  regrowingHairs: string;
  vellusMiniaturizedHairs: string[];
  // Diagnostyka
  vascularPatterns: string[];
  perifollicularFeatures: string[];
  scalpDiseases: string[];
  otherDiagnostics: string[];
  // Diagnostyka łysienia
  alopeciaTypes: string[];
  degreeOfThinning: string;
  alopeciaType: string;
  alopeciaAffectedAreas: string[];
  miniaturization: string;
  follicularUnits: string;
  pullTest: string;
  alopeciaOther: string;
  // Rozpoznanie
  diagnosis: string;
  // Zalecenia
  careRecommendationsWashing: string;
  careRecommendationsTopical: string;
  careRecommendationsSupplement: string;
  careRecommendationsBehavior: string;
  // Wizyty/Zabiegi
  visitsProcedures: string;
  // Uwagi
  generalRemarks: string;
  // Skale
  norwoodHamiltonStage: string;
  ludwigStage: string;
  [key: string]: any;
}

const INITIAL_FORM_DATA: FormData = {
  hairLossSeverity: '', hairLossDuration: '', hairLossLocalization: [],
  hairLossShampoos: '', hairLossNotes: '',
  oilyHairSeverity: '', oilyHairWashingFreq: '', oilyHairDuration: '',
  oilyHairShampoos: '', oilyHairNotes: '',
  scalingSeverity: '', scalingType: [], scalingDuration: '', scalingOther: '',
  sensitivitySeverity: '', sensitivityProblemType: [], sensitivityDuration: '', sensitivityOther: '',
  inflammatoryStates: '',
  familyHistory: '', dermatologyVisits: '', dermatologyVisitsReason: '',
  pregnancy: '', menstruationRegularity: '', contraception: '',
  medications: '', medicationsList: '', supplements: '', supplementsDetails: '',
  stressLevel: '', anesthesia: '', chemotherapy: '', radiotherapy: '',
  vaccination: '', antibiotics: '', antibioticsDetails: '',
  chronicDiseases: '', chronicDiseasesList: '', specialists: '', specialistsList: '',
  eatingDisorders: '', foodIntolerances: '', diet: '', allergies: '', metalPartsInBody: '',
  careRoutineShampoo: '', careRoutineConditioner: '', careRoutineOils: '', careRoutineChemical: '',
  scalpType: [], scalpAppearance: [], skinLesions: [],
  hyperhidrosis: '', hyperkeratinization: '', sebaceousSecretion: '',
  seborrheaType: [], seborrheaTypeOther: '', dandruffType: [], scalpPH: '',
  hairDamage: [], hairDamageReason: [],
  hairQuality: '', hairShape: '', hairTypes: [], regrowingHairs: '',
  vellusMiniaturizedHairs: [],
  vascularPatterns: [], perifollicularFeatures: [],
  scalpDiseases: [], otherDiagnostics: [],
  alopeciaTypes: [], degreeOfThinning: '', alopeciaType: '',
  alopeciaAffectedAreas: [], miniaturization: '', follicularUnits: '',
  pullTest: '', alopeciaOther: '',
  diagnosis: '',
  careRecommendationsWashing: '', careRecommendationsTopical: '',
  careRecommendationsSupplement: '', careRecommendationsBehavior: '',
  visitsProcedures: '', generalRemarks: '',
  norwoodHamiltonStage: '', ludwigStage: '',
};

const SEVERITY_OPTIONS = ['Brak', 'Łagodne', 'Umiarkowane', 'Nasilone', 'Bardzo nasilone'];

// Styled section header
function SectionHeader({ icon, title, color = '#2E5F8A' }: { icon: React.ReactNode; title: string; color?: string }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
      <Box sx={{ color, display: 'flex' }}>{icon}</Box>
      <Typography sx={{ fontWeight: 700, fontSize: 15, color }}>{title}</Typography>
    </Box>
  );
}

// Radio severity selector
function SeveritySelector({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
      {SEVERITY_OPTIONS.map((opt) => (
        <Chip
          key={opt}
          label={opt}
          size="small"
          onClick={() => onChange(opt === value ? '' : opt)}
          variant={value === opt ? 'filled' : 'outlined'}
          color={value === opt ? 'primary' : 'default'}
          sx={{ fontSize: 12, cursor: 'pointer' }}
        />
      ))}
    </Box>
  );
}

// Checkbox group
function CheckboxGroup({ options, selected, onChange }: { options: string[]; selected: string[]; onChange: (v: string[]) => void }) {
  const toggle = (opt: string) => {
    onChange(selected.includes(opt) ? selected.filter((s) => s !== opt) : [...selected, opt]);
  };
  return (
    <FormGroup row sx={{ gap: 0 }}>
      {options.map((opt) => (
        <FormControlLabel
          key={opt}
          control={<Checkbox checked={selected.includes(opt)} onChange={() => toggle(opt)} size="small" />}
          label={<Typography sx={{ fontSize: 13 }}>{opt}</Typography>}
          sx={{ mr: 2, mb: 0 }}
        />
      ))}
    </FormGroup>
  );
}

// Yes/No selector
function YesNoSelector({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, flexWrap: 'wrap' }}>
      <Typography sx={{ fontSize: 13, minWidth: 180, color: '#334155' }}>{label}</Typography>
      <Box sx={{ display: 'flex', gap: 0.5 }}>
        <Chip label="Tak" size="small" onClick={() => onChange('Tak')} variant={value === 'Tak' ? 'filled' : 'outlined'} color={value === 'Tak' ? 'primary' : 'default'} sx={{ fontSize: 12, cursor: 'pointer' }} />
        <Chip label="Nie" size="small" onClick={() => onChange('Nie')} variant={value === 'Nie' ? 'filled' : 'outlined'} color={value === 'Nie' ? 'warning' : 'default'} sx={{ fontSize: 12, cursor: 'pointer' }} />
      </Box>
    </Box>
  );
}

// ── Editable Patient Header ─────────────────────────────────────────────────
function PatientHeader({ patient, patientId, doctorName, consultationDate, onPatientUpdate }: {
  patient: any; patientId: string; doctorName: string; consultationDate: string; onPatientUpdate: (p: any) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editData, setEditData] = useState({
    firstName: '', lastName: '', age: '', phone: '', email: '', gender: '', occupation: '',
  });

  const startEdit = () => {
    setEditData({
      firstName: patient?.firstName || '',
      lastName: patient?.lastName || '',
      age: patient?.age?.toString() || '',
      phone: patient?.phone || '',
      email: patient?.email || '',
      gender: patient?.gender || '',
      occupation: patient?.occupation || '',
    });
    setEditing(true);
  };

  const handleSavePatient = async () => {
    setSaving(true);
    try {
      const payload: any = {
        firstName: editData.firstName,
        lastName: editData.lastName,
      };
      if (editData.age) payload.age = parseInt(editData.age);
      if (editData.phone) payload.phone = editData.phone;
      if (editData.email) payload.email = editData.email;
      if (editData.gender) payload.gender = editData.gender;
      if (editData.occupation) payload.occupation = editData.occupation;

      await api.put(`/patients/${patientId}`, payload);
      onPatientUpdate({ ...patient, ...payload });
      setEditing(false);
    } catch (err) {
      console.error('Error saving patient:', err);
    } finally {
      setSaving(false);
    }
  };

  const patientName = patient ? `${patient.firstName} ${patient.lastName}` : '';
  const patientAge = patient?.age ? `${patient.age} lat` : '';
  const patientGender = patient?.gender === 'MALE' ? 'M' : patient?.gender === 'FEMALE' ? 'K' : '';

  return (
    <Paper elevation={0} sx={{ p: 2.5, mb: 2, borderRadius: 2, border: '1px solid #E2E8F0', bgcolor: '#F8FAFC' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography sx={{ fontSize: 18, fontWeight: 800, color: '#2E5F8A', letterSpacing: '-0.3px' }}>
          KARTA KONSULTACYJNA
        </Typography>
        {!editing ? (
          <Button size="small" startIcon={<EditIcon sx={{ fontSize: 14 }} />} onClick={startEdit}
            sx={{ textTransform: 'none', fontSize: 12, color: '#64748B' }}>
            Edytuj dane pacjenta
          </Button>
        ) : (
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button size="small" variant="outlined" onClick={() => setEditing(false)}
              sx={{ textTransform: 'none', fontSize: 12 }}>Anuluj</Button>
            <Button size="small" variant="contained" onClick={handleSavePatient} disabled={saving}
              startIcon={saving ? <CircularProgress size={12} color="inherit" /> : <Save sx={{ fontSize: 14 }} />}
              sx={{ textTransform: 'none', fontSize: 12, bgcolor: '#16A34A', '&:hover': { bgcolor: '#15803D' } }}>
              Zapisz
            </Button>
          </Box>
        )}
      </Box>

      {editing ? (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
          <TextField size="small" label="Imię" value={editData.firstName} onChange={(e) => setEditData({ ...editData, firstName: e.target.value })} sx={{ flex: '1 1 180px' }} />
          <TextField size="small" label="Nazwisko" value={editData.lastName} onChange={(e) => setEditData({ ...editData, lastName: e.target.value })} sx={{ flex: '1 1 180px' }} />
          <TextField size="small" label="Wiek" type="number" value={editData.age} onChange={(e) => setEditData({ ...editData, age: e.target.value })} sx={{ flex: '0 0 80px' }} />
          <FormControl size="small" sx={{ flex: '0 0 120px' }}>
            <InputLabel>Płeć</InputLabel>
            <Select value={editData.gender} label="Płeć" onChange={(e) => setEditData({ ...editData, gender: e.target.value })}>
              <MenuItem value="MALE">Mężczyzna</MenuItem>
              <MenuItem value="FEMALE">Kobieta</MenuItem>
              <MenuItem value="OTHER">Inna</MenuItem>
            </Select>
          </FormControl>
          <TextField size="small" label="Telefon" value={editData.phone} onChange={(e) => setEditData({ ...editData, phone: e.target.value })} sx={{ flex: '1 1 160px' }} />
          <TextField size="small" label="Email" value={editData.email} onChange={(e) => setEditData({ ...editData, email: e.target.value })} sx={{ flex: '1 1 200px' }} />
          <TextField size="small" label="Zawód" value={editData.occupation} onChange={(e) => setEditData({ ...editData, occupation: e.target.value })} sx={{ flex: '1 1 160px' }} />
        </Box>
      ) : (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
          <Box sx={{ flex: '1 1 200px' }}>
            <Typography sx={{ fontSize: 11, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', mb: 0.3 }}>Pacjent</Typography>
            <Typography sx={{ fontSize: 15, fontWeight: 700, color: '#0F172A' }}>
              {patientName} {patientAge && <Typography component="span" sx={{ fontSize: 13, color: '#64748B', fontWeight: 400 }}>({patientAge}, {patientGender})</Typography>}
            </Typography>
            {patient?.phone && <Typography sx={{ fontSize: 12, color: '#64748B' }}>Tel: {patient.phone}</Typography>}
            {patient?.email && <Typography sx={{ fontSize: 12, color: '#64748B' }}>{patient.email}</Typography>}
          </Box>
          <Box sx={{ flex: '1 1 200px' }}>
            <Typography sx={{ fontSize: 11, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', mb: 0.3 }}>Lekarz</Typography>
            <Typography sx={{ fontSize: 15, fontWeight: 700, color: '#0F172A' }}>{doctorName}</Typography>
          </Box>
          <Box sx={{ flex: '1 1 150px' }}>
            <Typography sx={{ fontSize: 11, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', mb: 0.3 }}>Data konsultacji</Typography>
            <Typography sx={{ fontSize: 15, fontWeight: 700, color: '#0F172A' }}>
              {new Date(consultationDate).toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' })}
            </Typography>
          </Box>
        </Box>
      )}
    </Paper>
  );
}

// ── Visits Section with List + Add Form ──────────────────────────────────────
const VISIT_STATUS_LABELS: Record<string, { label: string; color: 'default' | 'primary' | 'success' | 'warning' | 'error' }> = {
  ZAPLANOWANA: { label: 'Zaplanowana', color: 'primary' },
  ODBYTA: { label: 'Odbyta', color: 'success' },
  NIEOBECNOSC: { label: 'Nieobecność', color: 'warning' },
  ANULOWANA: { label: 'Anulowana', color: 'error' },
};

function VisitsSection({ patientId }: { patientId: string }) {
  const { data: visits = [], isLoading } = usePatientVisits(patientId);
  const createVisit = useCreateVisit();
  const [showAddForm, setShowAddForm] = useState(false);
  const [newVisit, setNewVisit] = useState({
    data: '',
    rodzajZabiegu: '',
    notatki: '',
    status: 'ZAPLANOWANA' as Visit['status'],
    cena: '',
    numerWSerii: '',
    liczbaSerii: '',
  });
  const [addError, setAddError] = useState('');

  const handleAddVisit = async () => {
    if (!newVisit.data || !newVisit.rodzajZabiegu) {
      setAddError('Uzupełnij datę i rodzaj zabiegu');
      return;
    }
    try {
      await createVisit.mutateAsync({
        patientId,
        data: newVisit.data,
        rodzajZabiegu: newVisit.rodzajZabiegu,
        status: newVisit.status,
        notatki: newVisit.notatki || undefined,
        cena: newVisit.cena ? parseFloat(newVisit.cena) : undefined,
        numerWSerii: newVisit.numerWSerii ? parseInt(newVisit.numerWSerii) : undefined,
        liczbaSerii: newVisit.liczbaSerii ? parseInt(newVisit.liczbaSerii) : undefined,
      });
      setShowAddForm(false);
      setNewVisit({ data: '', rodzajZabiegu: '', notatki: '', status: 'ZAPLANOWANA', cena: '', numerWSerii: '', liczbaSerii: '' });
      setAddError('');
    } catch (err: any) {
      setAddError(err.response?.data?.error || 'Błąd dodawania wizyty');
    }
  };

  const now = new Date();
  const defaultDateTime = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}T${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  return (
    <Box>
      {/* Existing visits list */}
      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}><CircularProgress size={24} /></Box>
      ) : visits.length === 0 ? (
        <Typography sx={{ fontSize: 13, color: '#94A3B8', py: 1, textAlign: 'center' }}>
          Brak zaplanowanych wizyt dla tego pacjenta
        </Typography>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 1 }}>
          <Typography sx={{ fontSize: 12, fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>
            Istniejące wizyty ({visits.length})
          </Typography>
          {visits.slice(0, 5).map((visit: any) => {
            const statusInfo = VISIT_STATUS_LABELS[visit.status] || { label: visit.status, color: 'default' as const };
            const visitDate = new Date(visit.data);
            return (
              <Paper key={visit.id} elevation={0} sx={{ p: 1.5, border: '1px solid #E2E8F0', borderRadius: 1.5, display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                <CalendarToday sx={{ fontSize: 16, color: '#94A3B8' }} />
                <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#0F172A', minWidth: 120 }}>
                  {visitDate.toLocaleDateString('pl-PL', { day: 'numeric', month: 'short', year: 'numeric' })}
                  {' '}
                  <Typography component="span" sx={{ fontSize: 12, color: '#64748B' }}>
                    {visitDate.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}
                  </Typography>
                </Typography>
                <Typography sx={{ fontSize: 13, color: '#334155', flex: 1 }}>{visit.rodzajZabiegu}</Typography>
                <Chip label={statusInfo.label} size="small" color={statusInfo.color} variant="outlined" sx={{ fontSize: 11 }} />
                {visit.cena && <Typography sx={{ fontSize: 12, fontWeight: 600, color: '#16A34A' }}>{visit.cena} zł</Typography>}
              </Paper>
            );
          })}
          {visits.length > 5 && (
            <Typography sx={{ fontSize: 12, color: '#94A3B8', textAlign: 'center' }}>
              ...i {visits.length - 5} więcej
            </Typography>
          )}
        </Box>
      )}

      {/* Add visit button / form */}
      {!showAddForm ? (
        <Button
          size="small" variant="outlined" startIcon={<Add />}
          onClick={() => { setShowAddForm(true); setNewVisit({ ...newVisit, data: defaultDateTime }); }}
          sx={{ textTransform: 'none', fontSize: 12, mt: 1 }}
        >
          Dodaj nową wizytę
        </Button>
      ) : (
        <Paper elevation={0} sx={{ p: 2, mt: 1, border: '1px solid #CBD5E1', borderRadius: 2, bgcolor: '#FAFBFC' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
            <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#2E5F8A' }}>Nowa wizyta</Typography>
            <IconButton size="small" onClick={() => setShowAddForm(false)}><Close sx={{ fontSize: 16 }} /></IconButton>
          </Box>
          {addError && <Alert severity="error" sx={{ mb: 1, fontSize: 12 }}>{addError}</Alert>}
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
            <TextField
              size="small" type="datetime-local" label="Data i godzina" value={newVisit.data}
              onChange={(e) => setNewVisit({ ...newVisit, data: e.target.value })}
              InputLabelProps={{ shrink: true }}
              sx={{ flex: '1 1 200px' }} required
            />
            <TextField
              size="small" label="Rodzaj zabiegu" value={newVisit.rodzajZabiegu}
              onChange={(e) => setNewVisit({ ...newVisit, rodzajZabiegu: e.target.value })}
              sx={{ flex: '1 1 250px' }} required
            />
            <FormControl size="small" sx={{ flex: '0 0 150px' }}>
              <InputLabel>Status</InputLabel>
              <Select value={newVisit.status} label="Status" onChange={(e) => setNewVisit({ ...newVisit, status: e.target.value as Visit['status'] })}>
                <MenuItem value="ZAPLANOWANA">Zaplanowana</MenuItem>
                <MenuItem value="ODBYTA">Odbyta</MenuItem>
                <MenuItem value="NIEOBECNOSC">Nieobecność</MenuItem>
                <MenuItem value="ANULOWANA">Anulowana</MenuItem>
              </Select>
            </FormControl>
            <TextField
              size="small" label="Cena (zł)" type="number" value={newVisit.cena}
              onChange={(e) => setNewVisit({ ...newVisit, cena: e.target.value })}
              sx={{ flex: '0 0 100px' }}
            />
            <TextField
              size="small" label="Nr w serii" type="number" value={newVisit.numerWSerii}
              onChange={(e) => setNewVisit({ ...newVisit, numerWSerii: e.target.value })}
              sx={{ flex: '0 0 90px' }}
            />
            <TextField
              size="small" label="Liczba serii" type="number" value={newVisit.liczbaSerii}
              onChange={(e) => setNewVisit({ ...newVisit, liczbaSerii: e.target.value })}
              sx={{ flex: '0 0 90px' }}
            />
            <TextField
              size="small" label="Notatki" value={newVisit.notatki} multiline
              onChange={(e) => setNewVisit({ ...newVisit, notatki: e.target.value })}
              sx={{ flex: '1 1 100%' }}
            />
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 1.5 }}>
            <Button size="small" variant="outlined" onClick={() => setShowAddForm(false)} sx={{ textTransform: 'none', fontSize: 12 }}>Anuluj</Button>
            <Button
              size="small" variant="contained" onClick={handleAddVisit}
              disabled={createVisit.isPending}
              startIcon={createVisit.isPending ? <CircularProgress size={12} color="inherit" /> : <Add />}
              sx={{ textTransform: 'none', fontSize: 12, bgcolor: '#2E5F8A', '&:hover': { bgcolor: '#1E4F7A' } }}
            >
              Dodaj wizytę
            </Button>
          </Box>
        </Paper>
      )}
    </Box>
  );
}

// Normalize a value that may be an already-parsed array, a JSON string, or null/undefined → always returns string[]
function toArray(val: any): string[] {
  if (Array.isArray(val)) return val.map(String);
  if (typeof val === 'string' && val.trim().startsWith('[')) {
    try { const p = JSON.parse(val); return Array.isArray(p) ? p.map(String) : []; } catch { return []; }
  }
  return [];
}

const JSON_ARRAY_FIELDS = [
  'hairLossLocalization', 'scalingType', 'sensitivityProblemType',
  'scalpType', 'scalpAppearance', 'skinLesions', 'seborrheaType',
  'dandruffType', 'hairDamage', 'hairDamageReason', 'hairTypes',
  'vellusMiniaturizedHairs', 'vascularPatterns', 'perifollicularFeatures',
  'scalpDiseases', 'otherDiagnostics', 'alopeciaTypes', 'alopeciaAffectedAreas',
];

function normalizeExistingData(data: any): Partial<FormData> {
  if (!data) return {};
  const out: any = { ...data };
  JSON_ARRAY_FIELDS.forEach((f) => { out[f] = toArray(data[f]); });
  return out;
}

export default function ConsultationCardForm({
  patientId,
  consultationId,
  consultationDate,
  onDateChange,
  onSuccess,
  onError,
  existingData,
}: ConsultationCardFormProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [formData, setFormData] = useState<FormData>({ ...INITIAL_FORM_DATA, ...normalizeExistingData(existingData) });
  const [patient, setPatient] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [loadingPatient, setLoadingPatient] = useState(true);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    problem: true, interview: false, trichoscopy: false,
    diagnostics: false, alopecia: false, diagnosis: true,
    recommendations: true, visits: false, notes: false, scales: false,
  });
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  // Fetch patient data
  useEffect(() => {
    const fetchPatient = async () => {
      try {
        const res = await api.get(`/patients/${patientId}`);
        setPatient(res.data.patient || res.data);
      } catch (err) {
        console.error('Error fetching patient:', err);
      } finally {
        setLoadingPatient(false);
      }
    };
    fetchPatient();
  }, [patientId]);

  const update = useCallback((field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }, []);

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  // Save/update consultation
  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const payload: Record<string, any> = {
        patientId,
        consultationDate,
      };

      // Copy all non-empty fields, serializing arrays
      Object.entries(formData).forEach(([key, value]) => {
        if (value === undefined || value === null || value === '') return;
        if (Array.isArray(value) && value.length === 0) return;

        if (JSON_ARRAY_FIELDS.includes(key) && Array.isArray(value)) {
          payload[key] = JSON.stringify(value);
        } else {
          payload[key] = value;
        }
      });

      if (consultationId) {
        // EDIT mode — PUT
        await api.put(`/consultations/${consultationId}`, payload);
        setToast({ open: true, message: 'Konsultacja zaktualizowana!', severity: 'success' });
      } else {
        // CREATE mode — POST
        await api.post('/consultations', payload);
        setToast({ open: true, message: 'Konsultacja zapisana pomyślnie!', severity: 'success' });
      }
      setTimeout(() => onSuccess(), 1000);
    } catch (err: any) {
      console.error('Error saving consultation:', err);
      const msg = err.response?.data?.error || err.message || 'Błąd zapisywania konsultacji';
      onError(msg);
      setToast({ open: true, message: msg, severity: 'error' });
    } finally {
      setSaving(false);
    }
  }, [formData, patientId, consultationId, consultationDate, onSuccess, onError]);

  if (loadingPatient) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress size={36} sx={{ color: '#2E5F8A' }} />
      </Box>
    );
  }

  const doctorName = user?.name || '';

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto', pb: 4 }}>
      {/* ── Sticky toolbar ── */}
      <Paper
        elevation={2}
        sx={{
          position: 'sticky', top: 0, zIndex: 10,
          display: 'flex', alignItems: 'center', gap: 1,
          px: 2, py: 1.5, mb: 3, borderRadius: 2,
          bgcolor: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(10px)',
          flexWrap: 'wrap',
        }}
      >
        <Typography sx={{ fontSize: 15, fontWeight: 700, color: '#2E5F8A', mr: 1 }}>
          📋 Karta konsultacyjna
        </Typography>
        <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography sx={{ fontSize: 12, color: '#64748B' }}>Data:</Typography>
          <input
            type="date"
            value={consultationDate}
            onChange={(e) => onDateChange(e.target.value)}
            style={{
              border: '1px solid #CBD5E1', borderRadius: 6,
              padding: '5px 10px', fontSize: 13, color: '#0F172A',
              background: '#F8FAFC',
            }}
          />
        </Box>
        <Box sx={{ flex: 1 }} />
        <Button
          variant="outlined" size="small" startIcon={<ArrowBack />}
          onClick={() => navigate(-1)}
          sx={{ textTransform: 'none', fontSize: 12, color: '#64748B', borderColor: '#E2E8F0' }}
        >
          Wróć
        </Button>
        <Button
          variant="contained" size="small" startIcon={saving ? <CircularProgress size={14} color="inherit" /> : <Save />}
          onClick={handleSave} disabled={saving}
          sx={{ textTransform: 'none', fontSize: 12, fontWeight: 700, bgcolor: '#2E5F8A', '&:hover': { bgcolor: '#1E4F7A' } }}
        >
          {saving ? 'Zapisuję...' : 'Zapisz konsultację'}
        </Button>
      </Paper>

      {/* ── Header — Patient + Doctor info (auto-filled, editable) ── */}
      <PatientHeader
        patient={patient}
        patientId={patientId}
        doctorName={doctorName}
        consultationDate={consultationDate}
        onPatientUpdate={(updated) => setPatient(updated)}
      />

      {/* ── SEKCJA 1: Problem ── */}
      <Accordion expanded={expandedSections.problem} onChange={() => toggleSection('problem')} elevation={0} sx={{ mb: 1, border: '1px solid #E2E8F0', borderRadius: '8px !important', '&:before': { display: 'none' } }}>
        <AccordionSummary expandIcon={<ExpandMore />} sx={{ bgcolor: '#FAFBFC' }}>
          <SectionHeader icon={<MedicalServices sx={{ fontSize: 20 }} />} title="1. Problem — Wypadanie / Przetłuszczanie / Łuszczenie / Wrażliwość" />
        </AccordionSummary>
        <AccordionDetails sx={{ pt: 0 }}>
          {/* Wypadanie */}
          <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#475569', mb: 1, mt: 1 }}>Wypadanie włosów</Typography>
          <Box sx={{ pl: 1, mb: 2 }}>
            <Typography sx={{ fontSize: 12, color: '#64748B', mb: 0.5 }}>Nasilenie:</Typography>
            <SeveritySelector value={formData.hairLossSeverity} onChange={(v) => update('hairLossSeverity', v)} />
            <TextField fullWidth size="small" label="Czas trwania" value={formData.hairLossDuration} onChange={(e) => update('hairLossDuration', e.target.value)} sx={{ mt: 1.5 }} />
            <Typography sx={{ fontSize: 12, color: '#64748B', mt: 1.5, mb: 0.5 }}>Lokalizacja:</Typography>
            <CheckboxGroup
              options={['ciemieniowa', 'skronie', 'czołowa', 'tonsura', 'potylica', 'uogólnione', 'brwi, rzęsy', 'pachy', 'pachwiny']}
              selected={formData.hairLossLocalization}
              onChange={(v) => update('hairLossLocalization', v)}
            />
            <TextField fullWidth size="small" label="Używane szampony" value={formData.hairLossShampoos} onChange={(e) => update('hairLossShampoos', e.target.value)} sx={{ mt: 1 }} />
            <TextField fullWidth size="small" label="Uwagi" multiline minRows={2} value={formData.hairLossNotes} onChange={(e) => update('hairLossNotes', e.target.value)} sx={{ mt: 1 }} />
          </Box>
          <Divider sx={{ my: 1.5 }} />

          {/* Przetłuszczanie */}
          <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#475569', mb: 1 }}>Przetłuszczanie włosów</Typography>
          <Box sx={{ pl: 1, mb: 2 }}>
            <SeveritySelector value={formData.oilyHairSeverity} onChange={(v) => update('oilyHairSeverity', v)} />
            <TextField fullWidth size="small" label="Częstotliwość mycia" value={formData.oilyHairWashingFreq} onChange={(e) => update('oilyHairWashingFreq', e.target.value)} sx={{ mt: 1.5 }} />
            <TextField fullWidth size="small" label="Czas trwania" value={formData.oilyHairDuration} onChange={(e) => update('oilyHairDuration', e.target.value)} sx={{ mt: 1 }} />
            <TextField fullWidth size="small" label="Używane szampony" value={formData.oilyHairShampoos} onChange={(e) => update('oilyHairShampoos', e.target.value)} sx={{ mt: 1 }} />
            <TextField fullWidth size="small" label="Uwagi" multiline minRows={2} value={formData.oilyHairNotes} onChange={(e) => update('oilyHairNotes', e.target.value)} sx={{ mt: 1 }} />
          </Box>
          <Divider sx={{ my: 1.5 }} />

          {/* Łuszczenie */}
          <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#475569', mb: 1 }}>Łuszczenie skóry głowy</Typography>
          <Box sx={{ pl: 1, mb: 2 }}>
            <SeveritySelector value={formData.scalingSeverity} onChange={(v) => update('scalingSeverity', v)} />
            <TextField fullWidth size="small" label="Czas trwania" value={formData.scalingDuration} onChange={(e) => update('scalingDuration', e.target.value)} sx={{ mt: 1.5 }} />
            <Typography sx={{ fontSize: 12, color: '#64748B', mt: 1, mb: 0.5 }}>Typ łuszczenia:</Typography>
            <CheckboxGroup options={['Drobne, białe', 'Duże, żółte', 'Tłuste', 'Suche', 'Zapalne', 'Inne']} selected={formData.scalingType} onChange={(v) => update('scalingType', v)} />
            <TextField fullWidth size="small" label="Inne (opis)" value={formData.scalingOther} onChange={(e) => update('scalingOther', e.target.value)} sx={{ mt: 1 }} />
          </Box>
          <Divider sx={{ my: 1.5 }} />

          {/* Wrażliwość */}
          <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#475569', mb: 1 }}>Wrażliwość skóry głowy</Typography>
          <Box sx={{ pl: 1, mb: 2 }}>
            <SeveritySelector value={formData.sensitivitySeverity} onChange={(v) => update('sensitivitySeverity', v)} />
            <TextField fullWidth size="small" label="Czas trwania" value={formData.sensitivityDuration} onChange={(e) => update('sensitivityDuration', e.target.value)} sx={{ mt: 1.5 }} />
            <Typography sx={{ fontSize: 12, color: '#64748B', mt: 1, mb: 0.5 }}>Typ problemu:</Typography>
            <CheckboxGroup options={['Pieczenie', 'Świąd', 'Ból', 'Ściskanie', 'Inne']} selected={formData.sensitivityProblemType} onChange={(v) => update('sensitivityProblemType', v)} />
            <TextField fullWidth size="small" label="Inne (opis)" value={formData.sensitivityOther} onChange={(e) => update('sensitivityOther', e.target.value)} sx={{ mt: 1 }} />
          </Box>
          <Divider sx={{ my: 1.5 }} />

          {/* Stany zapalne */}
          <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#475569', mb: 1 }}>Stany zapalne / grudki</Typography>
          <TextField fullWidth size="small" label="Opis stanów zapalnych" multiline minRows={2} value={formData.inflammatoryStates} onChange={(e) => update('inflammatoryStates', e.target.value)} sx={{ pl: 1 }} />
        </AccordionDetails>
      </Accordion>

      {/* ── SEKCJA 2: Wywiad ── */}
      <Accordion expanded={expandedSections.interview} onChange={() => toggleSection('interview')} elevation={0} sx={{ mb: 1, border: '1px solid #E2E8F0', borderRadius: '8px !important', '&:before': { display: 'none' } }}>
        <AccordionSummary expandIcon={<ExpandMore />} sx={{ bgcolor: '#FAFBFC' }}>
          <SectionHeader icon={<Person sx={{ fontSize: 20 }} />} title="2. Wywiad" />
        </AccordionSummary>
        <AccordionDetails sx={{ pt: 0 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            <YesNoSelector label="Wypadanie włosów w rodzinie?" value={formData.familyHistory} onChange={(v) => update('familyHistory', v)} />
            <YesNoSelector label="Wizyty u dermatologa?" value={formData.dermatologyVisits} onChange={(v) => update('dermatologyVisits', v)} />
            {formData.dermatologyVisits === 'Tak' && <TextField fullWidth size="small" label="Powód wizyty" value={formData.dermatologyVisitsReason} onChange={(e) => update('dermatologyVisitsReason', e.target.value)} sx={{ ml: 2, mb: 1, maxWidth: 500 }} />}
            <YesNoSelector label="Ciąża / karmienie piersią?" value={formData.pregnancy} onChange={(v) => update('pregnancy', v)} />
            <YesNoSelector label="Regularna menstruacja?" value={formData.menstruationRegularity} onChange={(v) => update('menstruationRegularity', v)} />
            <YesNoSelector label="Antykoncepcja?" value={formData.contraception} onChange={(v) => update('contraception', v)} />
            <YesNoSelector label="Leki stałe?" value={formData.medications} onChange={(v) => update('medications', v)} />
            {formData.medications === 'Tak' && <TextField fullWidth size="small" label="Lista leków" value={formData.medicationsList} onChange={(e) => update('medicationsList', e.target.value)} sx={{ ml: 2, mb: 1, maxWidth: 500 }} />}
            <YesNoSelector label="Suplementy diety?" value={formData.supplements} onChange={(v) => update('supplements', v)} />
            {formData.supplements === 'Tak' && <TextField fullWidth size="small" label="Jakie suplementy?" value={formData.supplementsDetails} onChange={(e) => update('supplementsDetails', e.target.value)} sx={{ ml: 2, mb: 1, maxWidth: 500 }} />}
            <YesNoSelector label="Wysoki poziom stresu?" value={formData.stressLevel} onChange={(v) => update('stressLevel', v)} />
            <YesNoSelector label="Znieczulenie ogólne (ostatni rok)?" value={formData.anesthesia} onChange={(v) => update('anesthesia', v)} />
            <YesNoSelector label="Chemioterapia?" value={formData.chemotherapy} onChange={(v) => update('chemotherapy', v)} />
            <YesNoSelector label="Radioterapia?" value={formData.radiotherapy} onChange={(v) => update('radiotherapy', v)} />
            <YesNoSelector label="Szczepienia (ostatnie 6 mies.)?" value={formData.vaccination} onChange={(v) => update('vaccination', v)} />
            <YesNoSelector label="Antybiotyki (ostatnie 6 mies.)?" value={formData.antibiotics} onChange={(v) => update('antibiotics', v)} />
            {formData.antibiotics === 'Tak' && <TextField fullWidth size="small" label="Jakie antybiotyki?" value={formData.antibioticsDetails} onChange={(e) => update('antibioticsDetails', e.target.value)} sx={{ ml: 2, mb: 1, maxWidth: 500 }} />}
            <YesNoSelector label="Choroby przewlekłe?" value={formData.chronicDiseases} onChange={(v) => update('chronicDiseases', v)} />
            {formData.chronicDiseases === 'Tak' && <TextField fullWidth size="small" label="Jakie choroby?" value={formData.chronicDiseasesList} onChange={(e) => update('chronicDiseasesList', e.target.value)} sx={{ ml: 2, mb: 1, maxWidth: 500 }} />}
            <YesNoSelector label="Pod opieką specjalistów?" value={formData.specialists} onChange={(v) => update('specialists', v)} />
            {formData.specialists === 'Tak' && <TextField fullWidth size="small" label="Jacy specjaliści?" value={formData.specialistsList} onChange={(e) => update('specialistsList', e.target.value)} sx={{ ml: 2, mb: 1, maxWidth: 500 }} />}
            <YesNoSelector label="Zaburzenia odżywiania?" value={formData.eatingDisorders} onChange={(v) => update('eatingDisorders', v)} />
            <YesNoSelector label="Nietolerancje pokarmowe?" value={formData.foodIntolerances} onChange={(v) => update('foodIntolerances', v)} />
            <TextField fullWidth size="small" label="Dieta" value={formData.diet} onChange={(e) => update('diet', e.target.value)} sx={{ mt: 1 }} />
            <TextField fullWidth size="small" label="Alergie" value={formData.allergies} onChange={(e) => update('allergies', e.target.value)} sx={{ mt: 1 }} />
            <YesNoSelector label="Części metalowe w organizmie?" value={formData.metalPartsInBody} onChange={(v) => update('metalPartsInBody', v)} />
            <Divider sx={{ my: 1.5 }} />
            <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#475569', mb: 1 }}>Pielęgnacja</Typography>
            <TextField fullWidth size="small" label="Szampon" value={formData.careRoutineShampoo} onChange={(e) => update('careRoutineShampoo', e.target.value)} sx={{ mb: 1 }} />
            <TextField fullWidth size="small" label="Odżywka" value={formData.careRoutineConditioner} onChange={(e) => update('careRoutineConditioner', e.target.value)} sx={{ mb: 1 }} />
            <TextField fullWidth size="small" label="Olejki / wcierki" value={formData.careRoutineOils} onChange={(e) => update('careRoutineOils', e.target.value)} sx={{ mb: 1 }} />
            <TextField fullWidth size="small" label="Zabiegi chemiczne" value={formData.careRoutineChemical} onChange={(e) => update('careRoutineChemical', e.target.value)} />
          </Box>
        </AccordionDetails>
      </Accordion>

      {/* ── SEKCJA 3: Trichoskopia ── */}
      <Accordion expanded={expandedSections.trichoscopy} onChange={() => toggleSection('trichoscopy')} elevation={0} sx={{ mb: 1, border: '1px solid #E2E8F0', borderRadius: '8px !important', '&:before': { display: 'none' } }}>
        <AccordionSummary expandIcon={<ExpandMore />} sx={{ bgcolor: '#FAFBFC' }}>
          <SectionHeader icon={<MedicalServices sx={{ fontSize: 20 }} />} title="3. Trichoskopia" />
        </AccordionSummary>
        <AccordionDetails sx={{ pt: 0 }}>
          <Typography sx={{ fontSize: 12, color: '#64748B', mb: 0.5 }}>Typ skóry:</Typography>
          <CheckboxGroup options={['Sucha', 'Normalna', 'Tłusta', 'Mieszana']} selected={formData.scalpType} onChange={(v) => update('scalpType', v)} />
          <Typography sx={{ fontSize: 12, color: '#64748B', mt: 1.5, mb: 0.5 }}>Wygląd skóry:</Typography>
          <CheckboxGroup options={['Zaczerwienienie', 'Złuszczanie', 'Grudki', 'Krosty', 'Blizny', 'Przebarwienia']} selected={formData.scalpAppearance} onChange={(v) => update('scalpAppearance', v)} />
          <Typography sx={{ fontSize: 12, color: '#64748B', mt: 1.5, mb: 0.5 }}>Wykwity:</Typography>
          <CheckboxGroup options={['Grudki', 'Krosty', 'Strupy', 'Nadżerki', 'Owrzodzenia']} selected={formData.skinLesions} onChange={(v) => update('skinLesions', v)} />
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mt: 1.5 }}>
            <TextField size="small" label="Nadmierne pocenie" value={formData.hyperhidrosis} onChange={(e) => update('hyperhidrosis', e.target.value)} sx={{ flex: '1 1 200px' }} />
            <TextField size="small" label="Rogowacenie" value={formData.hyperkeratinization} onChange={(e) => update('hyperkeratinization', e.target.value)} sx={{ flex: '1 1 200px' }} />
            <TextField size="small" label="Wydzielina łojowa" value={formData.sebaceousSecretion} onChange={(e) => update('sebaceousSecretion', e.target.value)} sx={{ flex: '1 1 200px' }} />
          </Box>
          
          <Typography sx={{ fontSize: 12, color: '#64748B', mt: 1.5, mb: 0.5 }}>Interpretacja rodzaju łojotoku:</Typography>
          <CheckboxGroup options={['Łojotok płynny', 'Łojotok gęsty', 'Łojotok (mieszanina na czole gęsty na głowie płynny)', 'Inne']} selected={formData.seborrheaType} onChange={(v) => update('seborrheaType', v)} />
          {formData.seborrheaType?.includes('Inne') && (
            <TextField fullWidth size="small" label="Inny rodzaj łojotoku" value={formData.seborrheaTypeOther} onChange={(e) => update('seborrheaTypeOther', e.target.value)} sx={{ mt: 1 }} />
          )}

          <Typography sx={{ fontSize: 12, color: '#64748B', mt: 1.5, mb: 0.5 }}>Łupież:</Typography>
          <CheckboxGroup options={['Suchy', 'Tłusty', 'Kosmetyczny', 'Miejscowy', 'Uogólniony']} selected={formData.dandruffType} onChange={(v) => update('dandruffType', v)} />

          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mt: 1.5 }}>
            <TextField size="small" label="pH skóry" value={formData.scalpPH} onChange={(e) => update('scalpPH', e.target.value)} sx={{ flex: '1 1 120px' }} />
            <TextField size="small" label="Jakość włosów" value={formData.hairQuality} onChange={(e) => update('hairQuality', e.target.value)} sx={{ flex: '1 1 200px' }} />
            <TextField size="small" label="Kształt włosów" value={formData.hairShape} onChange={(e) => update('hairShape', e.target.value)} sx={{ flex: '1 1 200px' }} />
          </Box>
          <Typography sx={{ fontSize: 12, color: '#64748B', mt: 1.5, mb: 0.5 }}>Typy włosów:</Typography>
          <CheckboxGroup options={['Cienkie', 'Normalne', 'Grube', 'Kręcone', 'Proste', 'Faliste']} selected={formData.hairTypes} onChange={(v) => update('hairTypes', v)} />
          <TextField fullWidth size="small" label="Włosy odrastające" value={formData.regrowingHairs} onChange={(e) => update('regrowingHairs', e.target.value)} sx={{ mt: 1.5 }} />
          <Typography sx={{ fontSize: 12, color: '#64748B', mt: 1.5, mb: 0.5 }}>Włosy vellusowe / zminiaturyzowane:</Typography>
          <CheckboxGroup options={['Liczne', 'Nieliczne', 'Brak', 'Zminiaturyzowane', 'Łuszczenie wokół mieszków']} selected={formData.vellusMiniaturizedHairs} onChange={(v) => update('vellusMiniaturizedHairs', v)} />
          
          <Typography sx={{ fontSize: 12, color: '#64748B', mt: 1.5, mb: 0.5 }}>Unaczynienie:</Typography>
          <CheckboxGroup options={['Naczynia kropkowate', 'Naczynia liniowe', 'Naczynia arborystyczne', 'Naczynia siatkowate', 'Brak naczyń', 'Prawidłowe']} selected={formData.vascularPatterns} onChange={(v) => update('vascularPatterns', v)} />

          <Typography sx={{ fontSize: 12, color: '#64748B', mt: 1.5, mb: 0.5 }}>Cechy okołomieszkowe:</Typography>
          <CheckboxGroup options={['White dots', 'Yellow dots', 'Black dots', 'Prawidłowe']} selected={formData.perifollicularFeatures} onChange={(v) => update('perifollicularFeatures', v)} />

          <Typography sx={{ fontSize: 12, color: '#64748B', mt: 1.5, mb: 0.5 }}>Choroby skóry głowy:</Typography>
          <CheckboxGroup options={['ŁZS', 'LLP', 'AZS', 'Grzybica', 'Łuszczyca', 'Zapalenia okołomieszkowe']} selected={formData.scalpDiseases} onChange={(v) => update('scalpDiseases', v)} />

          <Typography sx={{ fontSize: 12, color: '#64748B', mt: 1.5, mb: 0.5 }}>Inne cechy diagnostyczne:</Typography>
          <CheckboxGroup options={['Trychodynia', 'Plaster miodu', 'Cofnięcie linii czołowej', 'Trichokinesis']} selected={formData.otherDiagnostics} onChange={(v) => update('otherDiagnostics', v)} />
        </AccordionDetails>
      </Accordion>

      {/* ── SEKCJA 4: Diagnostyka łysienia ── */}
      <Accordion expanded={expandedSections.alopecia} onChange={() => toggleSection('alopecia')} elevation={0} sx={{ mb: 1, border: '1px solid #E2E8F0', borderRadius: '8px !important', '&:before': { display: 'none' } }}>
        <AccordionSummary expandIcon={<ExpandMore />} sx={{ bgcolor: '#FAFBFC' }}>
          <SectionHeader icon={<MedicalServices sx={{ fontSize: 20 }} />} title="4. Diagnostyka łysienia" />
        </AccordionSummary>
        <AccordionDetails sx={{ pt: 0 }}>
          <Typography sx={{ fontSize: 12, color: '#64748B', mb: 0.5 }}>Typy łysienia:</Typography>
          <CheckboxGroup options={['Androgenowe', 'Plackowate', 'Bliznowaciejące', 'Telogenowe', 'Anagenowe', 'Trakcyjne', 'Inne']} selected={formData.alopeciaTypes} onChange={(v) => update('alopeciaTypes', v)} />
          
          <FormControl fullWidth size="small" sx={{ mt: 1.5 }}>
            <InputLabel>Klasyfikacja łysienia</InputLabel>
            <Select value={formData.alopeciaType} label="Klasyfikacja łysienia" onChange={(e) => update('alopeciaType', e.target.value)}>
              <MenuItem value="">Brak</MenuItem>
              <MenuItem value="Androgenowe typu męskiego">Androgenowe typu męskiego</MenuItem>
              <MenuItem value="Androgenowe typu żeńskiego">Androgenowe typu żeńskiego</MenuItem>
              <MenuItem value="Plackowate AA">Plackowate AA</MenuItem>
              <MenuItem value="Telogenowe TE">Telogenowe TE</MenuItem>
            </Select>
          </FormControl>

          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mt: 1.5 }}>
            <TextField size="small" label="Stopień przerzedzenia" value={formData.degreeOfThinning} onChange={(e) => update('degreeOfThinning', e.target.value)} sx={{ flex: '1 1 200px' }} />
            <TextField size="small" label="Miniaturyzacja" value={formData.miniaturization} onChange={(e) => update('miniaturization', e.target.value)} sx={{ flex: '1 1 200px' }} />
            <TextField size="small" label="Jednostki folikularne" value={formData.follicularUnits} onChange={(e) => update('follicularUnits', e.target.value)} sx={{ flex: '1 1 200px' }} />
          </Box>
          <TextField fullWidth size="small" label="Pull test" value={formData.pullTest} onChange={(e) => update('pullTest', e.target.value)} sx={{ mt: 1.5 }} />
          <Typography sx={{ fontSize: 12, color: '#64748B', mt: 1.5, mb: 0.5 }}>Dotknięte obszary:</Typography>
          <CheckboxGroup options={['Czołowa', 'Ciemieniowa', 'Skroniowa', 'Potyliczna', 'Uogólniona', 'Ogniskowa']} selected={formData.alopeciaAffectedAreas} onChange={(v) => update('alopeciaAffectedAreas', v)} />
          <TextField fullWidth size="small" label="Inne (opis)" value={formData.alopeciaOther} onChange={(e) => update('alopeciaOther', e.target.value)} sx={{ mt: 1.5 }} />
        </AccordionDetails>
      </Accordion>

      {/* ── SEKCJA 5: Rozpoznanie ── */}
      <Accordion expanded={expandedSections.diagnosis} onChange={() => toggleSection('diagnosis')} elevation={0} sx={{ mb: 1, border: '1px solid #E2E8F0', borderRadius: '8px !important', '&:before': { display: 'none' } }}>
        <AccordionSummary expandIcon={<ExpandMore />} sx={{ bgcolor: '#FAFBFC' }}>
          <SectionHeader icon={<CheckCircle sx={{ fontSize: 20 }} />} title="5. Rozpoznanie" color="#16A34A" />
        </AccordionSummary>
        <AccordionDetails>
          <TextField
            fullWidth multiline minRows={4}
            label="Rozpoznanie / Diagnoza"
            placeholder="Wpisz rozpoznanie..."
            value={formData.diagnosis}
            onChange={(e) => update('diagnosis', e.target.value)}
          />
        </AccordionDetails>
      </Accordion>

      {/* ── SEKCJA 6: Zalecenia ── */}
      <Accordion expanded={expandedSections.recommendations} onChange={() => toggleSection('recommendations')} elevation={0} sx={{ mb: 1, border: '1px solid #E2E8F0', borderRadius: '8px !important', '&:before': { display: 'none' } }}>
        <AccordionSummary expandIcon={<ExpandMore />} sx={{ bgcolor: '#FAFBFC' }}>
          <SectionHeader icon={<MedicalServices sx={{ fontSize: 20 }} />} title="6. Zalecenia do pielęgnacji" color="#D97706" />
        </AccordionSummary>
        <AccordionDetails>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <TextField fullWidth multiline minRows={2} label="Mycie (szampon, częstotliwość)" value={formData.careRecommendationsWashing} onChange={(e) => update('careRecommendationsWashing', e.target.value)} />
            <TextField fullWidth multiline minRows={2} label="Wcieranie / stosowanie miejscowe" value={formData.careRecommendationsTopical} onChange={(e) => update('careRecommendationsTopical', e.target.value)} />
            <TextField fullWidth multiline minRows={2} label="Suplementacja" value={formData.careRecommendationsSupplement} onChange={(e) => update('careRecommendationsSupplement', e.target.value)} />
            <TextField fullWidth multiline minRows={2} label="Zmiany behawioralne / dieta" value={formData.careRecommendationsBehavior} onChange={(e) => update('careRecommendationsBehavior', e.target.value)} />
          </Box>
        </AccordionDetails>
      </Accordion>

      {/* ── SEKCJA 7: Wizyty / Zabiegi ── */}
      <Accordion expanded={expandedSections.visits} onChange={() => toggleSection('visits')} elevation={0} sx={{ mb: 1, border: '1px solid #E2E8F0', borderRadius: '8px !important', '&:before': { display: 'none' } }}>
        <AccordionSummary expandIcon={<ExpandMore />} sx={{ bgcolor: '#FAFBFC' }}>
          <SectionHeader icon={<EventAvailable sx={{ fontSize: 20 }} />} title="7. Wizyty / Zabiegi" />
        </AccordionSummary>
        <AccordionDetails>
          <VisitsSection patientId={patientId} />
          <Divider sx={{ my: 2 }} />
          <TextField fullWidth multiline minRows={2} label="Dodatkowe notatki o wizytach/zabiegach" value={formData.visitsProcedures} onChange={(e) => update('visitsProcedures', e.target.value)} />
        </AccordionDetails>
      </Accordion>

      {/* ── SEKCJA 8: Uwagi ── */}
      <Accordion expanded={expandedSections.notes} onChange={() => toggleSection('notes')} elevation={0} sx={{ mb: 1, border: '1px solid #E2E8F0', borderRadius: '8px !important', '&:before': { display: 'none' } }}>
        <AccordionSummary expandIcon={<ExpandMore />} sx={{ bgcolor: '#FAFBFC' }}>
          <SectionHeader icon={<EditIcon sx={{ fontSize: 20 }} />} title="8. Uwagi ogólne" />
        </AccordionSummary>
        <AccordionDetails>
          <TextField fullWidth multiline minRows={3} label="Dodatkowe uwagi" value={formData.generalRemarks} onChange={(e) => update('generalRemarks', e.target.value)} />
        </AccordionDetails>
      </Accordion>

      {/* ── SEKCJA 9: Skale ── */}
      <Accordion expanded={expandedSections.scales} onChange={() => toggleSection('scales')} elevation={0} sx={{ mb: 1, border: '1px solid #E2E8F0', borderRadius: '8px !important', '&:before': { display: 'none' } }}>
        <AccordionSummary expandIcon={<ExpandMore />} sx={{ bgcolor: '#FAFBFC' }}>
          <SectionHeader icon={<MedicalServices sx={{ fontSize: 20 }} />} title="9. Skale (Norwood-Hamilton / Ludwig)" />
        </AccordionSummary>
        <AccordionDetails>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <TextField size="small" label="Stopień Norwood-Hamilton" value={formData.norwoodHamiltonStage} onChange={(e) => update('norwoodHamiltonStage', e.target.value)} sx={{ flex: '1 1 250px' }} />
            <TextField size="small" label="Stopień Ludwig" value={formData.ludwigStage} onChange={(e) => update('ludwigStage', e.target.value)} sx={{ flex: '1 1 250px' }} />
          </Box>
        </AccordionDetails>
      </Accordion>

      {/* ── Bottom save button ── */}
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3, gap: 2 }}>
        <Button
          variant="outlined" size="large"
          startIcon={<ArrowBack />}
          onClick={() => navigate(-1)}
          sx={{ textTransform: 'none', fontWeight: 600, px: 4, color: '#64748B', borderColor: '#CBD5E1' }}
        >
          Wróć
        </Button>
        <Button
          variant="contained" size="large"
          startIcon={saving ? <CircularProgress size={18} color="inherit" /> : <Save />}
          onClick={handleSave}
          disabled={saving}
          sx={{ textTransform: 'none', fontWeight: 700, px: 4, bgcolor: '#2E5F8A', '&:hover': { bgcolor: '#1E4F7A' } }}
        >
          {saving ? 'Zapisuję...' : 'Zapisz konsultację'}
        </Button>
      </Box>

      <Snackbar open={toast.open} autoHideDuration={3000} onClose={() => setToast({ ...toast, open: false })} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={toast.severity} onClose={() => setToast({ ...toast, open: false })}>{toast.message}</Alert>
      </Snackbar>
    </Box>
  );
}
