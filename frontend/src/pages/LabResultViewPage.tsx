import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Button,
  Container,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  CircularProgress,
  Alert,
} from '@mui/material';
import { Edit, GetApp, ArrowBack } from '@mui/icons-material';
import { api } from '../services/api';
import { useNotification } from '../hooks/useNotification';

// Helper function to format date
const formatDate = (date: Date | string): string => {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('pl-PL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

// Helper function to format date and time
const formatDateTime = (date: Date | string): string => {
  return new Date(date).toLocaleString('pl-PL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

// Get flag color
const getFlagColor = (flag: string | null | undefined): 'error' | 'success' | 'default' => {
  if (!flag) return 'default';
  switch (flag) {
    case 'LOW':
    case 'HIGH':
      return 'error';
    case 'NORMAL':
      return 'success';
    default:
      return 'default';
  }
};

// Render lab value row
const renderLabValue = (
  label: string,
  value: any,
  unit: string,
  refLow: any,
  refHigh: any,
  flag: string | null | undefined
) => {
  if (value === null || value === undefined) return null;
  return (
    <TableRow>
      <TableCell sx={{ 
        fontSize: { xs: '0.75rem', sm: '0.875rem' },
      }}>
        <strong>{label}</strong>
      </TableCell>
      <TableCell sx={{ 
        fontSize: { xs: '0.75rem', sm: '0.875rem' },
      }}>
        {value} {unit || ''}
      </TableCell>
      <TableCell sx={{ 
        fontSize: { xs: '0.75rem', sm: '0.875rem' },
        display: { xs: 'none', md: 'table-cell' },
      }}>
        {refLow !== null && refLow !== undefined ? refLow : '-'} - {refHigh !== null && refHigh !== undefined ? refHigh : '-'}
      </TableCell>
      <TableCell sx={{ 
        fontSize: { xs: '0.75rem', sm: '0.875rem' },
      }}>
        <Chip
          label={flag || '-'}
          color={getFlagColor(flag)}
          size="small"
          sx={{ 
            fontSize: { xs: '0.65rem', sm: '0.75rem' },
            height: { xs: 20, sm: 24 },
          }}
        />
      </TableCell>
    </TableRow>
  );
};

export default function LabResultViewPage() {
  const { id, labResultId } = useParams<{ id?: string; labResultId?: string }>();
  const [labResult, setLabResult] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloadingPDF, setDownloadingPDF] = useState(false);
  const navigate = useNavigate();
  const { error: showError, success: showSuccess } = useNotification();

  useEffect(() => {
    if (labResultId) {
      fetchLabResult();
    } else {
      setError('Brak ID wyniku badania');
      setLoading(false);
    }
  }, [labResultId]);

  const fetchLabResult = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get(`/lab-results/${labResultId}`);
      setLabResult(response.data.labResult || response.data);
    } catch (error: any) {
      console.error('Błąd pobierania wyniku:', error);
      const errorMessage = error.response?.data?.error || 'Błąd pobierania wyniku badania';
      setError(errorMessage);
      showError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    try {
      setDownloadingPDF(true);
      const response = await api.get(`/lab-results/${labResultId}/pdf`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `wynik-badan-${labResultId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      showSuccess('PDF pobrany pomyślnie');
    } catch (error: any) {
      console.error('Błąd pobierania PDF:', error);
      const errorMessage = error.response?.data?.error || 'Błąd pobierania PDF';
      showError(errorMessage);
    } finally {
      setDownloadingPDF(false);
    }
  };

  if (loading) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 8, gap: 2 }}>
          <CircularProgress size={48} />
          <Typography variant="body1" color="text.secondary">Ładowanie wyniku badania...</Typography>
        </Box>
      </Container>
    );
  }

  if (error || !labResult) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ py: 4 }}>
          <Alert severity="error" sx={{ mb: 2 }}>
            {error || 'Wynik badania nie znaleziony'}
          </Alert>
          <Button onClick={() => navigate(-1)} startIcon={<ArrowBack />}>
            Powrót
          </Button>
        </Box>
      </Container>
    );
  }

  const patient = labResult.patient || {};

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 2, sm: 3 }, px: { xs: 1, sm: 2, md: 3 } }}>
      {/* Header with actions */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Button
          startIcon={<ArrowBack />}
          onClick={() => navigate(-1)}
          sx={{ mb: 2 }}
        >
          Powrót
        </Button>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={downloadingPDF ? <CircularProgress size={20} /> : <GetApp />}
            onClick={handleDownloadPDF}
            disabled={downloadingPDF}
          >
            {downloadingPDF ? 'Pobieranie...' : 'Pobierz PDF'}
          </Button>
          <Button
            variant="contained"
            startIcon={<Edit />}
            onClick={() => navigate(`/patients/${id || patient.id}/lab-results/${labResultId}/edit`)}
          >
            Edytuj
          </Button>
        </Box>
      </Box>

      {/* Main document - PDF-like layout */}
      <Paper 
        sx={{ 
          p: { xs: 2, sm: 3, md: 4 },
          backgroundColor: '#fff',
          boxShadow: 2,
        }}
      >
        {/* Header */}
        <Box sx={{ 
          textAlign: 'center', 
          borderBottom: '2px solid #333',
          mb: 3,
          pb: 2
        }}>
          <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1 }}>
            WYNIK BADAŃ LABORATORYJNYCH
          </Typography>
          <Typography variant="body1">
            Data badania: <strong>{formatDate(labResult.date)}</strong>
          </Typography>
        </Box>

        {/* Patient Info */}
        <Box sx={{ mb: 3, p: 2, backgroundColor: '#f9f9f9', borderRadius: 1 }}>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>Dane pacjenta</Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1 }}>
            <Box>
              <Typography><strong>Pacjent:</strong> {patient.firstName} {patient.lastName}</Typography>
              {patient.age && (
                <Typography><strong>Wiek:</strong> {patient.age} lat</Typography>
              )}
              {patient.gender && (
                <Typography><strong>Płeć:</strong> {patient.gender === 'MALE' ? 'Mężczyzna' : patient.gender === 'FEMALE' ? 'Kobieta' : 'Inna'}</Typography>
              )}
            </Box>
            <Box>
              {patient.phone && (
                <Typography><strong>Telefon:</strong> {patient.phone}</Typography>
              )}
              {patient.email && (
                <Typography><strong>Email:</strong> {patient.email}</Typography>
              )}
            </Box>
          </Box>
        </Box>

        {/* Lab Results */}
        <Box sx={{ mt: 3 }}>
          {labResult.templateId && labResult.dynamicData && labResult.template && (() => {
            const dyn = labResult.dynamicData as Record<string, unknown>;
            const tpl = labResult.template as { name?: string; fields?: { key: string; label: string; type: string; unit?: string; refLow?: number; refHigh?: number; order?: number }[] };
            const fields = (tpl.fields || []).slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
            const rows: JSX.Element[] = [];
            fields.forEach((f) => {
              const v = dyn[f.key];
              if (v === null || v === undefined || v === '') return;
              if (f.type === 'NUMBER') {
                const unit = (dyn[`${f.key}Unit`] as string) ?? f.unit ?? '';
                const refLow = (dyn[`${f.key}RefLow`] as number) ?? f.refLow;
                const refHigh = (dyn[`${f.key}RefHigh`] as number) ?? f.refHigh;
                const flag = dyn[`${f.key}Flag`] as string | undefined;
                rows.push(
                  <TableRow key={f.key}>
                    <TableCell><strong>{f.label}</strong></TableCell>
                    <TableCell>{String(v)} {unit}</TableCell>
                    <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                      {refLow != null || refHigh != null ? `${refLow ?? '-'} - ${refHigh ?? '-'}` : '-'}
                    </TableCell>
                    <TableCell>
                      <Chip label={flag || '-'} color={getFlagColor(flag)} size="small" sx={{ fontSize: '0.75rem' }} />
                    </TableCell>
                  </TableRow>
                );
              } else {
                rows.push(
                  <TableRow key={f.key}>
                    <TableCell><strong>{f.label}</strong></TableCell>
                    <TableCell colSpan={3}>{String(v)}</TableCell>
                  </TableRow>
                );
              }
            });
            if (rows.length === 0) return null;
            return (
              <>
                <Typography variant="h6" sx={{ fontSize: '1.25rem', fontWeight: 'bold', mt: 3, mb: 2, color: '#2c3e50', borderBottom: '2px solid #3498db', pb: 1 }}>
                  Wyniki (szablon: {tpl.name || '—'})
                </Typography>
                <TableContainer component={Paper} sx={{ mb: 3 }}>
                  <Table>
                    <TableHead>
                      <TableRow sx={{ backgroundColor: '#2c3e50' }}>
                        <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Parametr</TableCell>
                        <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Wartość</TableCell>
                        <TableCell sx={{ color: 'white', fontWeight: 'bold', display: { xs: 'none', md: 'table-cell' } }}>Zakres referencyjny</TableCell>
                        <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Status</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>{rows}</TableBody>
                  </Table>
                </TableContainer>
              </>
            );
          })()}

          {/* Legacy: Morphology */}
          {!labResult.templateId && ((labResult.hgb !== null && labResult.hgb !== undefined) || 
           (labResult.rbc !== null && labResult.rbc !== undefined) || 
           (labResult.wbc !== null && labResult.wbc !== undefined) || 
           (labResult.plt !== null && labResult.plt !== undefined)) ? (
            <>
              <Typography variant="h6" sx={{ 
                fontSize: '1.25rem',
                fontWeight: 'bold',
                mt: 3,
                mb: 2,
                color: '#2c3e50',
                borderBottom: '2px solid #3498db',
                pb: 1
              }}>
                MORFOLOGIA KRWI
              </Typography>
              <TableContainer component={Paper} sx={{ mb: 3 }}>
                <Table>
                  <TableHead>
                    <TableRow sx={{ backgroundColor: '#2c3e50' }}>
                      <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Parametr</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Wartość</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Zakres referencyjny</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {renderLabValue('Hemoglobina (HGB)', labResult.hgb, labResult.hgbUnit || '', labResult.hgbRefLow, labResult.hgbRefHigh, labResult.hgbFlag)}
                    {renderLabValue('Erytrocyty (RBC)', labResult.rbc, labResult.rbcUnit || '', labResult.rbcRefLow, labResult.rbcRefHigh, labResult.rbcFlag)}
                    {renderLabValue('Leukocyty (WBC)', labResult.wbc, labResult.wbcUnit || '', labResult.wbcRefLow, labResult.wbcRefHigh, labResult.wbcFlag)}
                    {renderLabValue('Płytki krwi (PLT)', labResult.plt, labResult.pltUnit || '', labResult.pltRefLow, labResult.pltRefHigh, labResult.pltFlag)}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          ) : null}

          {/* Legacy: Iron */}
          {!labResult.templateId && ((labResult.ferritin !== null && labResult.ferritin !== undefined) || 
           (labResult.iron !== null && labResult.iron !== undefined)) ? (
            <>
              <Typography variant="h6" sx={{ 
                fontSize: '1.25rem',
                fontWeight: 'bold',
                mt: 3,
                mb: 2,
                color: '#2c3e50',
                borderBottom: '2px solid #3498db',
                pb: 1
              }}>
                ŻELAZO
              </Typography>
              <TableContainer component={Paper} sx={{ mb: 3 }}>
                <Table>
                  <TableHead>
                    <TableRow sx={{ backgroundColor: '#2c3e50' }}>
                      <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Parametr</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Wartość</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Zakres referencyjny</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {renderLabValue('Ferrytyna', labResult.ferritin, labResult.ferritinUnit || '', labResult.ferritinRefLow, labResult.ferritinRefHigh, labResult.ferritinFlag)}
                    {renderLabValue('Żelazo', labResult.iron, labResult.ironUnit || '', labResult.ironRefLow, labResult.ironRefHigh, labResult.ironFlag)}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          ) : null}

          {/* Legacy: Vitamins */}
          {!labResult.templateId && ((labResult.vitaminD3 !== null && labResult.vitaminD3 !== undefined) || 
           (labResult.vitaminB12 !== null && labResult.vitaminB12 !== undefined) || 
           (labResult.folicAcid !== null && labResult.folicAcid !== undefined)) ? (
            <>
              <Typography variant="h6" sx={{ 
                fontSize: '1.25rem',
                fontWeight: 'bold',
                mt: 3,
                mb: 2,
                color: '#2c3e50',
                borderBottom: '2px solid #3498db',
                pb: 1
              }}>
                WITAMINY
              </Typography>
              <TableContainer component={Paper} sx={{ mb: 3 }}>
                <Table>
                  <TableHead>
                    <TableRow sx={{ backgroundColor: '#2c3e50' }}>
                      <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Parametr</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Wartość</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Zakres referencyjny</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {renderLabValue('Witamina D3', labResult.vitaminD3, labResult.vitaminD3Unit || '', labResult.vitaminD3RefLow, labResult.vitaminD3RefHigh, labResult.vitaminD3Flag)}
                    {renderLabValue('Witamina B12', labResult.vitaminB12, labResult.vitaminB12Unit || '', labResult.vitaminB12RefLow, labResult.vitaminB12RefHigh, labResult.vitaminB12Flag)}
                    {renderLabValue('Kwas foliowy', labResult.folicAcid, labResult.folicAcidUnit || '', labResult.folicAcidRefLow, labResult.folicAcidRefHigh, labResult.folicAcidFlag)}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          ) : null}

          {/* Legacy: Thyroid */}
          {!labResult.templateId && ((labResult.tsh !== null && labResult.tsh !== undefined) || 
           (labResult.ft3 !== null && labResult.ft3 !== undefined) || 
           (labResult.ft4 !== null && labResult.ft4 !== undefined)) ? (
            <>
              <Typography variant="h6" sx={{ 
                fontSize: '1.25rem',
                fontWeight: 'bold',
                mt: 3,
                mb: 2,
                color: '#2c3e50',
                borderBottom: '2px solid #3498db',
                pb: 1
              }}>
                FUNKCJA TARCZYCY
              </Typography>
              <TableContainer component={Paper} sx={{ mb: 3 }}>
                <Table>
                  <TableHead>
                    <TableRow sx={{ backgroundColor: '#2c3e50' }}>
                      <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Parametr</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Wartość</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Zakres referencyjny</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {renderLabValue('TSH', labResult.tsh, labResult.tshUnit || '', labResult.tshRefLow, labResult.tshRefHigh, labResult.tshFlag)}
                    {renderLabValue('FT3', labResult.ft3, labResult.ft3Unit || '', labResult.ft3RefLow, labResult.ft3RefHigh, labResult.ft3Flag)}
                    {renderLabValue('FT4', labResult.ft4, labResult.ft4Unit || '', labResult.ft4RefLow, labResult.ft4RefHigh, labResult.ft4Flag)}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          ) : null}
        </Box>

        {/* Notes */}
        {labResult.notes && (
          <Box sx={{ 
            mt: 3,
            p: 2,
            backgroundColor: '#fff3cd',
            borderLeft: '4px solid #ffc107',
            borderRadius: 1
          }}>
            <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 1 }}>Uwagi</Typography>
            <Typography>{labResult.notes}</Typography>
          </Box>
        )}

        {/* Footer */}
        <Box sx={{ 
          mt: 4,
          pt: 2,
          borderTop: '1px solid #ddd',
          fontSize: '0.875rem',
          textAlign: 'right',
          color: '#666'
        }}>
          <Typography variant="body2">
            Wygenerowano: {formatDateTime(new Date())}
          </Typography>
        </Box>
      </Paper>
    </Container>
  );
}

