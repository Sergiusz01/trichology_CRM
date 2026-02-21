import React, { useState } from 'react';
import { buildSecureImageUrl } from '../utils/imageHandler';
import BrokenImageIcon from '@mui/icons-material/BrokenImage';
import { Box } from '@mui/material';

interface Props {
    filename?: string | null;
    alt: string;
    style?: React.CSSProperties;
}

export function SecureImage({ filename, alt, style }: Props) {
    const [error, setError] = useState(false);
    const src = buildSecureImageUrl(filename);

    if (!src || error) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" bgcolor="grey.200" height="100%" minHeight="100px">
                <BrokenImageIcon color="disabled" />
            </Box>
        );
    }

    return (
        <img
            src={src}
            alt={alt}
            onError={() => {
                console.error(`Błąd wczytania obrazu z: ${src}`);
                setError(true);
            }}
            loading="lazy"
            style={{ width: '100%', objectFit: 'cover', ...style }}
        />
    );
}
