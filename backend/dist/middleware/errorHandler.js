"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = void 0;
const zod_1 = require("zod");
const client_1 = require("@prisma/client");
const errorHandler = (err, req, res, next) => {
    console.error('Error:', err);
    console.error('Error stack:', err.stack);
    // Zod validation errors - format nicely
    if (err instanceof zod_1.ZodError) {
        const formattedErrors = err.errors.map((error) => ({
            field: error.path.join('.'),
            message: error.message,
            code: error.code,
        }));
        return res.status(400).json({
            error: 'Błąd walidacji danych',
            message: 'Sprawdź wprowadzone dane',
            details: formattedErrors,
        });
    }
    // Prisma errors - differentiate by error code
    if (err instanceof client_1.Prisma.PrismaClientKnownRequestError) {
        switch (err.code) {
            case 'P2002':
                // Unique constraint violation
                const target = err.meta?.target;
                const field = target?.[0] || 'pole';
                return res.status(409).json({
                    error: 'Konflikt danych',
                    message: `Wartość w polu "${field}" już istnieje w bazie danych`,
                    field,
                });
            case 'P2025':
                // Record not found
                return res.status(404).json({
                    error: 'Nie znaleziono',
                    message: 'Rekord nie został znaleziony w bazie danych',
                });
            case 'P2003':
                // Foreign key constraint violation
                return res.status(400).json({
                    error: 'Błąd relacji',
                    message: 'Nie można wykonać operacji - istnieją powiązane rekordy',
                });
            case 'P2014':
                // Required relation violation
                return res.status(400).json({
                    error: 'Błąd relacji',
                    message: 'Wymagana relacja nie została spełniona',
                });
            default:
                return res.status(400).json({
                    error: 'Błąd bazy danych',
                    message: err.message,
                    code: err.code,
                });
        }
    }
    // Prisma validation errors
    if (err instanceof client_1.Prisma.PrismaClientValidationError) {
        return res.status(400).json({
            error: 'Błąd walidacji bazy danych',
            message: 'Nieprawidłowe dane dla operacji na bazie danych',
        });
    }
    // JWT errors
    if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({
            error: 'Nieprawidłowy token',
            message: 'Token autoryzacyjny jest nieprawidłowy',
        });
    }
    if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
            error: 'Token wygasł',
            message: 'Token autoryzacyjny wygasł. Zaloguj się ponownie',
        });
    }
    // Default error
    res.status(500).json({
        error: 'Wewnętrzny błąd serwera',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Wystąpił nieoczekiwany błąd',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
};
exports.errorHandler = errorHandler;
//# sourceMappingURL=errorHandler.js.map