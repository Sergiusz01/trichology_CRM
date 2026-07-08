// ============================================================
// BlockRenderer — Dispatches rendering to type-specific components
// ============================================================

import { Box, Typography, TextField, Divider } from '@mui/material';
import { CardBlock, ViewMode } from './types';

interface BlockRendererProps {
  block: CardBlock;
  viewMode: ViewMode;
  onUpdateContent: (content: Record<string, any>) => void;
}

// ── Shared UI helpers ──────────────────────────────────────

/** Checkbox row: □ label □ label □ label ... */
function CheckboxRow({
  label,
  options,
  selected = [],
  viewMode,
  onChange,
}: {
  label: string;
  options: string[];
  selected?: string[];
  viewMode: ViewMode;
  onChange?: (selected: string[]) => void;
}) {
  const isFillable = viewMode === 'fill';

  const toggle = (opt: string) => {
    if (!onChange) return;
    const next = selected.includes(opt)
      ? selected.filter((s) => s !== opt)
      : [...selected, opt];
    onChange(next);
  };

  return (
    <Box sx={{ mb: 0.5 }}>
      {label && (
        <Typography
          component="span"
          sx={{ fontSize: 9, fontWeight: 600, mr: 0.5, display: 'inline' }}
        >
          {label}:
        </Typography>
      )}
      {options.map((opt) => {
        const isChecked = selected.includes(opt);
        return (
          <Typography
            key={opt}
            component="span"
            onClick={isFillable ? () => toggle(opt) : undefined}
            sx={{
              fontSize: 8.5,
              mr: 0.8,
              cursor: isFillable ? 'pointer' : 'default',
              userSelect: isFillable ? 'none' : 'auto',
              '&:hover': isFillable ? { color: '#2E5F8A' } : {},
            }}
          >
            {isChecked ? '■' : '□'} {opt}
          </Typography>
        );
      })}
    </Box>
  );
}

/** Dotted text line (for print/preview) */
function DottedLine({ label, value }: { label: string; value?: string }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'baseline', mb: 0.3, fontSize: 9 }}>
      <Typography component="span" sx={{ fontSize: 9, fontWeight: 500, mr: 0.5, whiteSpace: 'nowrap' }}>
        {label}:
      </Typography>
      <Box
        sx={{
          flex: 1,
          borderBottom: '1px dotted #999',
          minWidth: 60,
          fontSize: 9,
          pl: 0.5,
          color: '#333',
        }}
      >
        {value || '\u00A0'}
      </Box>
    </Box>
  );
}

// ── Block type renderers ────────────────────────────────────

function renderHeader(block: CardBlock, viewMode: ViewMode, onUpdate: (c: Record<string, any>) => void) {
  const c = block.content;
  return (
    <Box sx={{ textAlign: 'center', borderBottom: c.separatorStyle === 'none' ? 'none' : `${c.separatorStyle === 'thick' ? 2 : 1}px solid #000`, pb: 1 }}>
      {c.logoUrl && (
        <Box component="img" src={c.logoUrl} alt="Logo" sx={{ maxHeight: 48, mb: 0.5, display: 'block', mx: c.logoAlign === 'center' ? 'auto' : c.logoAlign === 'right' ? '0 0 0 auto' : 0 }} />
      )}
      <Typography sx={{ fontSize: 14, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {c.title || 'KARTA KONSULTACYJNA'}
      </Typography>
      {c.showDate && (
        <Typography sx={{ fontSize: 8, color: '#666', mt: 0.5 }}>
          Data konsultacji: ………………………………
        </Typography>
      )}
    </Box>
  );
}

function renderPatientData(block: CardBlock, viewMode: ViewMode, onUpdate: (c: Record<string, any>) => void) {
  const fields = block.content.fields || [];
  return (
    <Box>
      <Typography sx={{ fontSize: 10, fontWeight: 700, textDecoration: 'underline', mb: 1, textTransform: 'uppercase' }}>
        DANE PACJENTA
      </Typography>
      {fields.filter((f: any) => f.visible).sort((a: any, b: any) => a.order - b.order).map((field: any) => {
        if (field.key === 'gender') {
          return (
            <Box key={field.id} sx={{ display: 'flex', alignItems: 'baseline', mb: 0.3, fontSize: 9 }}>
              <Typography component="span" sx={{ fontSize: 9, fontWeight: 500, mr: 1 }}>
                Płeć:
              </Typography>
              <Typography component="span" sx={{ fontSize: 9, mr: 1 }}>□ K</Typography>
              <Typography component="span" sx={{ fontSize: 9 }}>□ M</Typography>
            </Box>
          );
        }
        return <DottedLine key={field.id} label={field.label} />;
      })}
    </Box>
  );
}

function renderProblem(block: CardBlock, viewMode: ViewMode, onUpdate: (c: Record<string, any>) => void) {
  const subs = block.content.subsections || [];
  return (
    <Box>
      <Typography sx={{ fontSize: 10, fontWeight: 700, textDecoration: 'underline', mb: 1, textTransform: 'uppercase' }}>
        PROBLEM
      </Typography>
      {subs.map((sub: any) => (
        <Box key={sub.id} sx={{ mb: 1 }}>
          <Typography sx={{ fontSize: 9.5, fontWeight: 700, mb: 0.3 }}>{sub.title}</Typography>
          {sub.fields.map((field: any) => {
            if (field.type === 'checkbox_row') {
              return (
                <CheckboxRow
                  key={field.id}
                  label={field.label}
                  options={field.options}
                  selected={field.selected || []}
                  viewMode={viewMode}
                  onChange={viewMode === 'fill' ? (sel) => {
                    const newSubs = JSON.parse(JSON.stringify(subs));
                    const s = newSubs.find((ss: any) => ss.id === sub.id);
                    const f = s?.fields.find((ff: any) => ff.id === field.id);
                    if (f) f.selected = sel;
                    onUpdate({ subsections: newSubs });
                  } : undefined}
                />
              );
            }
            if (field.type === 'text' || field.type === 'textarea') {
              if (viewMode === 'fill') {
                return (
                  <TextField
                    key={field.id}
                    fullWidth
                    size="small"
                    label={field.label || undefined}
                    value={field.value || ''}
                    multiline={field.type === 'textarea'}
                    rows={field.rows || 2}
                    onChange={(e) => {
                      const newSubs = JSON.parse(JSON.stringify(subs));
                      const s = newSubs.find((ss: any) => ss.id === sub.id);
                      const f = s?.fields.find((ff: any) => ff.id === field.id);
                      if (f) f.value = e.target.value;
                      onUpdate({ subsections: newSubs });
                    }}
                    sx={{ mb: 0.5, '& .MuiInputBase-input': { fontSize: 9 } }}
                  />
                );
              }
              return <DottedLine key={field.id} label={field.label || '…'} value={field.value} />;
            }
            return null;
          })}
        </Box>
      ))}
    </Box>
  );
}

function renderInterview(block: CardBlock, viewMode: ViewMode, onUpdate: (c: Record<string, any>) => void) {
  const questions = block.content.questions || [];
  return (
    <Box>
      <Typography sx={{ fontSize: 10, fontWeight: 700, textDecoration: 'underline', mb: 1, textTransform: 'uppercase' }}>
        WYWIAD
      </Typography>
      {questions.filter((q: any) => q.visible !== false).map((q: any) => (
        <Box key={q.id} sx={{ mb: 0.5 }}>
          <Typography component="span" sx={{ fontSize: 9, fontWeight: 500 }}>
            {q.number}. {q.text}
          </Typography>
          {q.type === 'yesno' && (
            <Typography component="span" sx={{ fontSize: 8.5, ml: 1 }}>
              □ tak □ nie
            </Typography>
          )}
          {q.type === 'yesno_with_text' && (
            <>
              <Typography component="span" sx={{ fontSize: 8.5, ml: 1 }}>
                □ tak □ nie
              </Typography>
              {q.textLabel && (
                <Box sx={{ pl: 2 }}>
                  <DottedLine label={q.textLabel} value={q.textValue} />
                </Box>
              )}
            </>
          )}
          {q.type === 'text' && q.textLabel && (
            <Box sx={{ pl: 2 }}>
              <DottedLine label={q.textLabel} value={q.textValue} />
            </Box>
          )}
          {q.type === 'multi_checkbox' && q.options && (
            <Box sx={{ pl: 2, mt: 0.2 }}>
              <CheckboxRow label="" options={q.options.map((o: any) => o.label)} selected={[]} viewMode={viewMode} />
            </Box>
          )}
        </Box>
      ))}
    </Box>
  );
}

function renderTrichoscopy(block: CardBlock, viewMode: ViewMode, onUpdate: (c: Record<string, any>) => void) {
  const subs = block.content.subsections || [];
  return (
    <Box>
      <Typography sx={{ fontSize: 10, fontWeight: 700, textDecoration: 'underline', mb: 1, textTransform: 'uppercase' }}>
        TRICHOSKOPIA
      </Typography>
      {subs.map((sub: any) => (
        <Box key={sub.id} sx={{ mb: 1 }}>
          <Typography sx={{ fontSize: 9, fontWeight: 700, mb: 0.3, textTransform: 'uppercase' }}>{sub.title}</Typography>
          {sub.fields.map((field: any) => {
            if (field.type === 'checkbox_row') {
              return <CheckboxRow key={field.id} label={field.label} options={field.options} selected={[]} viewMode={viewMode} />;
            }
            return <DottedLine key={field.id} label={field.label} value={field.value} />;
          })}
        </Box>
      ))}
    </Box>
  );
}

function renderLabDiagnostics(block: CardBlock, viewMode: ViewMode, onUpdate: (c: Record<string, any>) => void) {
  const groups = block.content.groups || [];
  return (
    <Box>
      <Typography sx={{ fontSize: 10, fontWeight: 700, textDecoration: 'underline', mb: 1, textTransform: 'uppercase' }}>
        DIAGNOSTYKA LABORATORYJNA
      </Typography>
      <Box sx={{ fontSize: 8, mb: 0.5, color: '#666' }}>Data: ………………</Box>
      <Box sx={{ columns: 2, columnGap: '16px' }}>
        {groups.map((group: any) => (
          <Box key={group.id} sx={{ breakInside: 'avoid', mb: 1 }}>
            <Typography sx={{ fontSize: 8, fontWeight: 700, mb: 0.3, color: '#333', textTransform: 'uppercase' }}>{group.title}</Typography>
            {group.fields.map((f: any) => (
              <Box key={f.id} sx={{ display: 'flex', alignItems: 'baseline', mb: 0.1 }}>
                <Typography component="span" sx={{ fontSize: 7.5, fontWeight: 500, mr: 0.3, whiteSpace: 'nowrap' }}>{f.label}:</Typography>
                <Box sx={{ flex: 1, borderBottom: '1px dotted #bbb', fontSize: 7.5 }}>{'\u00A0'}</Box>
              </Box>
            ))}
          </Box>
        ))}
      </Box>
    </Box>
  );
}

function renderAlopecia(block: CardBlock, viewMode: ViewMode, onUpdate: (c: Record<string, any>) => void) {
  const c = block.content;
  return (
    <Box>
      <Typography sx={{ fontSize: 10, fontWeight: 700, textDecoration: 'underline', mb: 1, textTransform: 'uppercase' }}>
        DIAGNOSTYKA ŁYSIENIA
      </Typography>
      {c.types && <CheckboxRow label={c.types.label} options={c.types.options} selected={[]} viewMode={viewMode} />}
      {c.thinning && <CheckboxRow label={c.thinning.label} options={c.thinning.options} selected={[]} viewMode={viewMode} />}
      {c.miniaturization && <CheckboxRow label={c.miniaturization.label} options={c.miniaturization.options} selected={[]} viewMode={viewMode} />}
      {c.follicularUnits && <CheckboxRow label={c.follicularUnits.label} options={c.follicularUnits.options} selected={[]} viewMode={viewMode} />}
      {c.pullTest && <CheckboxRow label={c.pullTest.label} options={c.pullTest.options} selected={[]} viewMode={viewMode} />}
      <DottedLine label="Inne" />
    </Box>
  );
}

function renderDiagnosis(block: CardBlock, viewMode: ViewMode, onUpdate: (c: Record<string, any>) => void) {
  const rows = block.content.rows || 6;
  return (
    <Box>
      <Typography sx={{ fontSize: 10, fontWeight: 700, textDecoration: 'underline', mb: 1, textTransform: 'uppercase' }}>
        ROZPOZNANIE
      </Typography>
      {viewMode === 'fill' ? (
        <TextField
          fullWidth
          multiline
          rows={rows}
          value={block.content.text || ''}
          onChange={(e) => onUpdate({ text: e.target.value })}
          sx={{ '& .MuiInputBase-input': { fontSize: 9 } }}
        />
      ) : (
        <Box>
          {Array.from({ length: rows }).map((_, i) => (
            <Box key={i} sx={{ borderBottom: '1px dotted #999', height: 18, mb: 0.3 }}>
              {i === 0 && block.content.text && (
                <Typography sx={{ fontSize: 9 }}>{block.content.text}</Typography>
              )}
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
}

function renderRecommendations(block: CardBlock, viewMode: ViewMode, onUpdate: (c: Record<string, any>) => void) {
  const fields = [
    { key: 'washing', label: 'Preparaty do mycia' },
    { key: 'topical', label: 'Preparaty do wcierania' },
    { key: 'supplements', label: 'Suplementacja' },
    { key: 'behaviorChanges', label: 'Zmiany w pielęgnacji' },
  ];
  return (
    <Box>
      <Typography sx={{ fontSize: 10, fontWeight: 700, textDecoration: 'underline', mb: 1, textTransform: 'uppercase' }}>
        ZALECENIA DO PIELĘGNACJI
      </Typography>
      {fields.map((f) => (
        <Box key={f.key} sx={{ mb: 0.5 }}>
          {viewMode === 'fill' ? (
            <TextField
              fullWidth
              size="small"
              label={f.label}
              value={block.content[f.key] || ''}
              multiline
              rows={2}
              onChange={(e) => onUpdate({ [f.key]: e.target.value })}
              sx={{ '& .MuiInputBase-input': { fontSize: 9 } }}
            />
          ) : (
            <DottedLine label={f.label} value={block.content[f.key]} />
          )}
        </Box>
      ))}
    </Box>
  );
}

function renderVisits(block: CardBlock, viewMode: ViewMode, onUpdate: (c: Record<string, any>) => void) {
  const rows = block.content.rows || 12;
  return (
    <Box>
      <Typography sx={{ fontSize: 10, fontWeight: 700, textDecoration: 'underline', mb: 1, textTransform: 'uppercase' }}>
        WIZYTY / ZABIEGI
      </Typography>
      {viewMode === 'fill' ? (
        <TextField fullWidth multiline rows={rows} value={block.content.text || ''} onChange={(e) => onUpdate({ text: e.target.value })} sx={{ '& .MuiInputBase-input': { fontSize: 9 } }} />
      ) : (
        Array.from({ length: rows }).map((_, i) => (
          <Box key={i} sx={{ borderBottom: '1px dotted #999', height: 16, mb: 0.2 }} />
        ))
      )}
    </Box>
  );
}

function renderNotes(block: CardBlock, viewMode: ViewMode, onUpdate: (c: Record<string, any>) => void) {
  const rows = block.content.rows || 5;
  return (
    <Box>
      <Typography sx={{ fontSize: 10, fontWeight: 700, textDecoration: 'underline', mb: 1, textTransform: 'uppercase' }}>
        UWAGI
      </Typography>
      {viewMode === 'fill' ? (
        <TextField fullWidth multiline rows={rows} value={block.content.text || ''} onChange={(e) => onUpdate({ text: e.target.value })} sx={{ '& .MuiInputBase-input': { fontSize: 9 } }} />
      ) : (
        Array.from({ length: rows }).map((_, i) => (
          <Box key={i} sx={{ borderBottom: '1px dotted #999', height: 16, mb: 0.2 }} />
        ))
      )}
    </Box>
  );
}

function renderScales(block: CardBlock, viewMode: ViewMode, onUpdate: (c: Record<string, any>) => void) {
  const { norwood, ludwig } = block.content;
  const isFillable = viewMode === 'fill';

  const renderScale = (scale: any, scaleKey: string) => {
    if (!scale?.visible) return null;
    return (
      <Box sx={{ mb: 2 }}>
        <Typography sx={{ fontSize: 10, fontWeight: 700, mb: 0.5, textTransform: 'uppercase' }}>
          {scale.title}
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
          {scale.stages.map((stage: string) => (
            <Box
              key={stage}
              onClick={isFillable ? () => {
                const newContent = JSON.parse(JSON.stringify(block.content));
                newContent[scaleKey].selected = newContent[scaleKey].selected === stage ? null : stage;
                onUpdate(newContent);
              } : undefined}
              sx={{
                width: 36,
                height: 28,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: scale.selected === stage ? '2px solid #2E5F8A' : '1px solid #ccc',
                borderRadius: '4px',
                fontSize: 8,
                fontWeight: scale.selected === stage ? 700 : 400,
                bgcolor: scale.selected === stage ? '#E8F0FE' : '#fff',
                cursor: isFillable ? 'pointer' : 'default',
                transition: 'all 0.15s',
                '&:hover': isFillable ? { borderColor: '#2E5F8A', bgcolor: '#F0F7FF' } : {},
              }}
            >
              {stage}
            </Box>
          ))}
        </Box>
      </Box>
    );
  };

  return (
    <Box>
      {renderScale(norwood, 'norwood')}
      {renderScale(ludwig, 'ludwig')}
    </Box>
  );
}

function renderPhotos(block: CardBlock, viewMode: ViewMode, onUpdate: (c: Record<string, any>) => void) {
  const grid = block.content.grid === '3x3' ? 3 : 2;
  return (
    <Box>
      <Typography sx={{ fontSize: 10, fontWeight: 700, textDecoration: 'underline', mb: 1, textTransform: 'uppercase' }}>
        ZDJĘCIA TRICHOSKOPOWE
      </Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: `repeat(${grid}, 1fr)`, gap: 1 }}>
        {Array.from({ length: grid * grid }).map((_, i) => (
          <Box
            key={i}
            sx={{
              aspectRatio: '4/3',
              border: '1px dashed #CBD5E1',
              borderRadius: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 8,
              color: '#94A3B8',
              bgcolor: '#F8FAFC',
            }}
          >
            Zdjęcie {i + 1}
          </Box>
        ))}
      </Box>
    </Box>
  );
}

function renderFooter(block: CardBlock, viewMode: ViewMode, onUpdate: (c: Record<string, any>) => void) {
  return (
    <Box sx={{ borderTop: '1px solid #000', pt: 1, mt: 2 }}>
      <Typography sx={{ fontSize: 7.5, textAlign: 'center', color: '#666' }}>
        Tricho Diagnostic — Gabinet Trychologiczno-Kosmetyczny
      </Typography>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
        <Box sx={{ borderTop: '1px solid #333', width: '40%', pt: 0.5 }}>
          <Typography sx={{ fontSize: 7, textAlign: 'center', color: '#666' }}>Podpis lekarza</Typography>
        </Box>
        <Box sx={{ borderTop: '1px solid #333', width: '40%', pt: 0.5 }}>
          <Typography sx={{ fontSize: 7, textAlign: 'center', color: '#666' }}>Podpis pacjenta</Typography>
        </Box>
      </Box>
    </Box>
  );
}

function renderHeading(block: CardBlock) {
  const level = block.content.level || 'h2';
  const sizes = { h1: 14, h2: 11, h3: 9.5 };
  return (
    <Typography sx={{ fontSize: sizes[level as keyof typeof sizes], fontWeight: 700, textTransform: 'uppercase', textAlign: 'center' }}>
      {block.content.text || 'Nagłówek'}
    </Typography>
  );
}

function renderSeparator(block: CardBlock) {
  const sStyle = block.content.style || 'solid';
  return (
    <Box sx={{ py: 0.5 }}>
      {block.content.text ? (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ flex: 1, borderBottom: `1px ${sStyle} #999` }} />
          <Typography sx={{ fontSize: 8, color: '#666', whiteSpace: 'nowrap', px: 1 }}>{block.content.text}</Typography>
          <Box sx={{ flex: 1, borderBottom: `1px ${sStyle} #999` }} />
        </Box>
      ) : (
        <Divider sx={{ borderStyle: sStyle }} />
      )}
    </Box>
  );
}

function renderSpacer(block: CardBlock) {
  return <Box sx={{ height: block.content.height || 24 }} />;
}

function renderTextBlock(block: CardBlock, viewMode: ViewMode, onUpdate: (c: Record<string, any>) => void) {
  if (viewMode === 'fill' || viewMode === 'edit') {
    return (
      <TextField
        fullWidth
        multiline
        rows={3}
        value={block.content.text || ''}
        onChange={(e) => onUpdate({ text: e.target.value })}
        placeholder="Wpisz tekst..."
        sx={{ '& .MuiInputBase-input': { fontSize: 9 } }}
      />
    );
  }
  return <Typography sx={{ fontSize: 9 }}>{block.content.text || ''}</Typography>;
}

// ── Main dispatcher ─────────────────────────────────────────

export default function BlockRenderer({ block, viewMode, onUpdateContent }: BlockRendererProps) {
  switch (block.type) {
    case 'HEADER': return renderHeader(block, viewMode, onUpdateContent);
    case 'PATIENT_DATA': return renderPatientData(block, viewMode, onUpdateContent);
    case 'PROBLEM': return renderProblem(block, viewMode, onUpdateContent);
    case 'INTERVIEW': return renderInterview(block, viewMode, onUpdateContent);
    case 'TRICHOSCOPY': return renderTrichoscopy(block, viewMode, onUpdateContent);
    case 'LAB_DIAGNOSTICS': return renderLabDiagnostics(block, viewMode, onUpdateContent);
    case 'ALOPECIA': return renderAlopecia(block, viewMode, onUpdateContent);
    case 'DIAGNOSIS': return renderDiagnosis(block, viewMode, onUpdateContent);
    case 'RECOMMENDATIONS': return renderRecommendations(block, viewMode, onUpdateContent);
    case 'VISITS': return renderVisits(block, viewMode, onUpdateContent);
    case 'NOTES': return renderNotes(block, viewMode, onUpdateContent);
    case 'SCALES': return renderScales(block, viewMode, onUpdateContent);
    case 'PHOTOS': return renderPhotos(block, viewMode, onUpdateContent);
    case 'FOOTER': return renderFooter(block, viewMode, onUpdateContent);
    case 'HEADING': return renderHeading(block);
    case 'TEXT_BLOCK': return renderTextBlock(block, viewMode, onUpdateContent);
    case 'SEPARATOR': return renderSeparator(block);
    case 'SPACER': return renderSpacer(block);
    default:
      return <Typography sx={{ fontSize: 9, color: '#94A3B8' }}>Nieznany typ bloku: {block.type}</Typography>;
  }
}
