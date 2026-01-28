import crypto from 'node:crypto';
import { Request, Response, NextFunction } from 'express';

const HEADER = 'X-Request-Id';

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const incoming = req.headers['x-request-id'];
  const id = (typeof incoming === 'string' ? incoming : undefined) || crypto.randomUUID();
  (req as Request & { requestId: string }).requestId = id;
  res.setHeader(HEADER, id);
  next();
}
