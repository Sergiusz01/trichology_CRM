"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = void 0;
const zod_1 = require("zod");
const client_1 = require("@prisma/client");
const logger_1 = require("../utils/logger");
const DEV = process.env.NODE_ENV === 'development';
function getRequestId(req) {
    return req.requestId;
}
function sendError(res, status, body) {
    res.status(status).json(body);
}
const errorHandler = (err, req, res, _next) => {
    const requestId = getRequestId(req);
    const meta = { requestId };
    if (DEV && err.stack)
        meta.stack = err.stack;
    logger_1.logger.error(err.message, { ...meta, name: err.name });
    if (DEV) {
        // eslint-disable-next-line no-console
        console.error(err.stack);
    }
    const base = { requestId };
    if (err instanceof zod_1.ZodError) {
        const details = err.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
            code: e.code,
        }));
        sendError(res, 400, {
            ...base,
            code: 'VALIDATION_ERROR',
            message: 'Błąd walidacji danych. Sprawdź wprowadzone dane.',
            details,
        });
        return;
    }
    if (err instanceof client_1.Prisma.PrismaClientKnownRequestError) {
        switch (err.code) {
            case 'P2002': {
                const target = err.meta?.target;
                const field = target?.[0] ?? 'pole';
                sendError(res, 409, {
                    ...base,
                    code: 'CONFLICT',
                    message: `Wartość w polu "${field}" już istnieje w bazie danych.`,
                    details: { field },
                });
                return;
            }
            case 'P2025':
                sendError(res, 404, {
                    ...base,
                    code: 'NOT_FOUND',
                    message: 'Rekord nie został znaleziony w bazie danych.',
                });
                return;
            case 'P2003':
                sendError(res, 400, {
                    ...base,
                    code: 'RELATION_ERROR',
                    message: 'Nie można wykonać operacji – istnieją powiązane rekordy.',
                });
                return;
            case 'P2014':
                sendError(res, 400, {
                    ...base,
                    code: 'RELATION_ERROR',
                    message: 'Wymagana relacja nie została spełniona.',
                });
                return;
            default:
                sendError(res, 400, {
                    ...base,
                    code: 'DATABASE_ERROR',
                    message: DEV ? err.message : 'Błąd bazy danych.',
                });
                return;
        }
    }
    if (err instanceof client_1.Prisma.PrismaClientValidationError) {
        sendError(res, 400, {
            ...base,
            code: 'VALIDATION_ERROR',
            message: 'Nieprawidłowe dane dla operacji na bazie danych.',
        });
        return;
    }
    if (err.name === 'JsonWebTokenError') {
        sendError(res, 401, {
            ...base,
            code: 'INVALID_TOKEN',
            message: 'Token autoryzacyjny jest nieprawidłowy.',
        });
        return;
    }
    if (err.name === 'TokenExpiredError') {
        sendError(res, 401, {
            ...base,
            code: 'TOKEN_EXPIRED',
            message: 'Token autoryzacyjny wygasł. Zaloguj się ponownie.',
        });
        return;
    }
    sendError(res, 500, {
        ...base,
        code: 'INTERNAL_ERROR',
        message: DEV ? err.message : 'Wystąpił nieoczekiwany błąd.',
        ...(DEV && err.stack ? { stack: err.stack } : {}),
    });
};
exports.errorHandler = errorHandler;
//# sourceMappingURL=errorHandler.js.map