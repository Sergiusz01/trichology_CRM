// ============================================================
// useCardEditor — Custom hook managing the entire editor state
// ============================================================

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  CardBlock,
  CardTemplate,
  Branding,
  ViewMode,
  ZoomLevel,
  BlockStyle,
  DEFAULT_BRANDING,
  DEFAULT_BLOCK_STYLE,
  HistoryEntry,
  BlockType,
} from './types';
import { createBlock, createTemplatePreset } from './defaultBlocks';

const MAX_HISTORY = 50;
const AUTOSAVE_INTERVAL = 30_000; // 30 seconds
const LS_KEY = 'cardEditor_autosave';

interface UseCardEditorOptions {
  templateId?: string;
  onSaveSuccess?: () => void;
}

export function useCardEditor(options: UseCardEditorOptions = {}) {
  // ── State ──────────────────────────────────────────────────
  const [blocks, setBlocks] = useState<CardBlock[]>(() => {
    // Try restore from localStorage
    try {
      const saved = localStorage.getItem(LS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.blocks?.length > 0) return parsed.blocks;
      }
    } catch { /* ignore */ }
    return createTemplatePreset('full');
  });

  const [templateName, setTemplateName] = useState('Nowa karta konsultacyjna');
  const [templateId, setTemplateId] = useState<string | undefined>(options.templateId);
  const [branding, setBranding] = useState<Branding>(() => {
    try {
      const saved = localStorage.getItem(LS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.branding) return parsed.branding;
      }
    } catch { /* ignore */ }
    return { ...DEFAULT_BRANDING };
  });

  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('edit');
  const [zoom, setZoom] = useState<ZoomLevel>(75);

  // ── History (undo/redo) ────────────────────────────────────
  const [history, setHistory] = useState<HistoryEntry[]>([
    { blocks: JSON.parse(JSON.stringify(blocks)), timestamp: Date.now() },
  ]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const skipHistoryRef = useRef(false);

  const [isDirty, setIsDirty] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);

  // Push to history whenever blocks change (unless skipping)
  useEffect(() => {
    if (skipHistoryRef.current) {
      skipHistoryRef.current = false;
      return;
    }
    setHistory((prev) => {
      const truncated = prev.slice(0, historyIndex + 1);
      const entry: HistoryEntry = {
        blocks: JSON.parse(JSON.stringify(blocks)),
        timestamp: Date.now(),
      };
      const next = [...truncated, entry].slice(-MAX_HISTORY);
      setHistoryIndex(next.length - 1);
      return next;
    });
    setIsDirty(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blocks]);

  // ── Autosave ───────────────────────────────────────────────
  useEffect(() => {
    const interval = setInterval(() => {
      if (isDirty) {
        try {
          localStorage.setItem(
            LS_KEY,
            JSON.stringify({ blocks, branding, templateName, templateId })
          );
          const now = new Date().toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
          setLastSavedAt(now);
          setIsDirty(false);
        } catch { /* storage full */ }
      }
    }, AUTOSAVE_INTERVAL);
    return () => clearInterval(interval);
  }, [blocks, branding, templateName, templateId, isDirty]);

  // ── Actions ────────────────────────────────────────────────

  const addBlock = useCallback((type: BlockType, atIndex?: number) => {
    const idx = atIndex ?? blocks.length;
    const newBlock = createBlock(type, idx);
    setBlocks((prev) => {
      const next = [...prev];
      next.splice(idx, 0, newBlock);
      return next.map((b, i) => ({ ...b, order: i }));
    });
    setSelectedBlockId(newBlock.id);
    return newBlock;
  }, [blocks.length]);

  const removeBlock = useCallback((blockId: string) => {
    setBlocks((prev) => {
      const block = prev.find((b) => b.id === blockId);
      if (block?.locked) return prev;
      return prev.filter((b) => b.id !== blockId).map((b, i) => ({ ...b, order: i }));
    });
    if (selectedBlockId === blockId) setSelectedBlockId(null);
  }, [selectedBlockId]);

  const moveBlock = useCallback((fromIndex: number, toIndex: number) => {
    setBlocks((prev) => {
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next.map((b, i) => ({ ...b, order: i }));
    });
  }, []);

  const duplicateBlock = useCallback((blockId: string) => {
    setBlocks((prev) => {
      const idx = prev.findIndex((b) => b.id === blockId);
      if (idx < 0) return prev;
      const original = prev[idx];
      const clone: CardBlock = {
        ...JSON.parse(JSON.stringify(original)),
        id: `block_${Date.now()}_dup`,
        locked: false,
        order: idx + 1,
      };
      const next = [...prev];
      next.splice(idx + 1, 0, clone);
      return next.map((b, i) => ({ ...b, order: i }));
    });
  }, []);

  const updateBlockContent = useCallback((blockId: string, contentPatch: Record<string, any>) => {
    setBlocks((prev) =>
      prev.map((b) =>
        b.id === blockId ? { ...b, content: { ...b.content, ...contentPatch } } : b
      )
    );
  }, []);

  const updateBlockStyle = useCallback((blockId: string, stylePatch: Partial<BlockStyle>) => {
    setBlocks((prev) =>
      prev.map((b) =>
        b.id === blockId ? { ...b, style: { ...b.style, ...stylePatch } } : b
      )
    );
  }, []);

  const updateBlockTitle = useCallback((blockId: string, title: string) => {
    setBlocks((prev) =>
      prev.map((b) => (b.id === blockId ? { ...b, title } : b))
    );
  }, []);

  // ── Undo / Redo ────────────────────────────────────────────

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  const undo = useCallback(() => {
    if (!canUndo) return;
    const newIndex = historyIndex - 1;
    skipHistoryRef.current = true;
    setBlocks(JSON.parse(JSON.stringify(history[newIndex].blocks)));
    setHistoryIndex(newIndex);
  }, [canUndo, history, historyIndex]);

  const redo = useCallback(() => {
    if (!canRedo) return;
    const newIndex = historyIndex + 1;
    skipHistoryRef.current = true;
    setBlocks(JSON.parse(JSON.stringify(history[newIndex].blocks)));
    setHistoryIndex(newIndex);
  }, [canRedo, history, historyIndex]);

  // ── Select block ───────────────────────────────────────────

  const selectBlock = useCallback((blockId: string | null) => {
    setSelectedBlockId(blockId);
  }, []);

  const selectedBlock = blocks.find((b) => b.id === selectedBlockId) || null;

  // ── Load template preset ──────────────────────────────────

  const loadPreset = useCallback((preset: 'full' | 'short' | 'control' | 'premium' | 'blank') => {
    const newBlocks = createTemplatePreset(preset);
    setBlocks(newBlocks);
    setSelectedBlockId(null);
    setHistory([{ blocks: JSON.parse(JSON.stringify(newBlocks)), timestamp: Date.now() }]);
    setHistoryIndex(0);
  }, []);

  // ── Reset / new card ──────────────────────────────────────

  const resetEditor = useCallback(() => {
    setBlocks(createTemplatePreset('full'));
    setSelectedBlockId(null);
    setBranding({ ...DEFAULT_BRANDING });
    setTemplateName('Nowa karta konsultacyjna');
    setTemplateId(undefined);
    setHistory([{ blocks: JSON.parse(JSON.stringify(createTemplatePreset('full'))), timestamp: Date.now() }]);
    setHistoryIndex(0);
    setIsDirty(false);
    localStorage.removeItem(LS_KEY);
  }, []);

  // ── Manual save ───────────────────────────────────────────

  const saveToLocalStorage = useCallback(() => {
    try {
      localStorage.setItem(
        LS_KEY,
        JSON.stringify({ blocks, branding, templateName, templateId })
      );
      const now = new Date().toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
      setLastSavedAt(now);
      setIsDirty(false);
    } catch { /* storage full */ }
  }, [blocks, branding, templateName, templateId]);

  // ── Keyboard shortcuts ────────────────────────────────────

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const isCtrl = e.ctrlKey || e.metaKey;

      if (isCtrl && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
      if (isCtrl && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        redo();
      }
      if (isCtrl && e.key === 's') {
        e.preventDefault();
        saveToLocalStorage();
      }
      if (e.key === 'Delete' && selectedBlockId && viewMode === 'edit') {
        const block = blocks.find((b) => b.id === selectedBlockId);
        if (block && !block.locked) {
          e.preventDefault();
          removeBlock(selectedBlockId);
        }
      }
      if (e.key === 'Escape') {
        setSelectedBlockId(null);
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [undo, redo, saveToLocalStorage, selectedBlockId, viewMode, blocks, removeBlock]);

  // ── Return ─────────────────────────────────────────────────

  return {
    // State
    blocks,
    setBlocks,
    templateName,
    setTemplateName,
    templateId,
    branding,
    setBranding,
    selectedBlockId,
    selectedBlock,
    viewMode,
    setViewMode,
    zoom,
    setZoom,
    isDirty,
    lastSavedAt,
    canUndo,
    canRedo,

    // Actions
    addBlock,
    removeBlock,
    moveBlock,
    duplicateBlock,
    updateBlockContent,
    updateBlockStyle,
    updateBlockTitle,
    selectBlock,
    undo,
    redo,
    loadPreset,
    resetEditor,
    saveToLocalStorage,
  };
}
