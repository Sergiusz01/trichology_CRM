import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Box, Typography, Button, Container, Paper } from '@mui/material';
import { Replay as ReplayIcon } from '@mui/icons-material';

interface Props {
    children?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Uncaught error:', error, errorInfo);
    }

    private handleReload = () => {
        window.location.reload();
    };

    public render() {
        if (this.state.hasError) {
            return (
                <Container maxWidth="md">
                    <Box
                        sx={{
                            minHeight: '100vh',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            p: 3,
                        }}
                    >
                        <Paper
                            elevation={3}
                            sx={{
                                p: { xs: 3, sm: 5 },
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                textAlign: 'center',
                                gap: 3,
                                width: '100%',
                            }}
                        >
                            <Typography variant="h4" color="error" sx={{ fontWeight: 'bold' }}>
                                Wystąpił nieoczekiwany błąd aplikacji
                            </Typography>
                            <Typography variant="body1" color="text.secondary">
                                Przepraszamy, ale coś poszło nie tak. Spróbuj odświeżyć stronę.
                            </Typography>

                            {import.meta.env.DEV && this.state.error && (
                                <Box
                                    sx={{
                                        width: '100%',
                                        bgcolor: 'grey.100',
                                        p: 2,
                                        borderRadius: 1,
                                        overflowX: 'auto',
                                        textAlign: 'left',
                                    }}
                                >
                                    <Typography variant="caption" component="pre" sx={{ m: 0, color: 'error.main' }}>
                                        {this.state.error.stack || this.state.error.message}
                                    </Typography>
                                </Box>
                            )}

                            <Button
                                variant="contained"
                                size="large"
                                startIcon={<ReplayIcon />}
                                onClick={this.handleReload}
                            >
                                Odśwież stronę
                            </Button>
                        </Paper>
                    </Box>
                </Container>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
