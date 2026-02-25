import React, { useState, useEffect } from 'react';
import BrokenImageIcon from '@mui/icons-material/BrokenImage';
import { Box, CircularProgress } from '@mui/material';
import { api } from '../services/api';

interface Props {
    filename?: string | null;
    alt: string;
    style?: React.CSSProperties;
}

/**
 * SecureImage — loads patient photos via Authorization header (not query string).
 * Fetches the image as a blob through the authenticated API client, then
 * displays it using a blob URL. This prevents JWT tokens from leaking
 * into browser history, Nginx logs, and Referer headers.
 */
export function SecureImage({ filename, alt, style }: Props) {
    const [blobUrl, setBlobUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        let cancelled = false;
        let objectUrl: string | null = null;

        const loadImage = async () => {
            if (!filename) {
                setLoading(false);
                setError(true);
                return;
            }

            // Extract just the filename in case older DB records hold the full path
            const cleanName = filename.split(/[/\\]/).pop();
            if (!cleanName) {
                setLoading(false);
                setError(true);
                return;
            }

            try {
                const response = await api.get(`/uploads/secure/${cleanName}`, {
                    responseType: 'blob',
                });

                if (cancelled) return;

                objectUrl = URL.createObjectURL(response.data);
                setBlobUrl(objectUrl);
            } catch (err) {
                console.error(`Błąd wczytania obrazu: ${cleanName}`, err);
                if (!cancelled) setError(true);
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        loadImage();

        return () => {
            cancelled = true;
            if (objectUrl) URL.revokeObjectURL(objectUrl);
        };
    }, [filename]);

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" bgcolor="grey.100" height="100%" minHeight="100px">
                <CircularProgress size={24} />
            </Box>
        );
    }

    if (error || !blobUrl) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" bgcolor="grey.200" height="100%" minHeight="100px">
                <BrokenImageIcon color="disabled" />
            </Box>
        );
    }

    return (
        <img
            src={blobUrl}
            alt={alt}
            loading="lazy"
            style={{ width: '100%', objectFit: 'cover', ...style }}
        />
    );
}

export default SecureImage;
