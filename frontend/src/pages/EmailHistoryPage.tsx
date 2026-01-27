import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  TablePagination,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
} from '@mui/material';
import { Visibility, CheckCircle, Error as ErrorIcon } from '@mui/icons-material';
import { api } from '../services/api';

interface EmailHistory {
  id: string;
  recipientEmail: string;
  subject: string;
  message: string;
  status: string;
  sentAt: string;
  attachmentCount: number;
  attachmentNames: string[];
  errorMessage?: string;
  sentBy: {
    name: string;
  };
  consultation?: {
    id: string;
    consultationDate: string;
  };
  carePlan?: {
    id: string;
    title: string;
  };
}

export default function EmailHistoryPage() {
  const { id } = useParams<{ id: string }>();
  const [emails, setEmails] = useState<EmailHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [total, setTotal] = useState(0);
  const [selectedEmail, setSelectedEmail] = useState<EmailHistory | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    fetchEmailHistory();
  }, [id, page, rowsPerPage]);

  const fetchEmailHistory = async () => {
    try {
      setLoading(true);
      const endpoint = id 
        ? `/email/history/patient/${id}`
        : '/email/history';
      const response = await api.get(endpoint, {
        params: {
          page: page + 1,
          limit: rowsPerPage,
        },
      });
      setEmails(response.data.emails || []);
      setTotal(response.data.pagination?.total || 0);
    } catch (error) {
      console.error('Błąd pobierania historii emaili:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewEmail = (email: EmailHistory) => {
    setSelectedEmail(email);
    setDialogOpen(true);
  };

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SENT':
        return 'success';
      case 'FAILED':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'SENT':
        return 'Wysłany';
      case 'FAILED':
        return 'Błąd';
      default:
        return status;
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Historia wysłanych emaili
      </Typography>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Data wysłania</TableCell>
              <TableCell>Odbiorca</TableCell>
              <TableCell>Temat</TableCell>
              <TableCell>Załączniki</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Wysłał</TableCell>
              <TableCell align="right">Akcje</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                  <CircularProgress size={32} />
                </TableCell>
              </TableRow>
            ) : emails.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  Brak wysłanych emaili
                </TableCell>
              </TableRow>
            ) : (
              emails.map((email) => (
                <TableRow key={email.id} hover>
                  <TableCell>
                    {new Date(email.sentAt).toLocaleString('pl-PL')}
                  </TableCell>
                  <TableCell>{email.recipientEmail}</TableCell>
                  <TableCell>{email.subject}</TableCell>
                  <TableCell>
                    {email.attachmentCount > 0 ? (
                      <Chip
                        label={`${email.attachmentCount} załącznik${email.attachmentCount > 1 ? 'i' : ''}`}
                        size="small"
                        variant="outlined"
                      />
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={getStatusLabel(email.status)}
                      color={getStatusColor(email.status)}
                      size="small"
                      icon={email.status === 'SENT' ? <CheckCircle /> : <ErrorIcon />}
                    />
                  </TableCell>
                  <TableCell>{email.sentBy.name}</TableCell>
                  <TableCell align="right">
                    <IconButton
                      size="small"
                      onClick={() => handleViewEmail(email)}
                      title="Zobacz szczegóły"
                    >
                      <Visibility />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <TablePagination
          component="div"
          count={total}
          page={page}
          onPageChange={handleChangePage}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          rowsPerPageOptions={[10, 25, 50]}
          labelRowsPerPage="Wierszy na stronę:"
        />
      </TableContainer>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Szczegóły emaila</DialogTitle>
        <DialogContent>
          {selectedEmail && (
            <>
              <DialogContentText>
                <Typography variant="subtitle2" gutterBottom>
                  <strong>Data wysłania:</strong>{' '}
                  {new Date(selectedEmail.sentAt).toLocaleString('pl-PL')}
                </Typography>
                <Typography variant="subtitle2" gutterBottom>
                  <strong>Odbiorca:</strong> {selectedEmail.recipientEmail}
                </Typography>
                <Typography variant="subtitle2" gutterBottom>
                  <strong>Temat:</strong> {selectedEmail.subject}
                </Typography>
                <Typography variant="subtitle2" gutterBottom>
                  <strong>Wysłał:</strong> {selectedEmail.sentBy.name}
                </Typography>
                <Typography variant="subtitle2" gutterBottom>
                  <strong>Status:</strong>{' '}
                  <Chip
                    label={getStatusLabel(selectedEmail.status)}
                    color={getStatusColor(selectedEmail.status)}
                    size="small"
                  />
                </Typography>
                {selectedEmail.consultation && (
                  <Typography variant="subtitle2" gutterBottom>
                    <strong>Konsultacja:</strong>{' '}
                    {new Date(selectedEmail.consultation.consultationDate).toLocaleDateString('pl-PL')}
                  </Typography>
                )}
                {selectedEmail.carePlan && (
                  <Typography variant="subtitle2" gutterBottom>
                    <strong>Plan opieki:</strong> {selectedEmail.carePlan.title}
                  </Typography>
                )}
                {selectedEmail.attachmentNames.length > 0 && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      <strong>Załączniki ({selectedEmail.attachmentCount}):</strong>
                    </Typography>
                    {selectedEmail.attachmentNames.map((name, index) => (
                      <Chip
                        key={index}
                        label={name}
                        size="small"
                        variant="outlined"
                        sx={{ mr: 1, mb: 1 }}
                      />
                    ))}
                  </Box>
                )}
                {selectedEmail.errorMessage && (
                  <Alert severity="error" sx={{ mt: 2 }}>
                    <strong>Błąd:</strong> {selectedEmail.errorMessage}
                  </Alert>
                )}
              </DialogContentText>
              <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                <Typography variant="subtitle2" gutterBottom>
                  <strong>Treść wiadomości:</strong>
                </Typography>
                <Typography
                  variant="body2"
                  sx={{ whiteSpace: 'pre-wrap', maxHeight: 300, overflow: 'auto' }}
                >
                  {selectedEmail.message}
                </Typography>
              </Box>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Zamknij</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

