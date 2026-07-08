// ============================================================
// NewCardWizard — 3-step wizard modal for creating a new card
// ============================================================

import { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Box,
  Typography, Stepper, Step, StepLabel, Grid, Card, CardActionArea,
  CardContent, TextField, Chip,
} from '@mui/material';
import {
  Description, ShortText, Assignment, AutoAwesome, InsertDriveFileOutlined,
  Check,
} from '@mui/icons-material';
import { TemplatePreset, Branding, DEFAULT_BRANDING } from './types';

interface NewCardWizardProps {
  open: boolean;
  onClose: () => void;
  onCreateCard: (preset: TemplatePreset, branding: Branding, name: string) => void;
}

const PRESET_OPTIONS: {
  value: TemplatePreset;
  title: string;
  description: string;
  pages: string;
  icon: React.ReactNode;
}[] = [
  { value: 'full', title: 'Karta pełna', description: 'Wszystkie bloki (8 stron)', pages: '8 str.', icon: <Description /> },
  { value: 'short', title: 'Karta skrócona', description: 'Dane + Wywiad + Diagnoza + Zalecenia', pages: '3 str.', icon: <ShortText /> },
  { value: 'control', title: 'Karta kontrolna', description: 'Dane + Trichoskopia + Diagnoza', pages: '1 str.', icon: <Assignment /> },
  { value: 'premium', title: 'Karta premium', description: 'Pełna + elegancki design', pages: '8 str.', icon: <AutoAwesome /> },
  { value: 'blank', title: 'Pusta karta', description: 'Tylko nagłówek, reszta od zera', pages: '—', icon: <InsertDriveFileOutlined /> },
];

const STEPS = ['Wybierz szablon', 'Branding', 'Podgląd'];

export default function NewCardWizard({ open, onClose, onCreateCard }: NewCardWizardProps) {
  const [step, setStep] = useState(0);
  const [preset, setPreset] = useState<TemplatePreset>('full');
  const [cardName, setCardName] = useState('Nowa karta konsultacyjna');
  const [branding, setBranding] = useState<Branding>({ ...DEFAULT_BRANDING });

  const handleCreate = () => {
    onCreateCard(preset, branding, cardName);
    setStep(0);
    setPreset('full');
    setCardName('Nowa karta konsultacyjna');
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>Nowa karta konsultacyjna</Typography>
      </DialogTitle>

      <DialogContent>
        <Stepper activeStep={step} sx={{ mb: 3 }}>
          {STEPS.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {/* Step 0 — Template preset selection */}
        {step === 0 && (
          <Box>
            <TextField
              fullWidth
              label="Nazwa karty"
              value={cardName}
              onChange={(e) => setCardName(e.target.value)}
              sx={{ mb: 3 }}
            />
            <Grid container spacing={2}>
              {PRESET_OPTIONS.map((opt) => (
                <Grid size={{ xs: 12, sm: 6, md: 4 }} key={opt.value}>
                  <Card
                    variant="outlined"
                    sx={{
                      border: preset === opt.value ? '2px solid #2E5F8A' : '1px solid #E2E8F0',
                      transition: 'all 0.15s',
                      '&:hover': { borderColor: '#2E5F8A', boxShadow: '0 2px 8px rgba(46,95,138,0.1)' },
                    }}
                  >
                    <CardActionArea onClick={() => setPreset(opt.value)}>
                      <CardContent sx={{ textAlign: 'center', py: 3 }}>
                        <Box sx={{ color: preset === opt.value ? '#2E5F8A' : '#94A3B8', mb: 1 }}>
                          {opt.icon}
                        </Box>
                        <Typography sx={{ fontWeight: 600, fontSize: 14 }}>{opt.title}</Typography>
                        <Typography sx={{ fontSize: 12, color: '#64748B', mt: 0.5 }}>{opt.description}</Typography>
                        <Chip label={opt.pages} size="small" sx={{ mt: 1, fontSize: 11 }} />
                        {preset === opt.value && (
                          <Check sx={{ position: 'absolute', top: 8, right: 8, color: '#2E5F8A', fontSize: 20 }} />
                        )}
                      </CardContent>
                    </CardActionArea>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>
        )}

        {/* Step 1 — Branding */}
        {step === 1 && (
          <Box>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  label="Nazwa gabinetu"
                  value={branding.clinicName}
                  onChange={(e) => setBranding({ ...branding, clinicName: e.target.value })}
                />
              </Grid>
              <Grid size={{ xs: 6 }}>
                <TextField
                  fullWidth
                  label="Kolor przewodni"
                  type="color"
                  value={branding.primaryColor}
                  onChange={(e) => setBranding({ ...branding, primaryColor: e.target.value })}
                  InputProps={{ sx: { height: 48 } }}
                />
              </Grid>
              <Grid size={{ xs: 6 }}>
                <TextField
                  fullWidth
                  label="Kolor akcentu"
                  type="color"
                  value={branding.accentColor}
                  onChange={(e) => setBranding({ ...branding, accentColor: e.target.value })}
                  InputProps={{ sx: { height: 48 } }}
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  label="Adres"
                  value={branding.clinicAddress}
                  onChange={(e) => setBranding({ ...branding, clinicAddress: e.target.value })}
                />
              </Grid>
              <Grid size={{ xs: 6 }}>
                <TextField
                  fullWidth
                  label="Telefon"
                  value={branding.clinicPhone}
                  onChange={(e) => setBranding({ ...branding, clinicPhone: e.target.value })}
                />
              </Grid>
              <Grid size={{ xs: 6 }}>
                <TextField
                  fullWidth
                  label="Email"
                  value={branding.clinicEmail}
                  onChange={(e) => setBranding({ ...branding, clinicEmail: e.target.value })}
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  label="Strona WWW"
                  value={branding.clinicWebsite}
                  onChange={(e) => setBranding({ ...branding, clinicWebsite: e.target.value })}
                />
              </Grid>
            </Grid>
          </Box>
        )}

        {/* Step 2 — Preview summary */}
        {step === 2 && (
          <Box sx={{ textAlign: 'center', py: 3 }}>
            <AutoAwesome sx={{ fontSize: 48, color: '#2E5F8A', mb: 2 }} />
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
              Gotowe do utworzenia!
            </Typography>
            <Typography sx={{ color: '#64748B', mb: 2 }}>
              Szablon: <strong>{PRESET_OPTIONS.find((o) => o.value === preset)?.title}</strong>
            </Typography>
            <Typography sx={{ color: '#64748B' }}>
              Nazwa: <strong>{cardName}</strong>
            </Typography>
            {branding.clinicName && (
              <Typography sx={{ color: '#64748B', mt: 0.5 }}>
                Gabinet: <strong>{branding.clinicName}</strong>
              </Typography>
            )}
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} sx={{ color: '#64748B' }}>Anuluj</Button>
        {step > 0 && (
          <Button onClick={() => setStep(step - 1)} sx={{ color: '#64748B' }}>
            Wstecz
          </Button>
        )}
        {step < 2 ? (
          <Button
            variant="contained"
            onClick={() => setStep(step + 1)}
            sx={{ bgcolor: '#2E5F8A', '&:hover': { bgcolor: '#1E4F7A' } }}
          >
            Dalej
          </Button>
        ) : (
          <Button
            variant="contained"
            onClick={handleCreate}
            sx={{ bgcolor: '#2E5F8A', '&:hover': { bgcolor: '#1E4F7A' } }}
          >
            Utwórz kartę
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
