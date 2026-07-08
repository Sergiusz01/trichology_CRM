// ============================================================
// BrandingSettings — Modal for clinic branding configuration
// ============================================================

import { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Box,
  Typography, TextField, Grid, Divider, Chip,
} from '@mui/material';
import { Save, Palette } from '@mui/icons-material';
import { Branding, FONT_PAIRS } from './types';

interface BrandingSettingsProps {
  open: boolean;
  onClose: () => void;
  branding: Branding;
  onSave: (branding: Branding) => void;
}

export default function BrandingSettings({ open, onClose, branding, onSave }: BrandingSettingsProps) {
  const [local, setLocal] = useState<Branding>({ ...branding });

  const update = (patch: Partial<Branding>) => setLocal({ ...local, ...patch });

  const handleSave = () => {
    onSave(local);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Palette sx={{ color: '#2E5F8A' }} />
        <Typography variant="h6" sx={{ fontWeight: 700 }}>Branding gabinetu</Typography>
      </DialogTitle>

      <DialogContent>
        <Grid container spacing={2.5} sx={{ mt: 0.5 }}>
          {/* Logo */}
          <Grid size={{ xs: 12 }}>
            <Typography sx={{ fontSize: 12, fontWeight: 600, color: '#64748B', mb: 1, textTransform: 'uppercase' }}>
              Logo gabinetu
            </Typography>
            <Box
              sx={{
                border: '2px dashed #E2E8F0',
                borderRadius: 2,
                p: 3,
                textAlign: 'center',
                bgcolor: '#F8FAFC',
                cursor: 'pointer',
                transition: 'border-color 0.15s',
                '&:hover': { borderColor: '#2E5F8A' },
              }}
              onClick={() => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = 'image/png,image/svg+xml,image/jpeg';
                input.onchange = (e) => {
                  const file = (e.target as HTMLInputElement).files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = () => update({ logoUrl: reader.result as string });
                    reader.readAsDataURL(file);
                  }
                };
                input.click();
              }}
            >
              {local.logoUrl ? (
                <Box component="img" src={local.logoUrl} alt="Logo" sx={{ maxHeight: 60, maxWidth: '100%' }} />
              ) : (
                <Typography sx={{ color: '#94A3B8', fontSize: 13 }}>
                  Kliknij, aby przesłać logo (PNG / SVG)
                </Typography>
              )}
            </Box>
          </Grid>

          <Grid size={{ xs: 12 }}>
            <Divider />
          </Grid>

          {/* Colors */}
          <Grid size={{ xs: 12 }}>
            <Typography sx={{ fontSize: 12, fontWeight: 600, color: '#64748B', mb: 1, textTransform: 'uppercase' }}>
              Kolory
            </Typography>
          </Grid>
          <Grid size={{ xs: 6 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box
                component="input"
                type="color"
                value={local.primaryColor}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => update({ primaryColor: e.target.value })}
                sx={{
                  width: 40, height: 40, border: '2px solid #E2E8F0', borderRadius: '8px',
                  cursor: 'pointer', p: 0, appearance: 'none',
                  '&::-webkit-color-swatch-wrapper': { p: 0 },
                  '&::-webkit-color-swatch': { border: 'none', borderRadius: '6px' },
                }}
              />
              <Box>
                <Typography sx={{ fontSize: 12, fontWeight: 600 }}>Kolor przewodni</Typography>
                <Typography sx={{ fontSize: 11, color: '#94A3B8' }}>{local.primaryColor}</Typography>
              </Box>
            </Box>
          </Grid>
          <Grid size={{ xs: 6 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box
                component="input"
                type="color"
                value={local.accentColor}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => update({ accentColor: e.target.value })}
                sx={{
                  width: 40, height: 40, border: '2px solid #E2E8F0', borderRadius: '8px',
                  cursor: 'pointer', p: 0, appearance: 'none',
                  '&::-webkit-color-swatch-wrapper': { p: 0 },
                  '&::-webkit-color-swatch': { border: 'none', borderRadius: '6px' },
                }}
              />
              <Box>
                <Typography sx={{ fontSize: 12, fontWeight: 600 }}>Kolor akcentu</Typography>
                <Typography sx={{ fontSize: 11, color: '#94A3B8' }}>{local.accentColor}</Typography>
              </Box>
            </Box>
          </Grid>

          <Grid size={{ xs: 12 }}>
            <Divider />
          </Grid>

          {/* Fonts */}
          <Grid size={{ xs: 12 }}>
            <Typography sx={{ fontSize: 12, fontWeight: 600, color: '#64748B', mb: 1, textTransform: 'uppercase' }}>
              Czcionki
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {FONT_PAIRS.map((pair) => (
                <Chip
                  key={pair.display}
                  label={pair.label}
                  onClick={() => update({ displayFont: pair.display, bodyFont: pair.body })}
                  variant={local.displayFont === pair.display ? 'filled' : 'outlined'}
                  color={local.displayFont === pair.display ? 'primary' : 'default'}
                  sx={{ fontSize: 12 }}
                />
              ))}
            </Box>
          </Grid>

          <Grid size={{ xs: 12 }}>
            <Divider />
          </Grid>

          {/* Clinic info */}
          <Grid size={{ xs: 12 }}>
            <Typography sx={{ fontSize: 12, fontWeight: 600, color: '#64748B', mb: 1, textTransform: 'uppercase' }}>
              Dane gabinetu
            </Typography>
          </Grid>
          <Grid size={{ xs: 12 }}>
            <TextField fullWidth label="Nazwa gabinetu" value={local.clinicName} onChange={(e) => update({ clinicName: e.target.value })} />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <TextField fullWidth label="Adres" value={local.clinicAddress} onChange={(e) => update({ clinicAddress: e.target.value })} />
          </Grid>
          <Grid size={{ xs: 4 }}>
            <TextField fullWidth label="Telefon" value={local.clinicPhone} onChange={(e) => update({ clinicPhone: e.target.value })} />
          </Grid>
          <Grid size={{ xs: 4 }}>
            <TextField fullWidth label="Email" value={local.clinicEmail} onChange={(e) => update({ clinicEmail: e.target.value })} />
          </Grid>
          <Grid size={{ xs: 4 }}>
            <TextField fullWidth label="WWW" value={local.clinicWebsite} onChange={(e) => update({ clinicWebsite: e.target.value })} />
          </Grid>

          <Grid size={{ xs: 12 }}>
            <Divider />
          </Grid>

          {/* Doctor signature */}
          <Grid size={{ xs: 12 }}>
            <Typography sx={{ fontSize: 12, fontWeight: 600, color: '#64748B', mb: 1, textTransform: 'uppercase' }}>
              Podpis lekarza
            </Typography>
            <Box
              sx={{
                border: '2px dashed #E2E8F0',
                borderRadius: 2,
                p: 2,
                textAlign: 'center',
                bgcolor: '#F8FAFC',
                cursor: 'pointer',
                '&:hover': { borderColor: '#2E5F8A' },
              }}
              onClick={() => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = 'image/png,image/jpeg';
                input.onchange = (e) => {
                  const file = (e.target as HTMLInputElement).files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = () => update({ doctorSignatureUrl: reader.result as string });
                    reader.readAsDataURL(file);
                  }
                };
                input.click();
              }}
            >
              {local.doctorSignatureUrl ? (
                <Box component="img" src={local.doctorSignatureUrl} alt="Podpis" sx={{ maxHeight: 40 }} />
              ) : (
                <Typography sx={{ color: '#94A3B8', fontSize: 12 }}>
                  Kliknij, aby przesłać obraz podpisu
                </Typography>
              )}
            </Box>
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} sx={{ color: '#64748B' }}>Anuluj</Button>
        <Button variant="contained" startIcon={<Save />} onClick={handleSave} sx={{ bgcolor: '#2E5F8A', '&:hover': { bgcolor: '#1E4F7A' } }}>
          Zapisz branding
        </Button>
      </DialogActions>
    </Dialog>
  );
}
