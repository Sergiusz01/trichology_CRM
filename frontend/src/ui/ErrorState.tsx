import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import { ErrorOutline, Refresh } from '@mui/icons-material';

interface ErrorStateProps {
    title?: string;
    message?: string;
    onRetry?: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
    title = 'Wystąpił błąd',
    message = 'Nie udało się załadować danych. Spróbuj ponownie lub skontaktuj się z administratorem.',
    onRetry
}) => {
    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                p: { xs: 4, md: 6 },
                textAlign: 'center',
                backgroundColor: 'background.default',
                borderRadius: 4,
                border: '1px dashed #E2E8F0'
            }}
        >
            <Box sx={{ mb: 2 }}>
                <ErrorOutline sx={{ fontSize: 48, color: 'error.main', opacity: 0.8 }} />
            </Box>
            <Typography variant="h6" sx={{ mb: 1, fontWeight: 600 }}>{title}</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 400, mb: 3 }}>
                {message}
            </Typography>
            {onRetry && (
                <Button variant="outlined" startIcon={<Refresh />} onClick={onRetry}>
                    Ponów próbę
                </Button>
            )}
        </Box>
    );
};
