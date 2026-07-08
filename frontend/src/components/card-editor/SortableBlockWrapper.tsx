// ============================================================
// SortableBlockWrapper — drag handle, selection, actions overlay
// ============================================================

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Box, IconButton, Tooltip } from '@mui/material';
import {
  DragIndicator, ArrowUpward, ArrowDownward, ContentCopy, Delete,
} from '@mui/icons-material';
import { CardBlock, ViewMode } from './types';

interface SortableBlockWrapperProps {
  block: CardBlock;
  isSelected: boolean;
  viewMode: ViewMode;
  onSelect: (id: string) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  isFirst: boolean;
  isLast: boolean;
  children: React.ReactNode;
}

export default function SortableBlockWrapper({
  block,
  isSelected,
  viewMode,
  onSelect,
  onMoveUp,
  onMoveDown,
  onDuplicate,
  onDelete,
  isFirst,
  isLast,
  children,
}: SortableBlockWrapperProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.id, disabled: viewMode !== 'edit' || block.locked });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // In preview/print mode, render without any editor chrome
  if (viewMode === 'preview' || viewMode === 'print') {
    if (!block.style.printable && viewMode === 'print') return null;
    return (
      <Box
        sx={{
          bgcolor: block.style.backgroundColor,
          p: `${block.style.padding}px`,
          borderStyle: block.style.border.style === 'none' ? 'none' : 'solid',
          borderWidth: block.style.border.style === 'thick' ? 2 : block.style.border.style === 'double' ? 3 : 1,
          borderColor: block.style.border.color,
          borderRadius: `${block.style.border.radius}px`,
          boxShadow: block.style.shadow
            ? `0 2px ${block.style.shadowIntensity / 5}px rgba(0,0,0,${block.style.shadowIntensity / 500})`
            : 'none',
        }}
      >
        {children}
      </Box>
    );
  }

  // Fill mode — render with subtle styling but no drag controls
  if (viewMode === 'fill') {
    return (
      <Box
        sx={{
          bgcolor: block.style.backgroundColor,
          p: `${block.style.padding}px`,
          mb: '2px',
          borderRadius: `${block.style.border.radius}px`,
          border: '1px solid transparent',
          '&:hover': { border: '1px solid #E2E8F0' },
        }}
      >
        {children}
      </Box>
    );
  }

  // Edit mode — full editor chrome
  return (
    <Box
      ref={setNodeRef}
      style={style}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(block.id);
      }}
      sx={{
        position: 'relative',
        mb: '2px',
        bgcolor: block.style.backgroundColor,
        p: `${block.style.padding}px`,
        borderStyle: isSelected ? 'solid' : block.style.border.style === 'none' ? 'none' : 'solid',
        borderWidth: isSelected ? 2 : block.style.border.style === 'thick' ? 2 : 1,
        borderColor: isSelected ? '#2E5F8A' : block.style.border.color,
        borderRadius: `${block.style.border.radius}px`,
        boxShadow: block.style.shadow
          ? `0 2px ${block.style.shadowIntensity / 5}px rgba(0,0,0,${block.style.shadowIntensity / 500})`
          : 'none',
        cursor: 'pointer',
        transition: 'border-color 0.15s ease-out, box-shadow 0.15s ease-out',
        '&:hover': {
          borderColor: isSelected ? '#2E5F8A' : '#94A3B8',
          '& .block-actions': { opacity: 1 },
          '& .drag-handle': { opacity: 1 },
        },
      }}
    >
      {/* Drag handle (left edge) */}
      {!block.locked && (
        <Box
          className="drag-handle"
          {...attributes}
          {...listeners}
          sx={{
            position: 'absolute',
            left: -28,
            top: '50%',
            transform: 'translateY(-50%)',
            opacity: 0,
            transition: 'opacity 0.15s',
            cursor: 'grab',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 24,
            height: 32,
            borderRadius: '4px',
            bgcolor: '#F1F5F9',
            '&:hover': { bgcolor: '#E2E8F0' },
            '&:active': { cursor: 'grabbing' },
          }}
        >
          <DragIndicator sx={{ fontSize: 16, color: '#64748B' }} />
        </Box>
      )}

      {/* Action buttons (top-right) */}
      <Box
        className="block-actions"
        sx={{
          position: 'absolute',
          top: -1,
          right: -1,
          display: 'flex',
          gap: 0,
          opacity: 0,
          transition: 'opacity 0.15s',
          bgcolor: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: '0 0 0 6px',
          overflow: 'hidden',
          zIndex: 10,
        }}
      >
        <Tooltip title="W górę" placement="top">
          <span>
            <IconButton
              size="small"
              onClick={(e) => { e.stopPropagation(); onMoveUp(); }}
              disabled={isFirst || block.locked}
              sx={{ borderRadius: 0, px: 0.5 }}
            >
              <ArrowUpward sx={{ fontSize: 15 }} />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title="W dół" placement="top">
          <span>
            <IconButton
              size="small"
              onClick={(e) => { e.stopPropagation(); onMoveDown(); }}
              disabled={isLast || block.locked}
              sx={{ borderRadius: 0, px: 0.5 }}
            >
              <ArrowDownward sx={{ fontSize: 15 }} />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title="Duplikuj" placement="top">
          <IconButton
            size="small"
            onClick={(e) => { e.stopPropagation(); onDuplicate(); }}
            sx={{ borderRadius: 0, px: 0.5 }}
          >
            <ContentCopy sx={{ fontSize: 15 }} />
          </IconButton>
        </Tooltip>
        {!block.locked && (
          <Tooltip title="Usuń" placement="top">
            <IconButton
              size="small"
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              sx={{ borderRadius: 0, px: 0.5, color: '#EF4444' }}
            >
              <Delete sx={{ fontSize: 15 }} />
            </IconButton>
          </Tooltip>
        )}
      </Box>

      {/* Block content */}
      {children}
    </Box>
  );
}
