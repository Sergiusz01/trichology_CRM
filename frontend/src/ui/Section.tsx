import React, { useState, useEffect } from 'react';
import { Box, Typography, Accordion, AccordionSummary, AccordionDetails, alpha } from '@mui/material';
import { ExpandMore } from '@mui/icons-material';

export interface SectionProps {
    title: string;
    description?: string;
    children: React.ReactNode;
    action?: React.ReactNode;
    defaultExpanded?: boolean;
    id?: string;
    forceExpand?: boolean;
}

export const Section: React.FC<SectionProps> = ({ title, description, children, action, defaultExpanded = true, id, forceExpand }) => {
    const [expanded, setExpanded] = useState(defaultExpanded);

    useEffect(() => {
        if (forceExpand) {
            setExpanded(true);
        }
    }, [forceExpand]);

    return (
        <Accordion
            id={id}
            expanded={expanded}
            onChange={(_, isExpanded) => setExpanded(isExpanded)}
            elevation={0}
            disableGutters
            sx={{
                mb: { xs: 2, md: 4 },
                bgcolor: 'transparent',
                '&:before': { display: 'none' },
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: '16px !important',
                overflow: 'hidden'
            }}
        >
            <AccordionSummary
                expandIcon={<ExpandMore />}
                sx={{
                    px: { xs: 2, md: 3 },
                    py: { xs: 1, md: 1.5 },
                    bgcolor: alpha('#000', 0.01),
                    borderBottom: expanded ? '1px solid' : 'none',
                    borderColor: 'divider',
                    '& .MuiAccordionSummary-content': {
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        m: 0,
                        pr: action ? 2 : 0
                    }
                }}
            >
                <Box>
                    <Typography variant="h5" sx={{ fontWeight: 700, color: '#1d1d1f', fontSize: { xs: '1rem', md: '1.25rem' } }}>{title}</Typography>
                    {description && (
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, fontWeight: 500 }}>
                            {description}
                        </Typography>
                    )}
                </Box>
                {action && (
                    <Box onClick={(e) => e.stopPropagation()}>
                        {action}
                    </Box>
                )}
            </AccordionSummary>
            <AccordionDetails sx={{ p: { xs: 1.5, md: 4 }, bgcolor: 'white' }}>
                {children}
            </AccordionDetails>
        </Accordion>
    );
};
