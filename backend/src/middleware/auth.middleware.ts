// src/middleware/auth.middleware.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/global/User';

declare global {
  namespace Express {
    interface Request {
      user?: any;
      tenantDB?: any;
    }
  }
}

export const protect = async (req: Request, res: Response, next: NextFunction) => {
  const token = req.cookies.access_token;

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }

  try {
    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);
    
    // Attach user info to request
    req.user = {
      userId: decoded.userId,
      orgId: decoded.orgId,
      role: decoded.role,
    };

    next();
  } catch (err) {
    return res.status(401).json({ message: 'Token expired or invalid' });
  }
};