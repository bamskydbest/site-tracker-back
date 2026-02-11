import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

export const validate = (schema: z.ZodType) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const issues = result.error.issues ?? [];
      res.status(400).json({
        message: 'Validation error',
        errors: issues.map((e: z.ZodIssue) => ({ path: e.path.join('.'), message: e.message })),
      });
      return;
    }
    req.body = result.data;
    next();
  };
};
