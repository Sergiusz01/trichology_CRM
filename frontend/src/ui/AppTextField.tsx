import React from 'react';
import { TextField, TextFieldProps, Box, Typography } from '@mui/material';
import { Controller, Control, FieldValues, Path } from 'react-hook-form';

export type AppTextFieldProps<T extends FieldValues> = Omit<TextFieldProps, 'name'> & {
    name: Path<T>;
    control?: Control<T>;
    helpText?: string;
};

export const AppTextField = <T extends FieldValues>({
    name,
    control,
    helpText,
    ...props
}: AppTextFieldProps<T>) => {

    const renderField = (fieldProps?: any, error?: any) => (
        <Box sx={{ width: props.fullWidth ? '100%' : 'auto', mb: 2 }}>
            {props.label && (
                <Typography variant="body2" sx={{ fontWeight: 500, mb: 0.5, color: '#334155' }}>
                    {props.label} {props.required && <span style={{ color: '#EF4444' }}>*</span>}
                </Typography>
            )}
            <TextField
                {...props}
                {...fieldProps}
                name={name}
                label={undefined} // Hidden to use custom top label instead of floating
                error={!!error?.message || props.error}
                helperText={error?.message || props.helperText || helpText}
                InputLabelProps={{ shrink: true }}
            />
        </Box>
    );

    if (control) {
        return (
            <Controller
                name={name}
                control={control}
                render={({ field, fieldState: { error } }) => renderField(field, error)}
            />
        );
    }

    return renderField();
};
