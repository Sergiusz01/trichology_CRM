// ============================================================
// EditorToolbar — Top toolbar with mode switches, zoom, actions
// ============================================================

import { Box, Button, IconButton, ToggleButton, ToggleButtonGroup, Tooltip, Typography, Slider, Chip } from '@mui/material';
import {
  Undo, Redo, Save, Print, PictureAsPdf, Visibility, Edit, Assignment,
  ZoomIn, ZoomOut, Add, Settings, NoteAdd,
} from '@mui/icons-material';
import { ViewMode, ZoomLevel } from './types';

interface EditorToolbarProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  zoom: ZoomLevel;
  onZoomChange: (zoom: ZoomLevel) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onSave: () => void;
  onNewCard: () => void;
  onBranding: () => void;
  isDirty: boolean;
  lastSavedAt: string | null;
  templateName: string;
}

export default function EditorToolbar({
  viewMode,
  onViewModeChange,
  zoom,
  onZoomChange,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onSave,
  onNewCard,
  onBranding,
  isDirty,
  lastSavedAt,
  templateName,
}: EditorToolbarProps) {
  const zoomPresets: ZoomLevel[] = [50, 75, 100, 125];

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        px: 2,
        py: 1,
        bgcolor: '#FFFFFF',
        borderBottom: '1px solid #E2E8F0',
        minHeight: 52,
        flexShrink: 0,
        flexWrap: 'wrap',
      }}
    >
      {/* Logo & Template name */}
      <Typography
        variant="subtitle1"
        sx={{
          fontWeight: 700,
          color: '#2E5F8A',
          letterSpacing: '-0.02em',
          mr: 1,
          whiteSpace: 'nowrap',
        }}
      >
        TrichoDiagnostic
      </Typography>

      <Typography
        variant="body2"
        sx={{
          color: '#64748B',
          maxWidth: 200,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          mr: 1,
        }}
      >
        {templateName}
      </Typography>

      {/* Divider */}
      <Box sx={{ width: 1, height: 28, bgcolor: '#E2E8F0', mx: 0.5 }} />

      {/* New Card & Templates */}
      <Tooltip title="Nowa karta">
        <Button
          size="small"
          startIcon={<NoteAdd />}
          onClick={onNewCard}
          sx={{ color: '#0F172A', textTransform: 'none', fontSize: 13 }}
        >
          Nowa karta
        </Button>
      </Tooltip>

      {/* Divider */}
      <Box sx={{ width: 1, height: 28, bgcolor: '#E2E8F0', mx: 0.5 }} />

      {/* Undo / Redo */}
      <Tooltip title="Cofnij (Ctrl+Z)">
        <span>
          <IconButton size="small" onClick={onUndo} disabled={!canUndo}>
            <Undo fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>
      <Tooltip title="Ponów (Ctrl+Y)">
        <span>
          <IconButton size="small" onClick={onRedo} disabled={!canRedo}>
            <Redo fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>

      {/* Divider */}
      <Box sx={{ width: 1, height: 28, bgcolor: '#E2E8F0', mx: 0.5 }} />

      {/* View mode toggles */}
      <ToggleButtonGroup
        value={viewMode}
        exclusive
        onChange={(_, val) => val && onViewModeChange(val as ViewMode)}
        size="small"
        sx={{
          '& .MuiToggleButton-root': {
            px: 1.5,
            py: 0.5,
            fontSize: 12,
            textTransform: 'none',
            borderRadius: '6px !important',
            border: 'none',
            color: '#64748B',
            '&.Mui-selected': {
              bgcolor: '#2E5F8A',
              color: '#fff',
              '&:hover': { bgcolor: '#1E4F7A' },
            },
          },
        }}
      >
        <ToggleButton value="edit">
          <Edit sx={{ fontSize: 16, mr: 0.5 }} /> Edycja
        </ToggleButton>
        <ToggleButton value="preview">
          <Visibility sx={{ fontSize: 16, mr: 0.5 }} /> Podgląd
        </ToggleButton>
        <ToggleButton value="fill">
          <Assignment sx={{ fontSize: 16, mr: 0.5 }} /> Wypełnij
        </ToggleButton>
        <ToggleButton value="print">
          <Print sx={{ fontSize: 16, mr: 0.5 }} /> Druk
        </ToggleButton>
      </ToggleButtonGroup>

      {/* Divider */}
      <Box sx={{ width: 1, height: 28, bgcolor: '#E2E8F0', mx: 0.5 }} />

      {/* Zoom controls */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <Tooltip title="Pomniejsz">
          <span>
            <IconButton
              size="small"
              onClick={() => {
                const idx = zoomPresets.indexOf(zoom);
                if (idx > 0) onZoomChange(zoomPresets[idx - 1]);
              }}
              disabled={zoom === 50}
            >
              <ZoomOut fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
        <Typography variant="caption" sx={{ minWidth: 40, textAlign: 'center', color: '#64748B', fontWeight: 600 }}>
          {zoom}%
        </Typography>
        <Tooltip title="Powiększ">
          <span>
            <IconButton
              size="small"
              onClick={() => {
                const idx = zoomPresets.indexOf(zoom);
                if (idx < zoomPresets.length - 1) onZoomChange(zoomPresets[idx + 1]);
              }}
              disabled={zoom === 125}
            >
              <ZoomIn fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
      </Box>

      {/* Spacer */}
      <Box sx={{ flex: 1 }} />

      {/* Save status */}
      {lastSavedAt && (
        <Chip
          label={`Zapisano ${lastSavedAt}`}
          size="small"
          sx={{ fontSize: 11, bgcolor: '#F0FFF4', color: '#10B981', fontWeight: 500 }}
        />
      )}

      {/* Branding */}
      <Tooltip title="Branding gabinetu">
        <IconButton size="small" onClick={onBranding}>
          <Settings fontSize="small" />
        </IconButton>
      </Tooltip>

      {/* Save */}
      <Tooltip title="Zapisz (Ctrl+S)">
        <Button
          size="small"
          variant="contained"
          startIcon={<Save />}
          onClick={onSave}
          sx={{
            bgcolor: '#2E5F8A',
            fontSize: 13,
            px: 2,
            textTransform: 'none',
            '&:hover': { bgcolor: '#1E4F7A' },
          }}
        >
          Zapisz
        </Button>
      </Tooltip>
    </Box>
  );
}
