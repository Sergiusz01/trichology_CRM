// ============================================================
// EditorCanvas — A4 canvas with drag-and-drop blocks
// ============================================================

import { useCallback } from 'react';
import { Box, Typography } from '@mui/material';
import {
  DndContext,
  closestCenter,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useState } from 'react';
import { CardBlock, ViewMode, ZoomLevel } from './types';
import SortableBlockWrapper from './SortableBlockWrapper';
import BlockRenderer from './BlockRenderer';

// A4 dimensions in pixels at 72 DPI
const A4_WIDTH = 595;
const A4_MIN_HEIGHT = 842;

interface EditorCanvasProps {
  blocks: CardBlock[];
  selectedBlockId: string | null;
  viewMode: ViewMode;
  zoom: ZoomLevel;
  onSelectBlock: (id: string | null) => void;
  onMoveBlock: (fromIndex: number, toIndex: number) => void;
  onDuplicateBlock: (id: string) => void;
  onRemoveBlock: (id: string) => void;
  onUpdateContent: (id: string, content: Record<string, any>) => void;
}

export default function EditorCanvas({
  blocks,
  selectedBlockId,
  viewMode,
  zoom,
  onSelectBlock,
  onMoveBlock,
  onDuplicateBlock,
  onRemoveBlock,
  onUpdateContent,
}: EditorCanvasProps) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveId(null);
      if (!over || active.id === over.id) return;
      const oldIndex = blocks.findIndex((b) => b.id === active.id);
      const newIndex = blocks.findIndex((b) => b.id === over.id);
      if (oldIndex >= 0 && newIndex >= 0) {
        onMoveBlock(oldIndex, newIndex);
      }
    },
    [blocks, onMoveBlock]
  );

  const scale = zoom / 100;
  const isPrintOrPreview = viewMode === 'print' || viewMode === 'preview';

  return (
    <Box
      sx={{
        flex: 1,
        overflow: 'auto',
        bgcolor: isPrintOrPreview ? '#FFFFFF' : '#F0F2F5',
        display: 'flex',
        justifyContent: 'center',
        py: isPrintOrPreview ? 0 : 4,
        px: 2,
        minHeight: 0,
      }}
      onClick={() => onSelectBlock(null)}
    >
      {/* A4 Canvas */}
      <Box
        sx={{
          width: A4_WIDTH,
          minHeight: A4_MIN_HEIGHT,
          bgcolor: '#FFFFFF',
          boxShadow: isPrintOrPreview ? 'none' : '0 4px 24px rgba(0,0,0,0.10)',
          borderRadius: isPrintOrPreview ? 0 : '4px',
          transform: `scale(${scale})`,
          transformOrigin: 'top center',
          position: 'relative',
          p: '12mm',
          // Dotted margin guides in edit mode
          ...(viewMode === 'edit' && {
            '&::before': {
              content: '""',
              position: 'absolute',
              top: '12mm',
              left: '12mm',
              right: '12mm',
              bottom: '12mm',
              border: '1px dashed rgba(0,0,0,0.06)',
              pointerEvents: 'none',
              zIndex: 0,
            },
          }),
        }}
      >
        {blocks.length === 0 && viewMode === 'edit' && (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: 300,
              color: '#94A3B8',
              gap: 1,
            }}
          >
            <Typography variant="h6" sx={{ color: 'inherit', fontWeight: 500 }}>
              Przeciągnij bloki z panelu po lewej
            </Typography>
            <Typography variant="body2" sx={{ color: 'inherit' }}>
              lub użyj przycisku „Nowa karta" w pasku narzędzi
            </Typography>
          </Box>
        )}

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={blocks.map((b) => b.id)}
            strategy={verticalListSortingStrategy}
          >
            {blocks.map((block, index) => (
              <SortableBlockWrapper
                key={block.id}
                block={block}
                isSelected={selectedBlockId === block.id}
                viewMode={viewMode}
                onSelect={onSelectBlock}
                onMoveUp={() => index > 0 && onMoveBlock(index, index - 1)}
                onMoveDown={() => index < blocks.length - 1 && onMoveBlock(index, index + 1)}
                onDuplicate={() => onDuplicateBlock(block.id)}
                onDelete={() => onRemoveBlock(block.id)}
                isFirst={index === 0}
                isLast={index === blocks.length - 1}
              >
                <BlockRenderer
                  block={block}
                  viewMode={viewMode}
                  onUpdateContent={(content) => onUpdateContent(block.id, content)}
                />
              </SortableBlockWrapper>
            ))}
          </SortableContext>
        </DndContext>
      </Box>
    </Box>
  );
}
