/**
 * PhoneInput.tsx
 * Pole telefonu z wyborem kierunkowego kraju (flaga + kod).
 * Przechowuje pełny numer jako string, np. "+48 123 456 789".
 */
import { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  MenuItem,
  Select,
  FormControl,
  FormHelperText,
  InputLabel,
  Typography,
  ListItemText,
} from '@mui/material';

export interface Country {
  code: string;
  name: string;
  dial: string;
  flag: string;
}

export const COUNTRIES: Country[] = [
  { code: 'PL', name: 'Polska',          dial: '+48',  flag: '🇵🇱' },
  { code: 'DE', name: 'Niemcy',          dial: '+49',  flag: '🇩🇪' },
  { code: 'GB', name: 'Wielka Brytania', dial: '+44',  flag: '🇬🇧' },
  { code: 'UA', name: 'Ukraina',         dial: '+380', flag: '🇺🇦' },
  { code: 'US', name: 'USA / Kanada',    dial: '+1',   flag: '🇺🇸' },
  { code: 'FR', name: 'Francja',         dial: '+33',  flag: '🇫🇷' },
  { code: 'IT', name: 'Włochy',          dial: '+39',  flag: '🇮🇹' },
  { code: 'ES', name: 'Hiszpania',       dial: '+34',  flag: '🇪🇸' },
  { code: 'NL', name: 'Holandia',        dial: '+31',  flag: '🇳🇱' },
  { code: 'BE', name: 'Belgia',          dial: '+32',  flag: '🇧🇪' },
  { code: 'AT', name: 'Austria',         dial: '+43',  flag: '🇦🇹' },
  { code: 'CH', name: 'Szwajcaria',      dial: '+41',  flag: '🇨🇭' },
  { code: 'SE', name: 'Szwecja',         dial: '+46',  flag: '🇸🇪' },
  { code: 'NO', name: 'Norwegia',        dial: '+47',  flag: '🇳🇴' },
  { code: 'DK', name: 'Dania',           dial: '+45',  flag: '🇩🇰' },
  { code: 'CZ', name: 'Czechy',          dial: '+420', flag: '🇨🇿' },
  { code: 'SK', name: 'Słowacja',        dial: '+421', flag: '🇸🇰' },
  { code: 'RU', name: 'Rosja',           dial: '+7',   flag: '🇷🇺' },
  { code: 'BY', name: 'Białoruś',        dial: '+375', flag: '🇧🇾' },
  { code: 'LT', name: 'Litwa',           dial: '+370', flag: '🇱🇹' },
  { code: 'LV', name: 'Łotwa',           dial: '+371', flag: '🇱🇻' },
  { code: 'EE', name: 'Estonia',         dial: '+372', flag: '🇪🇪' },
  { code: 'RO', name: 'Rumunia',         dial: '+40',  flag: '🇷🇴' },
  { code: 'BG', name: 'Bułgaria',        dial: '+359', flag: '🇧🇬' },
  { code: 'HU', name: 'Węgry',           dial: '+36',  flag: '🇭🇺' },
  { code: 'HR', name: 'Chorwacja',       dial: '+385', flag: '🇭🇷' },
  { code: 'TR', name: 'Turcja',          dial: '+90',  flag: '🇹🇷' },
  { code: 'IL', name: 'Izrael',          dial: '+972', flag: '🇮🇱' },
  { code: 'OTHER', name: 'Inny kraj',    dial: '',     flag: '🌍' },
];

/** Rozłóż pełny numer na kraj + lokalny numer */
function parseFullPhone(full: string): { country: Country; local: string } {
  const defaultCountry = COUNTRIES[0];
  if (!full) return { country: defaultCountry, local: '' };

  const sorted = [...COUNTRIES]
    .filter(c => c.dial)
    .sort((a, b) => b.dial.length - a.dial.length);

  for (const c of sorted) {
    if (full.startsWith(c.dial)) {
      const local = full.slice(c.dial.length).trim();
      return { country: c, local };
    }
  }

  const digits = full.replace(/\D/g, '');
  if (digits.length === 9) return { country: defaultCountry, local: digits };

  return { country: defaultCountry, local: full };
}

interface PhoneInputProps {
  value: string;
  onChange: (val: string) => void;
  error?: boolean;
  helperText?: string;
  label?: string;
  required?: boolean;
  size?: 'small' | 'medium';
}

export default function PhoneInput({
  value,
  onChange,
  error,
  helperText,
  label = 'Telefon',
  required,
  size = 'medium',
}: PhoneInputProps) {
  const parsed = parseFullPhone(value);
  const [country, setCountry] = useState<Country>(parsed.country);
  const [local, setLocal] = useState<string>(parsed.local);

  useEffect(() => {
    const p = parseFullPhone(value);
    setCountry(p.country);
    setLocal(p.local);
  }, [value]);

  const handleCountryChange = (code: string) => {
    const c = COUNTRIES.find(x => x.code === code) ?? COUNTRIES[0];
    setCountry(c);
    const full = c.dial ? `${c.dial} ${local}`.trim() : local;
    onChange(full);
  };

  const handleLocalChange = (raw: string) => {
    const cleaned = raw.replace(/[^\d\s\-]/g, '');
    setLocal(cleaned);
    const full = country.dial ? `${country.dial} ${cleaned}`.trim() : cleaned;
    onChange(full);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
        <FormControl size={size} sx={{ minWidth: 120, flexShrink: 0 }} error={error}>
          <InputLabel id="phone-country-label">Kraj</InputLabel>
          <Select
            labelId="phone-country-label"
            value={country.code}
            label="Kraj"
            onChange={e => handleCountryChange(e.target.value as string)}
            renderValue={code => {
              const c = COUNTRIES.find(x => x.code === code);
              return (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Typography sx={{ fontSize: '1.2rem', lineHeight: 1 }}>{c?.flag}</Typography>
                  <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary' }}>
                    {c?.dial || '—'}
                  </Typography>
                </Box>
              );
            }}
            MenuProps={{ PaperProps: { sx: { maxHeight: 340 } } }}
          >
            {COUNTRIES.map(c => (
              <MenuItem key={c.code} value={c.code}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, width: '100%' }}>
                  <Typography sx={{ fontSize: '1.3rem', lineHeight: 1, minWidth: 28 }}>
                    {c.flag}
                  </Typography>
                  <ListItemText
                    primary={c.name}
                    secondary={c.dial || '—'}
                    primaryTypographyProps={{ fontSize: '0.875rem' }}
                    secondaryTypographyProps={{ fontSize: '0.75rem' }}
                  />
                </Box>
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <TextField
          size={size}
          fullWidth
          label={label}
          required={required}
          value={local}
          onChange={e => handleLocalChange(e.target.value)}
          error={error}
          placeholder={country.code === 'PL' ? '123 456 789' : 'numer lokalny'}
          inputProps={{ inputMode: 'tel' }}
        />
      </Box>
      {helperText && (
        <FormHelperText error={error} sx={{ mt: 0.5, ml: 0.5 }}>
          {helperText}
        </FormHelperText>
      )}
    </Box>
  );
}
