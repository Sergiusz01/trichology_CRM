import React from 'react';
import { Box, Typography } from '@mui/material';
import { Inbox as InboxIcon } from '@mui/icons-material';

export interface EmptyStateProps {
    title: string;
    description?: string;
    icon?: React.ReactNode;
    action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
    title,
    description,
    icon = <InboxIcon sx={{ fontSize: 48, color: 'text.disabled' }} />,
    action
}) => {
    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                p: 6,
                textAlign: 'center',
                backgroundColor: 'background.default',
                borderRadius: 4,
                border: '1px dashed #E2E8F0'
            }}
        >
            <Box sx={{ mb: 2 }}>{icon}</Box>
            <Typography variant="h5" sx={{ mb: 1 }}>{title}</Typography>
            {description && (
                <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 400, mb: 3 }}>
                    {description}
                </Typography>
            )}
            {action && <Box>{action}</Box>}
        </Box>
    );
};
