import { Box, Typography, Button, Container } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { Home as HomeIcon } from '@mui/icons-material';

export default function NotFoundPage() {
    const navigate = useNavigate();

    return (
        <Container maxWidth="sm">
            <Box
                sx={{
                    minHeight: '80vh',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textAlign: 'center',
                    gap: 3,
                }}
            >
                <Typography variant="h1" color="primary" sx={{ fontWeight: 'bold' }}>
                    404
                </Typography>
                <Typography variant="h5" color="text.secondary">
                    Nie znaleziono strony
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
                    Przepraszamy, ale strona, której szukasz, nie istnieje lub została przeniesiona.
                </Typography>
                <Button
                    variant="contained"
                    size="large"
                    startIcon={<HomeIcon />}
                    onClick={() => navigate('/')}
                >
                    Powrót do strony głównej
                </Button>
            </Box>
        </Container>
    );
}
