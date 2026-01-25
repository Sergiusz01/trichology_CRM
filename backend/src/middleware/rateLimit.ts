import rateLimit from 'express-rate-limit';

const standard = {
  standardHeaders: true,
  legacyHeaders: false,
} as const;

export const apiLimiter = rateLimit({
  ...standard,
  windowMs: 15 * 60 * 1000,
  limit: 300,
});

export const authLimiter = rateLimit({
  ...standard,
  windowMs: 15 * 60 * 1000,
  limit: 30,
});

export const refreshLimiter = rateLimit({
  ...standard,
  windowMs: 15 * 60 * 1000,
  limit: 60,
});

export const pdfLimiter = rateLimit({
  ...standard,
  windowMs: 15 * 60 * 1000,
  limit: 20,
});

export const uploadLimiter = rateLimit({
  ...standard,
  windowMs: 15 * 60 * 1000,
  limit: 40,
});



