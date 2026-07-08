// ============================================================
// ConsultationCardForm — Card editor in fill mode for consultations
// Replaces the old DynamicConsultationForm for NEW consultations
// ============================================================

import { useState, useCallback, useMemo } from 'react';
import { Box, Button, Typography, Alert, Snackbar, Paper, Chip } from '@mui/material';
import { Save, Print, Visibility, Edit as EditIcon, ArrowBack } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CardBlock, ViewMode } from './types';
import { createTemplatePreset } from './defaultBlocks';
import SortableBlockWrapper from './SortableBlockWrapper';
import BlockRenderer from './BlockRenderer';
import { api } from '../../services/api';

// A4 canvas dimensions
const A4_WIDTH = 595;

interface ConsultationCardFormProps {
  patientId: string;
  consultationDate: string;
  onDateChange: (date: string) => void;
  onSuccess: () => void;
  onError: (msg: string) => void;
  existingData?: any; // For editing existing card-editor consultations
}

/**
 * Serialize blocks into a flat dynamicData object for the backend.
 * Preserves the full blocks array under `_blocks` for reconstruction,
 * and extracts key values for search/display compatibility.
 */
function serializeBlocksToData(blocks: CardBlock[]): Record<string, any> {
  const data: Record<string, any> = {
    _cardEditorVersion: 2,
    _blocks: JSON.stringify(blocks),
  };

  // Extract key searchable/displayable fields from specific block types
  for (const block of blocks) {
    const c = block.content;
    switch (block.type) {
      case 'PROBLEM':
        if (c.subsections) {
          for (const sub of c.subsections) {
            for (const field of sub.fields || []) {
              if (field.selected?.length > 0) {
                data[`problem_${sub.id}_${field.id}`] = field.selected;
              }
              if (field.value) {
                data[`problem_${sub.id}_${field.id}_text`] = field.value;
              }
            }
          }
        }
        break;
      case 'DIAGNOSIS':
        if (c.text) data.diagnosis = c.text;
        break;
      case 'RECOMMENDATIONS':
        if (c.washing) data.rec_washing = c.washing;
        if (c.topical) data.rec_topical = c.topical;
        if (c.supplements) data.rec_supplements = c.supplements;
        if (c.behaviorChanges) data.rec_behaviorChanges = c.behaviorChanges;
        break;
      case 'NOTES':
        if (c.text) data.notes = c.text;
        break;
      case 'VISITS':
        if (c.text) data.visits_notes = c.text;
        break;
      case 'SCALES':
        if (c.norwood?.selected) data.norwood_stage = c.norwood.selected;
        if (c.ludwig?.selected) data.ludwig_stage = c.ludwig.selected;
        break;
    }
  }

  return data;
}

/**
 * Deserialize dynamicData back into blocks array
 */
function deserializeDataToBlocks(dynamicData: any): CardBlock[] | null {
  if (!dynamicData?._cardEditorVersion || !dynamicData?._blocks) return null;
  try {
    return JSON.parse(dynamicData._blocks);
  } catch {
    return null;
  }
}

export default function ConsultationCardForm({
  patientId,
  consultationDate,
  onDateChange,
  onSuccess,
  onError,
  existingData,
}: ConsultationCardFormProps) {
  const navigate = useNavigate();

  // Initialize blocks from existing data or default preset
  const [blocks, setBlocks] = useState<CardBlock[]>(() => {
    if (existingData?._cardEditorVersion) {
      const restored = deserializeDataToBlocks(existingData);
      if (restored) return restored;
    }
    return createTemplatePreset('full');
  });

  const [viewMode, setViewMode] = useState<ViewMode>('fill');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  // Update block content
  const updateBlockContent = useCallback((blockId: string, contentPatch: Record<string, any>) => {
    setBlocks((prev) =>
      prev.map((b) =>
        b.id === blockId ? { ...b, content: { ...b.content, ...contentPatch } } : b
      )
    );
  }, []);

  // Save consultation
  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const dynamicData = serializeBlocksToData(blocks);

      const payload = {
        patientId,
        consultationDate,
        dynamicData,
      };

      await api.post('/consultations', payload);

      setToast({ open: true, message: 'Konsultacja zapisana pomyślnie!', severity: 'success' });
      setTimeout(() => onSuccess(), 1000);
    } catch (err: any) {
      console.error('Błąd zapisu konsultacji:', err);
      const msg = err.response?.data?.error || err.message || 'Błąd zapisywania konsultacji';
      onError(msg);
      setToast({ open: true, message: msg, severity: 'error' });
    } finally {
      setSaving(false);
    }
  }, [blocks, patientId, consultationDate, onSuccess, onError]);

  const isPrintMode = viewMode === 'print';
  const scale = isPrintMode ? 1 : 0.85;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '80vh' }}>
      {/* Toolbar */}
      <Paper
        elevation={0}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          px: 2,
          py: 1.5,
          mb: 2,
          borderRadius: 2,
          border: '1px solid #E2E8F0',
          flexWrap: 'wrap',
        }}
      >
        <Typography sx={{ fontSize: 14, fontWeight: 700, color: '#2E5F8A', mr: 2 }}>
          Karta konsultacyjna
        </Typography>

        {/* Date picker */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography sx={{ fontSize: 12, color: '#64748B' }}>Data:</Typography>
          <input
            type="date"
            value={consultationDate}
            onChange={(e) => onDateChange(e.target.value)}
            style={{
              border: '1px solid #E2E8F0',
              borderRadius: 6,
              padding: '4px 8px',
              fontSize: 13,
              color: '#0F172A',
            }}
          />
        </Box>

        <Box sx={{ width: 1, height: 28, bgcolor: '#E2E8F0', mx: 0.5 }} />

        {/* View mode */}
        <Chip
          label="Wypełnij"
          size="small"
          onClick={() => setViewMode('fill')}
          variant={viewMode === 'fill' ? 'filled' : 'outlined'}
          color={viewMode === 'fill' ? 'primary' : 'default'}
          icon={<EditIcon sx={{ fontSize: 14 }} />}
          sx={{ fontSize: 12 }}
        />
        <Chip
          label="Podgląd"
          size="small"
          onClick={() => setViewMode('preview')}
          variant={viewMode === 'preview' ? 'filled' : 'outlined'}
          color={viewMode === 'preview' ? 'primary' : 'default'}
          icon={<Visibility sx={{ fontSize: 14 }} />}
          sx={{ fontSize: 12 }}
        />
        <Chip
          label="Druk"
          size="small"
          onClick={() => setViewMode('print')}
          variant={viewMode === 'print' ? 'filled' : 'outlined'}
          color={viewMode === 'print' ? 'primary' : 'default'}
          icon={<Print sx={{ fontSize: 14 }} />}
          sx={{ fontSize: 12 }}
        />

        <Box sx={{ flex: 1 }} />

        {/* Actions */}
        <Button
          variant="outlined"
          size="small"
          startIcon={<ArrowBack />}
          onClick={() => navigate(-1)}
          sx={{ textTransform: 'none', fontSize: 12, color: '#64748B', borderColor: '#E2E8F0' }}
        >
          Wróć
        </Button>
        <Button
          variant="contained"
          size="small"
          startIcon={<Save />}
          onClick={handleSave}
          disabled={saving}
          sx={{
            textTransform: 'none',
            fontSize: 12,
            bgcolor: '#2E5F8A',
            '&:hover': { bgcolor: '#1E4F7A' },
          }}
        >
          {saving ? 'Zapisuję...' : 'Zapisz konsultację'}
        </Button>
      </Paper>

      {/* A4 Canvas */}
      <Box
        sx={{
          flex: 1,
          overflow: 'auto',
          display: 'flex',
          justifyContent: 'center',
          bgcolor: isPrintMode ? '#FFF' : '#F0F2F5',
          py: isPrintMode ? 0 : 3,
          borderRadius: 2,
        }}
      >
        <Box
          sx={{
            width: A4_WIDTH,
            minHeight: 842,
            bgcolor: '#FFFFFF',
            boxShadow: isPrintMode ? 'none' : '0 4px 24px rgba(0,0,0,0.10)',
            borderRadius: isPrintMode ? 0 : '4px',
            transform: `scale(${scale})`,
            transformOrigin: 'top center',
            p: '12mm',
          }}
        >
          <DndContext sensors={sensors} collisionDetection={closestCenter}>
            <SortableContext items={blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
              {blocks.map((block, index) => (
                <SortableBlockWrapper
                  key={block.id}
                  block={block}
                  isSelected={false}
                  viewMode={viewMode}
                  onSelect={() => {}}
                  onMoveUp={() => {}}
                  onMoveDown={() => {}}
                  onDuplicate={() => {}}
                  onDelete={() => {}}
                  isFirst={index === 0}
                  isLast={index === blocks.length - 1}
                >
                  <BlockRenderer
                    block={block}
                    viewMode={viewMode}
                    onUpdateContent={(content) => updateBlockContent(block.id, content)}
                  />
                </SortableBlockWrapper>
              ))}
            </SortableContext>
          </DndContext>
        </Box>
      </Box>

      {/* Toast */}
      <Snackbar
        open={toast.open}
        autoHideDuration={3000}
        onClose={() => setToast({ ...toast, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={toast.severity} onClose={() => setToast({ ...toast, open: false })}>
          {toast.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export { deserializeDataToBlocks, serializeBlocksToData };
