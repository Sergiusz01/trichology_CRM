import React from 'react';
import { Box, Typography, Breadcrumbs, Link } from '@mui/material';
import { NavigateNext as NavigateNextIcon } from '@mui/icons-material';

export interface PageHeaderProps {
    title: string;
    subtitle?: string;
    breadcrumbs?: { label: string; href?: string }[];
    action?: React.ReactNode;
    backPath?: string;
    backLabel?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ title, subtitle, breadcrumbs, action }) => {
    return (
        <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Box>
                {breadcrumbs && breadcrumbs.length > 0 && (
                    <Breadcrumbs
                        separator={<NavigateNextIcon fontSize="small" />}
                        aria-label="breadcrumb"
                        sx={{ mb: 1, '& .MuiBreadcrumbs-li': { fontSize: '0.875rem' } }}
                    >
                        {breadcrumbs.map((crumb, idx) => {
                            const isLast = idx === breadcrumbs.length - 1;
                            return crumb.href && !isLast ? (
                                <Link key={idx} color="inherit" href={crumb.href} underline="hover">
                                    {crumb.label}
                                </Link>
                            ) : (
                                <Typography key={idx} color="text.primary" sx={{ fontSize: '0.875rem', fontWeight: 500 }}>
                                    {crumb.label}
                                </Typography>
                            );
                        })}
                    </Breadcrumbs>
                )}
                <Typography sx={{ fontSize: { xs: 20, md: 22 }, fontWeight: 500, m: 0, p: 0 }}>{title}</Typography>
                {subtitle && (
                    <Typography sx={{ fontSize: 13, fontWeight: 400, color: 'text.secondary', mt: 0.5 }}>
                        {subtitle}
                    </Typography>
                )}
            </Box>
            {action && (
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                    {action}
                </Box>
            )}
        </Box>
    );
};
