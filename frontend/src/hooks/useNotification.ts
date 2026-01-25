import { useSnackbar, VariantType } from 'notistack';

export const useNotification = () => {
    const { enqueueSnackbar } = useSnackbar();

    return {
        success: (message: string) => {
            enqueueSnackbar(message, { variant: 'success' });
        },
        error: (message: string) => {
            enqueueSnackbar(message, { variant: 'error' });
        },
        warning: (message: string) => {
            enqueueSnackbar(message, { variant: 'warning' });
        },
        info: (message: string) => {
            enqueueSnackbar(message, { variant: 'info' });
        },
        show: (message: string, variant: VariantType = 'default') => {
            enqueueSnackbar(message, { variant });
        },
    };
};
