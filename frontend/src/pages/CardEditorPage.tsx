// ============================================================
// CardEditorPage — Main visual drag-and-drop card editor page
// ============================================================

import { useState, useCallback } from 'react';
import { Box, Snackbar, Alert } from '@mui/material';
import { useParams } from 'react-router-dom';
import { useCardEditor } from '../components/card-editor/useCardEditor';
import EditorToolbar from '../components/card-editor/EditorToolbar';
import BlockLibrary from '../components/card-editor/BlockLibrary';
import EditorCanvas from '../components/card-editor/EditorCanvas';
import BlockProperties from '../components/card-editor/BlockProperties';
import NewCardWizard from '../components/card-editor/NewCardWizard';
import BrandingSettings from '../components/card-editor/BrandingSettings';
import { createTemplatePreset } from '../components/card-editor/defaultBlocks';
import { TemplatePreset, Branding, ViewMode, ZoomLevel, BlockType } from '../components/card-editor/types';

export default function CardEditorPage() {
  const { templateId } = useParams<{ templateId?: string }>();

  const editor = useCardEditor({ templateId });

  // Modal states
  const [wizardOpen, setWizardOpen] = useState(false);
  const [brandingOpen, setBrandingOpen] = useState(false);
  const [toast, setToast] = useState<{ open: boolean; message: string; severity: 'success' | 'info' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  // Handle new card creation from wizard
  const handleCreateCard = useCallback(
    (preset: TemplatePreset, branding: Branding, name: string) => {
      editor.loadPreset(preset);
      editor.setBranding(branding);
      editor.setTemplateName(name);
      setWizardOpen(false);
      setToast({ open: true, message: `Karta "${name}" utworzona!`, severity: 'success' });
    },
    [editor]
  );

  // Handle save
  const handleSave = useCallback(() => {
    editor.saveToLocalStorage();
    setToast({ open: true, message: `Zapisano o ${new Date().toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}`, severity: 'success' });
  }, [editor]);

  // Handle add block from library
  const handleAddBlock = useCallback(
    (type: BlockType) => {
      editor.addBlock(type);
    },
    [editor]
  );

  const isEditMode = editor.viewMode === 'edit';

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        width: '100vw',
        position: 'fixed',
        top: 0,
        left: 0,
        zIndex: 1200,
        bgcolor: '#F0F2F5',
      }}
    >
      {/* Top Toolbar */}
      <EditorToolbar
        viewMode={editor.viewMode}
        onViewModeChange={(mode: ViewMode) => editor.setViewMode(mode)}
        zoom={editor.zoom}
        onZoomChange={(z: ZoomLevel) => editor.setZoom(z)}
        canUndo={editor.canUndo}
        canRedo={editor.canRedo}
        onUndo={editor.undo}
        onRedo={editor.redo}
        onSave={handleSave}
        onNewCard={() => setWizardOpen(true)}
        onBranding={() => setBrandingOpen(true)}
        isDirty={editor.isDirty}
        lastSavedAt={editor.lastSavedAt}
        templateName={editor.templateName}
      />

      {/* Main content area: 3 panels */}
      <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Left panel: Block Library (edit mode only) */}
        {isEditMode && <BlockLibrary onAddBlock={handleAddBlock} />}

        {/* Center: A4 Canvas */}
        <EditorCanvas
          blocks={editor.blocks}
          selectedBlockId={editor.selectedBlockId}
          viewMode={editor.viewMode}
          zoom={editor.zoom}
          onSelectBlock={editor.selectBlock}
          onMoveBlock={editor.moveBlock}
          onDuplicateBlock={editor.duplicateBlock}
          onRemoveBlock={editor.removeBlock}
          onUpdateContent={editor.updateBlockContent}
        />

        {/* Right panel: Block Properties (edit mode only) */}
        {isEditMode && (
          <BlockProperties
            block={editor.selectedBlock}
            onUpdateStyle={editor.updateBlockStyle}
            onUpdateTitle={editor.updateBlockTitle}
            onClose={() => editor.selectBlock(null)}
          />
        )}
      </Box>

      {/* Modals */}
      <NewCardWizard
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        onCreateCard={handleCreateCard}
      />

      <BrandingSettings
        open={brandingOpen}
        onClose={() => setBrandingOpen(false)}
        branding={editor.branding}
        onSave={editor.setBranding}
      />

      {/* Toast notifications */}
      <Snackbar
        open={toast.open}
        autoHideDuration={3000}
        onClose={() => setToast({ ...toast, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setToast({ ...toast, open: false })}
          severity={toast.severity}
          sx={{ borderRadius: 2 }}
        >
          {toast.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
