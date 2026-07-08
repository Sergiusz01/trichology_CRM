// ============================================================
// BlockLibrary — Left panel with block categories and drag-to-add
// ============================================================

import { useState } from 'react';
import { Box, Typography, Tabs, Tab, Tooltip, IconButton } from '@mui/material';
import {
  Badge, Person, ContactPage, ReportProblem, QuestionAnswer, Biotech,
  Science, ContentCut, Assessment, MedicalInformation, Checklist,
  EventNote, StickyNote2, PhotoLibrary, Title, Notes, HorizontalRule,
  UnfoldMore, Add,
} from '@mui/icons-material';
import { BlockType, BlockCategory } from './types';
import { BLOCK_LIBRARY } from './defaultBlocks';

const ICON_MAP: Record<string, React.ElementType> = {
  Badge, Person, ContactPage, ReportProblem, QuestionAnswer, Biotech,
  Science, ContentCut, Assessment, MedicalInformation, Checklist,
  EventNote, StickyNote2, PhotoLibrary, Title, Notes, HorizontalRule,
  UnfoldMore,
};

const CATEGORY_LABELS: Record<string, string> = {
  general: 'Dane ogólne',
  problem: 'Problem i wywiad',
  clinical: 'Badanie kliniczne',
  diagnostics: 'Diagnostyka',
  treatment: 'Zalecenia i wizyta',
  media: 'Media',
  typography: 'Typografia',
  decorative: 'Ozdobne',
};

const TABS = [
  { value: 'content', label: 'Bloki treści' },
  { value: 'typo', label: 'Typografia' },
  { value: 'deco', label: 'Ozdobne' },
];

interface BlockLibraryProps {
  onAddBlock: (type: BlockType) => void;
}

export default function BlockLibrary({ onAddBlock }: BlockLibraryProps) {
  const [tab, setTab] = useState('content');

  const getItems = () => {
    if (tab === 'typo') return BLOCK_LIBRARY.filter((b) => b.category === 'typography');
    if (tab === 'deco') return BLOCK_LIBRARY.filter((b) => b.category === 'decorative');
    return BLOCK_LIBRARY.filter((b) => !['typography', 'decorative'].includes(b.category));
  };

  const items = getItems();

  // Group content blocks by category
  const grouped = tab === 'content'
    ? Object.entries(
        items.reduce((acc, item) => {
          const cat = item.category;
          if (!acc[cat]) acc[cat] = [];
          acc[cat].push(item);
          return acc;
        }, {} as Record<string, typeof items>)
      )
    : [['all', items] as [string, typeof items]];

  return (
    <Box
      sx={{
        width: 260,
        minWidth: 260,
        bgcolor: '#FFFFFF',
        borderRight: '1px solid #E2E8F0',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        flexShrink: 0,
      }}
    >
      {/* Tab header */}
      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        variant="fullWidth"
        sx={{
          minHeight: 36,
          borderBottom: '1px solid #E2E8F0',
          '& .MuiTab-root': { minHeight: 36, fontSize: 11, py: 0.5, textTransform: 'none' },
        }}
      >
        {TABS.map((t) => (
          <Tab key={t.value} value={t.value} label={t.label} />
        ))}
      </Tabs>

      {/* Block items */}
      <Box sx={{ flex: 1, overflow: 'auto', p: 1.5 }}>
        {grouped.map(([category, catItems]) => (
          <Box key={category} sx={{ mb: 2 }}>
            {tab === 'content' && (
              <Typography
                variant="caption"
                sx={{
                  display: 'block',
                  fontWeight: 700,
                  color: '#64748B',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  mb: 0.5,
                  fontSize: 10,
                }}
              >
                {CATEGORY_LABELS[category] || category}
              </Typography>
            )}

            {catItems.map((item) => {
              const IconComp = ICON_MAP[item.icon] || Notes;
              return (
                <Box
                  key={item.type}
                  onClick={() => onAddBlock(item.type)}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                    p: 1,
                    mb: 0.5,
                    borderRadius: '8px',
                    cursor: 'pointer',
                    border: '1px solid transparent',
                    transition: 'all 0.15s ease-out',
                    '&:hover': {
                      bgcolor: '#F8FAFC',
                      border: '1px solid #E2E8F0',
                      transform: 'translateX(2px)',
                    },
                    '&:active': {
                      bgcolor: '#F1F5F9',
                      transform: 'translateX(0)',
                    },
                  }}
                >
                  <Box
                    sx={{
                      width: 32,
                      height: 32,
                      borderRadius: '6px',
                      bgcolor: '#F0F7FF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <IconComp sx={{ fontSize: 16, color: '#2E5F8A' }} />
                  </Box>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ fontSize: 12, fontWeight: 600, color: '#0F172A', lineHeight: 1.3 }}>
                      {item.title}
                    </Typography>
                    <Typography sx={{ fontSize: 10, color: '#94A3B8', lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.description}
                    </Typography>
                  </Box>
                  <Tooltip title="Dodaj do karty">
                    <IconButton size="small" sx={{ ml: 'auto', opacity: 0.4, '&:hover': { opacity: 1 } }}>
                      <Add sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Tooltip>
                </Box>
              );
            })}
          </Box>
        ))}
      </Box>
    </Box>
  );
}
