import { Request, Response, NextFunction } from 'express';

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error('Error:', err);

  // Prisma errors
  if (err.name === 'PrismaClientKnownRequestError') {
    return res.status(400).json({
      error: 'Błąd bazy danych',
      message: err.message,
    });
  }

  // Validation errors
  if (err.name === 'ZodError') {
    return res.status(400).json({
      error: 'Błąd walidacji',
      details: err.message,
    });
  }

  // Default error
  res.status(500).json({
    error: 'Wewnętrzny błąd serwera',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
};


