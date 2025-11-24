import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Paper, Typography, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip } from '@mui/material';
import { Add } from '@mui/icons-material';
import { api } from '../services/api';

export default function LabResultsPage() {
  const { id } = useParams<{ id: string }>();
  const [labResults, setLabResults] = useState<any[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    if (id) {
      fetchLabResults();
    }
  }, [id]);

  const fetchLabResults = async () => {
    try {
      const response = await api.get(`/lab-results/patient/${id}`);
      setLabResults(response.data.labResults);
    } catch (error) {
      console.error('Błąd pobierania wyników:', error);
    }
  };

  const getFlagColor = (flag: string) => {
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

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4">Wyniki badań laboratoryjnych</Typography>
        <Button variant="contained" startIcon={<Add />}>
          Dodaj wynik
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Data</TableCell>
              <TableCell>Parametr</TableCell>
              <TableCell>Wartość</TableCell>
              <TableCell>Jednostka</TableCell>
              <TableCell>Zakres</TableCell>
              <TableCell>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {labResults.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  Brak wyników
                </TableCell>
              </TableRow>
            ) : (
              labResults.map((result) => (
                <TableRow key={result.id}>
                  <TableCell>
                    {new Date(result.date).toLocaleDateString('pl-PL')}
                  </TableCell>
                  <TableCell>Ferrytyna</TableCell>
                  <TableCell>{result.ferritin}</TableCell>
                  <TableCell>{result.ferritinUnit}</TableCell>
                  <TableCell>
                    {result.ferritinRefLow} - {result.ferritinRefHigh}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={result.ferritinFlag}
                      color={getFlagColor(result.ferritinFlag || '')}
                      size="small"
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}


