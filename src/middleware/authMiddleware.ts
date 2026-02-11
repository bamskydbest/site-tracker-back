import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import Admin from '../models/Admin.js';
import type { JwtPayload } from '../types/index.js';

export const protect = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ message: 'Not authorized, no token' });
    return;
  }

  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as JwtPayload;
    const admin = await Admin.findById(decoded.id).select('-password');
    if (!admin) {
      res.status(401).json({ message: 'Not authorized, admin not found' });
      return;
    }
    req.admin = admin;
    next();
  } catch {
    res.status(401).json({ message: 'Not authorized, token failed' });
  }
};
