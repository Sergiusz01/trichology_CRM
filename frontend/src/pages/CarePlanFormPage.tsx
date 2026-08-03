import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Paper, TextField, Button, Typography, Grid, Alert,
  CircularProgress, IconButton, useMediaQuery, useTheme,
  Accordion, AccordionSummary, AccordionDetails,
  Chip, Tooltip, MenuItem, Select, FormControl,
  InputLabel, Divider, Stack,
} from '@mui/material';
import {
  Add, Delete, ExpandMore, LocalHospital, Shower,
  Science, Spa, AutoAwesome, ContentCopy, CheckCircle,
} from '@mui/icons-material';
import { api } from '../services/api';

// ── Trichology templates ───────────────────────────────────────────────────────
const TEMPLATES: Record<string, { title: string; totalDurationWeeks: number; notes: string; weeks: WeekData[] }> = {
  aga: {
    title: 'Program leczenia łysienia androgenowego (AGA)',
    totalDurationWeeks: 12,
    notes: 'Program 12-tygodniowy dla pacjenta z łysieniem androgenowym. Celem jest zahamowanie wypadania i stymulacja wzrostu. Efekty oceniamy po 12 tygodniach. Wymagana systematyczność w stosowaniu preparatów.',
    weeks: [
      { weekNumber: 1, description: 'Tydzień diagnostyczny i przygotowawczy. Wykonanie trichoskopii bazowej, ocena stanu skóry głowy.', washingRoutine: 'Szampon ketokonazolowy 1% co 2 dni. Masaż skóry głowy 5 min podczas mycia. Woda letnia — nie gorąca.', topicalProducts: 'Minoksydyl 5% — 1 ml rano i wieczorem na suchą skórę głowy. Odczekać 4 h przed myciem.', supplements: 'Biotyna 2500 mcg / dzień, Cynk 15 mg / dzień, Żelazo (jeśli niedobór), L-cysteina 500 mg', inClinicProcedures: 'Mesoterapia igłowa z koktajlem witaminowym (biotin, pantenol, VEGF)', remarks: 'Nie stosować minoksydylu na mokrą skórę. Unikać wysokich temperatur (suszarka).' },
      { weekNumber: 2, description: 'Kontynuacja protokołu. Ocena tolerancji minoksydylu — możliwe nasilenie wypadania (telogen effluvium) — to normalne.', washingRoutine: 'Szampon ketokonazolowy + nawilżający krem do skóry głowy. Mycie co 2 dni.', topicalProducts: 'Minoksydyl 5% 2x dziennie. Serum z kofeiną — rano po minoksydylu (po wchłonięciu).', supplements: 'Witamina D3 2000 IU, Omega-3 1000 mg, Biotyna 2500 mcg — kontynuacja.', inClinicProcedures: 'Lampa LED — terapia PBM (photobiomodulation) 20 min', remarks: 'Poinformuj pacjenta o możliwym tymczasowym nasileniu wypadania.' },
      { weekNumber: 3, description: 'Intensyfikacja terapii miejscowej.', washingRoutine: 'Kontynuacja. Dodanie peelingu skóry głowy (scrub enzymatyczny) 1x / tydz.', topicalProducts: 'Minoksydyl 5% + Saw Palmetto serum wieczorem.', supplements: 'Kontynuacja. Dodanie Selenio 55 mcg / dzień.', inClinicProcedures: 'Mezoterapia igłowa — 2. sesja', remarks: 'Kontrola tolerancji. Pierwsze efekty widoczne po 8–12 tyg.' },
      { weekNumber: 4, description: 'Wizyta kontrolna — ocena wypadania.', washingRoutine: 'Bez zmian.', topicalProducts: 'Bez zmian.', supplements: 'Bez zmian.', inClinicProcedures: 'Trichoskopia kontrolna — porównanie z bazową. Ocena odpowiedzi na leczenie.', remarks: 'Zdjęcia dokumentacyjne.' },
    ],
  },
  aa: {
    title: 'Program leczenia łysienia plackowatego (AA)',
    totalDurationWeeks: 8,
    notes: 'Program dla pacjenta z łysieniem plackowatym. Terapia skupia się na modulacji immunologicznej i stymulacji mieszków włosowych. Wymaga systematyczności i kontroli co 4 tygodnie.',
    weeks: [
      { weekNumber: 1, description: 'Diagnoza i plan leczenia. Ocena rozległości zmian, wywiad alergiczny, badania krwi (OB, ANA, TSH, żelazo).', washingRoutine: 'Delikatny szampon bez siarczanów, pH 5.5. Mycie 3x / tydz. Bez intensywnego tarcia skóry głowy.', topicalProducts: 'Klobetazol 0.05% krem / żel — aplikacja na ogniska 2x dziennie. Dermatolog musi przepisać receptę.', supplements: 'Cynk 30 mg / dzień, Witamina D3 4000 IU, Kwas foliowy 400 mcg', inClinicProcedures: 'Dermoroller 0.5 mm na ogniskach + aplikacja minoksydylu 5% bezpośrednio po zabiegu', remarks: 'Unikanie stresu i niedoborów — kluczowe czynniki wyzwalające.' },
      { weekNumber: 2, description: 'Kontynuacja terapii immunomodulującej.', washingRoutine: 'Bez zmian. Możliwe dodanie szamponu z biotyną.', topicalProducts: 'Kontynuacja kortykosteroidu miejscowego. Minoksydyl 5% na zdrową skórę głowy — prewencja.', supplements: 'Kontynuacja. Dodanie Omega-3 2000 mg / dzień.', inClinicProcedures: 'Seria iniekcji kortykosteroidów śródskórnie (triamcynolon 10 mg/ml) — tylko lekarz', remarks: 'Monitorowanie efektów ubocznych kortykosteroidu.' },
      { weekNumber: 3, description: 'Ocena wczesnej odpowiedzi.', washingRoutine: 'Bez zmian.', topicalProducts: 'Kontynuacja.', supplements: 'Kontynuacja.', inClinicProcedures: 'Trichoskopia kontrolna. Ocena wzrostu włosów puszystych (vellus).', remarks: 'Pierwsze delikatne włosy puszuste powinny pojawić się ok. 4–6 tyg.' },
      { weekNumber: 4, description: 'Kontrola i modyfikacja protokołu.', washingRoutine: 'Bez zmian.', topicalProducts: 'Ewentualna modyfikacja terapii miejscowej w zależności od odpowiedzi.', supplements: 'Bez zmian.', inClinicProcedures: 'Konsultacja dermatologiczna — ocena potrzeby terapii ogólnoustrojowej.', remarks: 'Wizyta kontrolna u lekarza prowadzącego.' },
    ],
  },
  dandruff: {
    title: 'Program leczenia łupieżu i łojotokowego zapalenia skóry głowy',
    totalDurationWeeks: 6,
    notes: 'Program 6-tygodniowy dla pacjenta z łupieżem / ŁZS. Celem jest normalizacja mikroflory skóry głowy, redukcja łojotoku i stanów zapalnych. Dieta uboga w cukry proste wspomaga leczenie.',
    weeks: [
      { weekNumber: 1, description: 'Intensywna faza antygrzybiczy i antybakteryjna.', washingRoutine: 'Szampon ketokonazolowy 2% co 2 dni. Zostawić na głowie 5 min przed spłukaniem. Szampon z siarczkiem selenu jako uzupełnienie.', topicalProducts: 'Tonik z kwasem salicylowym 2% — aplikacja na skórę głowy wieczorem. Lotion z cynkiem pyritionie.', supplements: 'Cynk 15 mg, Biotyna 2500 mcg, Probiotyki (L. acidophilus)', inClinicProcedures: 'Peeling enzymatyczny skóry głowy w gabinecie + aplikacja serum kojącego', remarks: 'Nie stosować produktów z olejem kokosowym (nasila Malassezia). Dieta: ogranicz cukry.' },
      { weekNumber: 2, description: 'Kontynuacja terapii + nawilżenie skóry głowy.', washingRoutine: 'Zmienić na szampon z piroktonolaminą + nawilżający krem do skóry głowy (bez tłustych olejów).', topicalProducts: 'Kontynuacja toniku. Dodanie serum z niacynamidem 5%.', supplements: 'Kontynuacja. Kwasy Omega-3 1000 mg.', inClinicProcedures: 'Mezoterapia skóry głowy — koktajl nawilżający + przeciwzapalny', remarks: 'Ocena redukcji łuszczenia. Zwrócić uwagę na dietę.' },
      { weekNumber: 3, description: 'Faza podtrzymująca.', washingRoutine: 'Przejście na szampon codzienny delikatny + użycie szamponu leczniczego 2x/tydz.', topicalProducts: 'Tonik 3x / tydz. zamiast codziennie.', supplements: 'Bez zmian.', inClinicProcedures: 'Trichoskopia kontrolna — ocena stanu skóry głowy.', remarks: 'Przy ustąpieniu objawów możliwa redukcja częstotliwości stosowania szamponu leczniczego.' },
    ],
  },
  effluvium: {
    title: 'Program leczenia wypadania telogenowego (Telogen Effluvium)',
    totalDurationWeeks: 16,
    notes: 'Program 16-tygodniowy dla pacjenta z wypadaniem telogenowym (np. po chorobie, ciąży, stresie, operacji). Kluczowe jest zidentyfikowanie i usunięcie czynnika wyzwalającego oraz wsparcie odżywcze.',
    weeks: [
      { weekNumber: 1, description: 'Diagnoza i identyfikacja czynnika wyzwalającego. Badania: morfologia, TSH, FT4, żelazo, ferrytyna, witamina D3, cynk, B12.', washingRoutine: 'Delikatny szampon wzmacniający z kofeiną lub biotyna. Mycie codzienne lub co 2 dni. Nie siłowe suszenie.', topicalProducts: 'Serum z kofeiną + adenozyną — 1 ml rano. Minoksydyl 2–5% wieczorem (opcjonalnie po konsultacji).', supplements: 'Ferrum (jeśli ferrytyna < 40 ng/ml), Witamina D3 2000 IU, B12 1000 mcg, Biotyna 5000 mcg, Cynk 15 mg', inClinicProcedures: 'Mezoterapia igłowa — koktajl z witaminami i aminokwasami', remarks: 'Wypadanie telogenowe trwa zwykle 3–6 miesięcy od czynnika wyzwalającego. Odrost naturalne po usunięciu przyczyny.' },
      { weekNumber: 2, description: 'Wdrożenie suplementacji i terapii miejscowej.', washingRoutine: 'Bez zmian. Masaż skóry głowy — 5 min / dzień (poprawia mikrokrążenie).', topicalProducts: 'Kontynuacja serum. Ewentualne dodanie minoksydylu po konsultacji.', supplements: 'Kontynuacja + Kolagen morski 5 g / dzień.', inClinicProcedures: 'Lampa LED (LLLT) — 2 sesja', remarks: 'Odczekaj na wyniki badań krwi — weryfikacja niedoborów.' },
      { weekNumber: 3, description: 'Monitorowanie wypadania — prowadzenie dzienniczka (liczyć włosy na poduszce).', washingRoutine: 'Bez zmian.', topicalProducts: 'Bez zmian.', supplements: 'Korekta suplementacji na podstawie wyników krwi.', inClinicProcedures: 'Trichoskopia + ocena gęstości.', remarks: 'Wypadanie powinno zacząć się zmniejszać ok. 8–12 tyg.' },
      { weekNumber: 4, description: 'Wizyta kontrolna — ocena postępów.', washingRoutine: 'Bez zmian.', topicalProducts: 'Bez zmian.', supplements: 'Bez zmian.', inClinicProcedures: 'Konsultacja lekarska — omówienie wyników badań i postępów leczenia.', remarks: 'Zdjęcia dokumentacyjne. Ocena pull testu.' },
    ],
  },
};

interface WeekData {
  weekNumber: number;
  description: string;
  washingRoutine: string;
  topicalProducts: string;
  supplements: string;
  inClinicProcedures: string;
  remarks: string;
}

const WEEK_FIELDS: { key: keyof WeekData; label: string; icon: any; color: string }[] = [
  { key: 'description',        label: '📋 Opis / Cel tygodnia',    icon: null, color: '#6366f1' },
  { key: 'washingRoutine',     label: '🚿 Rutyna mycia głowy',     icon: null, color: '#0ea5e9' },
  { key: 'topicalProducts',    label: '💊 Produkty miejscowe',     icon: null, color: '#10b981' },
  { key: 'supplements',        label: '🔬 Suplementacja',          icon: null, color: '#f59e0b' },
  { key: 'inClinicProcedures', label: '🏥 Zabiegi w klinice',      icon: null, color: '#ef4444' },
  { key: 'remarks',            label: '📝 Uwagi / Zalecenia',       icon: null, color: '#8b5cf6' },
];

export default function CarePlanFormPage() {
  const { id, carePlanId } = useParams<{ id?: string; carePlanId?: string }>();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const dataLoaded = useRef(false);   // ← FIX BUG 1: prevents useEffect race condition

  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [expandedWeek, setExpandedWeek] = useState<number | false>(0);
  const [copiedWeek, setCopiedWeek] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    patientId: id || '',
    consultationId: '',
    title: '',
    totalDurationWeeks: 4,
    notes: '',
    isActive: true,
  });
  const [weeks, setWeeks] = useState<WeekData[]>([]);

  // Init empty weeks on new plan
  useEffect(() => {
    if (!carePlanId) {
      initializeWeeks(4);
    }
  }, []);

  // Fetch existing plan for edit
  useEffect(() => {
    if (carePlanId) {
      fetchCarePlan();
    }
  }, [carePlanId]);

  // ← FIX BUG 1: only re-initialize weeks when duration changes IF user explicitly changed it
  const handleDurationChange = (newDuration: number) => {
    const clamped = Math.max(1, Math.min(52, newDuration));
    setFormData(prev => ({ ...prev, totalDurationWeeks: clamped }));

    if (weeks.length < clamped) {
      // Add missing weeks
      const extra: WeekData[] = [];
      for (let i = weeks.length; i < clamped; i++) {
        extra.push({ weekNumber: i + 1, description: '', washingRoutine: '', topicalProducts: '', supplements: '', inClinicProcedures: '', remarks: '' });
      }
      setWeeks(prev => [...prev, ...extra]);
    } else if (weeks.length > clamped) {
      setWeeks(prev => prev.slice(0, clamped).map((w, i) => ({ ...w, weekNumber: i + 1 })));
    }
  };

  const initializeWeeks = (count: number) => {
    setWeeks(Array.from({ length: count }, (_, i) => ({
      weekNumber: i + 1, description: '', washingRoutine: '', topicalProducts: '', supplements: '', inClinicProcedures: '', remarks: '',
    })));
  };

  const fetchCarePlan = async () => {
    if (!carePlanId) return;
    try {
      setLoadingData(true);
      const response = await api.get(`/care-plans/${carePlanId}`);
      const plan = response.data.carePlan;

      dataLoaded.current = true;  // ← FIX BUG 1

      setFormData({
        patientId: plan.patientId || id || '',
        consultationId: plan.consultationId || '',
        title: plan.title || '',
        totalDurationWeeks: plan.totalDurationWeeks || 4,
        notes: plan.notes || '',
        isActive: plan.isActive !== undefined ? plan.isActive : true,
      });

      const loadedWeeks: WeekData[] = plan.weeks && plan.weeks.length > 0
        ? plan.weeks.map((week: any) => ({
          weekNumber: week.weekNumber,
          description: week.description || '',
          washingRoutine: week.washingRoutine || '',
          topicalProducts: week.topicalProducts || '',
          supplements: week.supplements || '',
          inClinicProcedures: week.inClinicProcedures || '',
          remarks: week.remarks || '',
        }))
        : Array.from({ length: plan.totalDurationWeeks || 4 }, (_, i) => ({
          weekNumber: i + 1, description: '', washingRoutine: '', topicalProducts: '', supplements: '', inClinicProcedures: '', remarks: '',
        }));

      setWeeks(loadedWeeks);  // ← FIX BUG 1: set weeks directly, not through useEffect
    } catch (error: any) {
      console.error('Błąd pobierania planu:', error);
      setError(error.response?.data?.error || 'Błąd pobierania planu');
    } finally {
      setLoadingData(false);
    }
  };

  const applyTemplate = (key: string) => {
    const tpl = TEMPLATES[key];
    if (!tpl) return;
    setFormData(prev => ({
      ...prev,
      title: tpl.title,
      totalDurationWeeks: tpl.totalDurationWeeks,
      notes: tpl.notes,
    }));
    // Fill with template weeks + blank weeks for remaining duration
    const templateWeeks = tpl.weeks;
    const allWeeks: WeekData[] = Array.from({ length: tpl.totalDurationWeeks }, (_, i) => (
      templateWeeks[i]
        ? { ...templateWeeks[i], weekNumber: i + 1 }
        : { weekNumber: i + 1, description: '', washingRoutine: '', topicalProducts: '', supplements: '', inClinicProcedures: '', remarks: '' }
    ));
    setWeeks(allWeeks);
    setSelectedTemplate(key);
    setExpandedWeek(0);
  };

  const handleWeekChange = (index: number, field: keyof WeekData, value: string) => {
    setWeeks(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleAddWeek = () => {
    const newWeek: WeekData = {
      weekNumber: weeks.length + 1,
      description: '', washingRoutine: '', topicalProducts: '',
      supplements: '', inClinicProcedures: '', remarks: '',
    };
    setWeeks(prev => [...prev, newWeek]);
    setFormData(prev => ({ ...prev, totalDurationWeeks: prev.totalDurationWeeks + 1 }));
    setExpandedWeek(weeks.length);
  };

  const handleRemoveWeek = (index: number) => {
    if (weeks.length <= 1) { setError('Musi być co najmniej jeden tydzień'); return; }
    setWeeks(prev => prev.filter((_, i) => i !== index).map((w, i) => ({ ...w, weekNumber: i + 1 })));
    setFormData(prev => ({ ...prev, totalDurationWeeks: prev.totalDurationWeeks - 1 }));
  };

  const handleCopyWeek = (index: number) => {
    if (index + 1 >= weeks.length) return;
    setWeeks(prev => {
      const next = [...prev];
      const source = prev[index];
      next[index + 1] = {
        ...source,
        weekNumber: index + 2,
        description: source.description ? `[Kontynuacja] ${source.description}` : '',
      };
      return next;
    });
    setCopiedWeek(index);
    setTimeout(() => setCopiedWeek(null), 1500);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) { setError('Tytuł planu jest wymagany'); return; }
    if (weeks.length === 0) { setError('Dodaj co najmniej jeden tydzień'); return; }

    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      const dataToSend = {
        ...formData,
        consultationId: formData.consultationId?.trim() || undefined,
        weeks,  // ← FIX BUG 2: send ALL weeks, not just non-empty ones
      };

      if (carePlanId) {
        await api.put(`/care-plans/${carePlanId}`, dataToSend);
      } else {
        await api.post('/care-plans', dataToSend);
      }

      setSuccess(true);
      setTimeout(() => navigate(`/patients/${id}/care-plans`), 1500);
    } catch (err: any) {
      console.error('Błąd zapisywania planu:', err);
      setError(err.response?.data?.error || err.message || 'Błąd zapisywania planu');
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', gap: 2 }}>
        <CircularProgress size={48} />
        <Typography color="text.secondary">Ładowanie planu opieki...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto', pb: 6 }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" fontWeight={800} sx={{ fontSize: { xs: '1.5rem', sm: '2rem' }, color: 'secondary.main' }}>
          {carePlanId ? '✏️ Edytuj plan opieki' : '🌿 Nowy plan opieki trychologicznej'}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          {carePlanId ? 'Modyfikuj plan i zapisz zmiany' : 'Utwórz spersonalizowany plan kuracji dla pacjenta'}
        </Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} icon={<CheckCircle />}>Plan opieki zapisany! Przekierowanie...</Alert>}

      <form onSubmit={handleSubmit}>

        {/* ── TEMPLATE SELECTOR (new plans only) ──────────────────── */}
        {!carePlanId && (
          <Paper elevation={0} sx={{ p: 2.5, mb: 2.5, borderRadius: 3, border: '2px dashed', borderColor: 'secondary.light', bgcolor: 'secondary.50' }}>
            <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
              <AutoAwesome sx={{ color: 'secondary.main', fontSize: 20 }} />
              Szybki start — wybierz szablon
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {Object.entries({
                aga: { label: '💇 Łysienie androgenowe (AGA)', color: 'primary' as const },
                aa:  { label: '🔴 Łysienie plackowate (AA)',   color: 'error'   as const },
                dandruff: { label: '❄️ Łupież / ŁZS',         color: 'info'    as const },
                effluvium: { label: '🌡️ Wypadanie telogenowe', color: 'warning' as const },
              }).map(([key, cfg]) => (
                <Chip
                  key={key}
                  label={cfg.label}
                  color={selectedTemplate === key ? cfg.color : 'default'}
                  variant={selectedTemplate === key ? 'filled' : 'outlined'}
                  onClick={() => applyTemplate(key)}
                  sx={{ cursor: 'pointer', fontWeight: 600, '&:hover': { opacity: 0.85 } }}
                />
              ))}
            </Box>
            {selectedTemplate && (
              <Typography variant="caption" color="success.main" sx={{ mt: 1, display: 'block', fontWeight: 600 }}>
                ✓ Szablon załadowany — możesz edytować poszczególne pola
              </Typography>
            )}
          </Paper>
        )}

        {/* ── BASIC INFO ───────────────────────────────────────────── */}
        <Paper elevation={0} sx={{ p: 2.5, mb: 2.5, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
          <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>Podstawowe informacje</Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth label="Tytuł planu opieki" value={formData.title}
                onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
                required placeholder="np. Program leczenia łysienia androgenowego — 12 tygodni"
                helperText="Tytuł widoczny dla pacjenta na planie"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                fullWidth label="Czas trwania (tygodnie)" type="number"
                value={formData.totalDurationWeeks}
                onChange={e => handleDurationChange(parseInt(e.target.value) || 1)}
                inputProps={{ min: 1, max: 52 }}
                helperText={`${weeks.length} tyg. skonfigurowanych`}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 8 }}>
              <TextField
                fullWidth label="Uwagi ogólne dla pacjenta" value={formData.notes}
                onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                multiline rows={3}
                placeholder="Ważne wskazówki ogólne, informacje o planie, cel leczenia..."
                helperText="Wyświetlane jako wprowadzenie do planu"
              />
            </Grid>
          </Grid>
        </Paper>

        {/* ── WEEKS ────────────────────────────────────────────────── */}
        <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, border: '1px solid', borderColor: 'divider', mb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="subtitle1" fontWeight={700}>
              📅 Tygodnie planu
              <Chip label={`${weeks.length} tyg.`} size="small" color="secondary" sx={{ ml: 1, fontWeight: 700 }} />
            </Typography>
            <Button variant="outlined" size="small" startIcon={<Add />} onClick={handleAddWeek} sx={{ borderRadius: 2 }}>
              Dodaj tydzień
            </Button>
          </Box>

          {weeks.map((week, index) => {
            const filledFields = WEEK_FIELDS.filter(f => week[f.key as keyof WeekData]).length;
            return (
              <Accordion
                key={index}
                expanded={expandedWeek === index}
                onChange={(_, expanded) => setExpandedWeek(expanded ? index : false)}
                elevation={0}
                sx={{
                  mb: 1, border: '1px solid', borderColor: expandedWeek === index ? 'secondary.main' : 'divider',
                  borderRadius: '12px !important', overflow: 'hidden',
                  '&:before': { display: 'none' },
                }}
              >
                <AccordionSummary expandIcon={<ExpandMore />} sx={{ px: 2, bgcolor: expandedWeek === index ? 'secondary.50' : 'transparent' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1, mr: 2 }}>
                    <Box sx={{
                      width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      bgcolor: expandedWeek === index ? 'secondary.main' : 'grey.200',
                      color: expandedWeek === index ? '#fff' : 'text.secondary',
                      fontWeight: 700, fontSize: '0.8rem', flexShrink: 0,
                    }}>
                      {week.weekNumber}
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="subtitle2" fontWeight={700} noWrap>
                        Tydzień {week.weekNumber}
                        {week.description && <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }} noWrap>— {week.description.substring(0, 50)}{week.description.length > 50 ? '…' : ''}</Typography>}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0 }}>
                      {filledFields > 0 && (
                        <Chip label={`${filledFields}/6`} size="small" color="success" sx={{ height: 20, fontSize: '0.65rem', fontWeight: 700 }} />
                      )}
                    </Box>
                  </Box>
                </AccordionSummary>

                <AccordionDetails sx={{ px: 2, pt: 0, pb: 2 }}>
                  <Divider sx={{ mb: 2 }} />
                  <Grid container spacing={2}>
                    {WEEK_FIELDS.map(field => (
                      <Grid key={field.key} size={{ xs: 12, sm: field.key === 'description' || field.key === 'remarks' ? 12 : 6 }}>
                        <TextField
                          fullWidth
                          label={field.label}
                          value={week[field.key as keyof WeekData] as string}
                          onChange={e => handleWeekChange(index, field.key as keyof WeekData, e.target.value)}
                          multiline rows={2}
                          sx={{
                            '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': {
                              borderColor: field.color,
                            },
                            '& label.Mui-focused': { color: field.color },
                          }}
                        />
                      </Grid>
                    ))}
                  </Grid>

                  <Stack direction="row" spacing={1} sx={{ mt: 2, justifyContent: 'flex-end' }}>
                    {index + 1 < weeks.length && (
                      <Tooltip title="Skopiuj ten tydzień do następnego">
                        <Button
                          size="small" variant="outlined" startIcon={copiedWeek === index ? <CheckCircle /> : <ContentCopy />}
                          onClick={() => handleCopyWeek(index)}
                          color={copiedWeek === index ? 'success' : 'inherit'}
                          sx={{ borderRadius: 2, fontSize: '0.75rem' }}
                        >
                          {copiedWeek === index ? 'Skopiowano!' : 'Kopiuj do nast.'}
                        </Button>
                      </Tooltip>
                    )}
                    {weeks.length > 1 && (
                      <Button
                        size="small" variant="text" color="error" startIcon={<Delete />}
                        onClick={() => handleRemoveWeek(index)}
                        sx={{ borderRadius: 2, fontSize: '0.75rem' }}
                      >
                        Usuń tydzień
                      </Button>
                    )}
                  </Stack>
                </AccordionDetails>
              </Accordion>
            );
          })}
        </Paper>

        {/* ── ACTIONS ──────────────────────────────────────────────── */}
        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', flexDirection: { xs: 'column-reverse', sm: 'row' }, mt: 2 }}>
          <Button
            variant="outlined" onClick={() => navigate(`/patients/${id}/care-plans`)}
            disabled={loading} fullWidth={isMobile} sx={{ borderRadius: 2.5 }}
          >
            Anuluj
          </Button>
          <Button
            type="submit" variant="contained" color="secondary"
            disabled={loading} fullWidth={isMobile}
            startIcon={loading ? <CircularProgress size={18} /> : <CheckCircle />}
            sx={{ borderRadius: 2.5, fontWeight: 700, px: 4 }}
          >
            {loading ? 'Zapisywanie...' : (carePlanId ? 'Zapisz zmiany' : 'Utwórz plan')}
          </Button>
        </Box>
      </form>
    </Box>
  );
}
