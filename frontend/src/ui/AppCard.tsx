import React from 'react';
import { Card, CardProps, CardContent, Typography, Box } from '@mui/material';

export interface AppCardProps extends CardProps {
    title?: string;
    action?: React.ReactNode;
    noPadding?: boolean;
}

export const AppCard: React.FC<AppCardProps> = ({
    children,
    title,
    action,
    noPadding = false,
    ...props
}) => {
    return (
        <Card {...props}>
            {(title || action) && (
                <Box
                    sx={{
                        p: 2,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        borderBottom: title ? '1px solid #E2E8F0' : 'none'
                    }}
                >
                    {title && <Typography variant="h6">{title}</Typography>}
                    {action && <Box>{action}</Box>}
                </Box>
            )}
            <CardContent sx={{ p: noPadding ? 0 : 2, '&:last-child': { pb: noPadding ? 0 : 2 } }}>
                {children}
            </CardContent>
        </Card>
    );
};
