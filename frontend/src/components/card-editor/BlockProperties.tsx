// ============================================================
// BlockProperties — Right panel for editing selected block styles
// ============================================================

import {
  Box, Typography, Slider, Select, MenuItem, FormControl, InputLabel,
  Switch, FormControlLabel, Divider, ToggleButton, ToggleButtonGroup,
  TextField, IconButton, Tooltip, Chip,
} from '@mui/material';
import {
  FormatAlignLeft, FormatAlignCenter, FormatAlignRight, FormatAlignJustify,
  Visibility, VisibilityOff, Close,
} from '@mui/icons-material';
import {
  CardBlock, BlockStyle, TextAlign, ColumnLayout, RowDensity, BorderStyle,
  BACKGROUND_PRESETS, FONT_PAIRS,
} from './types';

interface BlockPropertiesProps {
  block: CardBlock | null;
  onUpdateStyle: (blockId: string, style: Partial<BlockStyle>) => void;
  onUpdateTitle: (blockId: string, title: string) => void;
  onClose: () => void;
}

export default function BlockProperties({
  block,
  onUpdateStyle,
  onUpdateTitle,
  onClose,
}: BlockPropertiesProps) {
  if (!block) {
    return (
      <Box
        sx={{
          width: 300,
          minWidth: 300,
          bgcolor: '#FFFFFF',
          borderLeft: '1px solid #E2E8F0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: 3,
          flexShrink: 0,
        }}
      >
        <Typography variant="body2" sx={{ color: '#94A3B8', textAlign: 'center' }}>
          Kliknij na blok, aby edytować jego właściwości
        </Typography>
      </Box>
    );
  }

  const s = block.style;
  const update = (patch: Partial<BlockStyle>) => onUpdateStyle(block.id, patch);

  return (
    <Box
      sx={{
        width: 300,
        minWidth: 300,
        bgcolor: '#FFFFFF',
        borderLeft: '1px solid #E2E8F0',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        flexShrink: 0,
      }}
    >
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2, py: 1.5, borderBottom: '1px solid #E2E8F0' }}>
        <Box>
          <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>
            Właściwości bloku
          </Typography>
          <Typography sx={{ fontSize: 11, color: '#64748B' }}>
            {block.title}
          </Typography>
        </Box>
        <IconButton size="small" onClick={onClose}>
          <Close sx={{ fontSize: 16 }} />
        </IconButton>
      </Box>

      {/* Scrollable content */}
      <Box sx={{ flex: 1, overflow: 'auto', px: 2, py: 1.5 }}>

        {/* Block title */}
        <Box sx={{ mb: 2 }}>
          <Typography sx={{ fontSize: 11, fontWeight: 600, color: '#64748B', mb: 0.5, textTransform: 'uppercase' }}>
            Tytuł bloku
          </Typography>
          <TextField
            fullWidth
            size="small"
            value={block.title}
            onChange={(e) => onUpdateTitle(block.id, e.target.value)}
            sx={{ '& .MuiInputBase-input': { fontSize: 13 } }}
          />
        </Box>

        <Divider sx={{ mb: 2 }} />

        {/* ── Styl bloku ──────────────────────────── */}
        <Typography sx={{ fontSize: 11, fontWeight: 600, color: '#64748B', mb: 1, textTransform: 'uppercase' }}>
          Styl bloku
        </Typography>

        {/* Background color presets */}
        <Box sx={{ mb: 1.5 }}>
          <Typography sx={{ fontSize: 11, mb: 0.5, color: '#64748B' }}>Kolor tła</Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {BACKGROUND_PRESETS.map((preset) => (
              <Tooltip key={preset.value} title={preset.label}>
                <Box
                  onClick={() => update({ backgroundColor: preset.value })}
                  sx={{
                    width: 24,
                    height: 24,
                    borderRadius: '4px',
                    bgcolor: preset.value,
                    border: s.backgroundColor === preset.value ? '2px solid #2E5F8A' : '1px solid #E2E8F0',
                    cursor: 'pointer',
                    transition: 'border 0.15s',
                  }}
                />
              </Tooltip>
            ))}
          </Box>
        </Box>

        {/* Padding */}
        <Box sx={{ mb: 1.5 }}>
          <Typography sx={{ fontSize: 11, mb: 0.5, color: '#64748B' }}>Padding ({s.padding}px)</Typography>
          <Slider
            value={s.padding}
            min={0}
            max={40}
            step={2}
            onChange={(_, v) => update({ padding: v as number })}
            size="small"
            sx={{ color: '#2E5F8A' }}
          />
        </Box>

        {/* Border */}
        <Box sx={{ mb: 1.5 }}>
          <Typography sx={{ fontSize: 11, mb: 0.5, color: '#64748B' }}>Obramowanie</Typography>
          <FormControl fullWidth size="small">
            <Select
              value={s.border.style}
              onChange={(e) => update({ border: { ...s.border, style: e.target.value as BorderStyle } })}
              sx={{ fontSize: 12 }}
            >
              <MenuItem value="none">Brak</MenuItem>
              <MenuItem value="thin">Cienkie</MenuItem>
              <MenuItem value="thick">Grube</MenuItem>
              <MenuItem value="double">Podwójne</MenuItem>
              <MenuItem value="dashed">Kreskowe</MenuItem>
            </Select>
          </FormControl>
        </Box>

        {/* Border radius */}
        <Box sx={{ mb: 1.5 }}>
          <Typography sx={{ fontSize: 11, mb: 0.5, color: '#64748B' }}>Zaokrąglenie ({s.border.radius}px)</Typography>
          <Slider
            value={s.border.radius}
            min={0}
            max={16}
            step={1}
            onChange={(_, v) => update({ border: { ...s.border, radius: v as number } })}
            size="small"
            sx={{ color: '#2E5F8A' }}
          />
        </Box>

        {/* Shadow */}
        <FormControlLabel
          control={<Switch size="small" checked={s.shadow} onChange={(e) => update({ shadow: e.target.checked })} />}
          label={<Typography sx={{ fontSize: 12 }}>Cień bloku</Typography>}
          sx={{ mb: 1 }}
        />

        {/* Printable */}
        <FormControlLabel
          control={<Switch size="small" checked={s.printable} onChange={(e) => update({ printable: e.target.checked })} />}
          label={<Typography sx={{ fontSize: 12 }}>Drukuj ten blok</Typography>}
          sx={{ mb: 1.5 }}
        />

        <Divider sx={{ mb: 2 }} />

        {/* ── Typografia ──────────────────────────── */}
        <Typography sx={{ fontSize: 11, fontWeight: 600, color: '#64748B', mb: 1, textTransform: 'uppercase' }}>
          Typografia
        </Typography>

        {/* Heading size */}
        <Box sx={{ mb: 1.5 }}>
          <Typography sx={{ fontSize: 11, mb: 0.5, color: '#64748B' }}>Rozmiar nagłówka ({s.headingSize}px)</Typography>
          <Slider
            value={s.headingSize}
            min={12}
            max={28}
            step={1}
            onChange={(_, v) => update({ headingSize: v as number })}
            size="small"
            sx={{ color: '#2E5F8A' }}
          />
        </Box>

        {/* Body size */}
        <Box sx={{ mb: 1.5 }}>
          <Typography sx={{ fontSize: 11, mb: 0.5, color: '#64748B' }}>Rozmiar tekstu ({s.bodySize}px)</Typography>
          <Slider
            value={s.bodySize}
            min={7}
            max={16}
            step={0.5}
            onChange={(_, v) => update({ bodySize: v as number })}
            size="small"
            sx={{ color: '#2E5F8A' }}
          />
        </Box>

        {/* Font pair */}
        <Box sx={{ mb: 1.5 }}>
          <Typography sx={{ fontSize: 11, mb: 0.5, color: '#64748B' }}>Czcionka</Typography>
          <FormControl fullWidth size="small">
            <Select
              value={s.headingFont}
              onChange={(e) => {
                const pair = FONT_PAIRS.find((p) => p.display === e.target.value);
                if (pair) update({ headingFont: pair.display, bodyFont: pair.body });
              }}
              sx={{ fontSize: 12 }}
            >
              {FONT_PAIRS.map((pair) => (
                <MenuItem key={pair.display} value={pair.display}>
                  {pair.label} ({pair.display})
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        <Divider sx={{ mb: 2 }} />

        {/* ── Układ ───────────────────────────────── */}
        <Typography sx={{ fontSize: 11, fontWeight: 600, color: '#64748B', mb: 1, textTransform: 'uppercase' }}>
          Układ zawartości
        </Typography>

        {/* Columns */}
        <Box sx={{ mb: 1.5 }}>
          <Typography sx={{ fontSize: 11, mb: 0.5, color: '#64748B' }}>Kolumny</Typography>
          <ToggleButtonGroup
            value={s.columns}
            exclusive
            onChange={(_, v) => v && update({ columns: v as ColumnLayout })}
            size="small"
            sx={{ '& .MuiToggleButton-root': { px: 2, py: 0.3, fontSize: 11 } }}
          >
            <ToggleButton value={1}>1</ToggleButton>
            <ToggleButton value={2}>2</ToggleButton>
            <ToggleButton value={3}>3</ToggleButton>
          </ToggleButtonGroup>
        </Box>

        {/* Text align */}
        <Box sx={{ mb: 1.5 }}>
          <Typography sx={{ fontSize: 11, mb: 0.5, color: '#64748B' }}>Wyrównanie tekstu</Typography>
          <ToggleButtonGroup
            value={s.textAlign}
            exclusive
            onChange={(_, v) => v && update({ textAlign: v as TextAlign })}
            size="small"
            sx={{ '& .MuiToggleButton-root': { px: 1.5, py: 0.3 } }}
          >
            <ToggleButton value="left"><FormatAlignLeft sx={{ fontSize: 16 }} /></ToggleButton>
            <ToggleButton value="center"><FormatAlignCenter sx={{ fontSize: 16 }} /></ToggleButton>
            <ToggleButton value="right"><FormatAlignRight sx={{ fontSize: 16 }} /></ToggleButton>
            <ToggleButton value="justify"><FormatAlignJustify sx={{ fontSize: 16 }} /></ToggleButton>
          </ToggleButtonGroup>
        </Box>

        {/* Row density */}
        <Box sx={{ mb: 1.5 }}>
          <Typography sx={{ fontSize: 11, mb: 0.5, color: '#64748B' }}>Gęstość wierszy</Typography>
          <FormControl fullWidth size="small">
            <Select
              value={s.rowDensity}
              onChange={(e) => update({ rowDensity: e.target.value as RowDensity })}
              sx={{ fontSize: 12 }}
            >
              <MenuItem value="compact">Kompaktowa</MenuItem>
              <MenuItem value="normal">Normalna</MenuItem>
              <MenuItem value="spacious">Przestronna</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Box>
    </Box>
  );
}
