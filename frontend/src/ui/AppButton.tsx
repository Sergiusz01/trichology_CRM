import React from 'react';
import { Button, ButtonProps, CircularProgress } from '@mui/material';

export interface AppButtonProps extends ButtonProps {
    loading?: boolean;
}

export const AppButton: React.FC<AppButtonProps> = ({
    children,
    loading = false,
    disabled,
    ...props
}) => {
    return (
        <Button
            disabled={disabled || loading}
            {...props}
            sx={{
                position: 'relative',
                ...props.sx
            }}
        >
            {loading && (
                <CircularProgress
                    size={24}
                    sx={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        marginTop: '-12px',
                        marginLeft: '-12px',
                    }}
                />
            )}
            <span style={{ opacity: loading ? 0 : 1 }}>
                {children}
            </span>
        </Button>
    );
};
