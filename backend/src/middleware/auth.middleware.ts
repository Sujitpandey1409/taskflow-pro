// src/middleware/auth.middleware.ts - ACCEPTS BOTH COOKIE AND HEADER
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
  let token: string | undefined;

  // 🔥 Method 1: Try to get token from cookie (preferred)
  token = req.cookies.access_token;

  // 🔥 Method 2: If no cookie, try Authorization header (fallback)
  if (!token && req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.substring(7);
    console.log('⚠️  Using token from Authorization header (cookie not found)');
  }

  if (!token) {
    return res.status(401).json({ 
      message: 'Not authorized, no token',
      debug: {
        hasCookie: !!req.cookies.access_token,
        hasAuthHeader: !!req.headers.authorization,
        cookies: Object.keys(req.cookies),
      }
    });
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
    console.error('Token verification failed:', err);
    return res.status(401).json({ message: 'Token expired or invalid' });
  }
};