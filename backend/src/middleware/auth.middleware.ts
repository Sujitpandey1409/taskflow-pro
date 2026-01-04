// src/middleware/auth.middleware.ts - ACCEPTS BOTH COOKIE AND AUTHORIZATION HEADER
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

  token = req.cookies.access_token;

  if (!token && req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.substring(7);
    console.log('⚠️  Using token from Authorization header (cookie not found)');
  }

  // No token found anywhere
  if (!token) {
    console.log('❌ No token found in cookies or headers');
    return res.status(401).json({ 
      message: 'Not authorized, no token',
      debug: process.env.NODE_ENV === 'development' ? {
        hasCookie: !!req.cookies.access_token,
        hasAuthHeader: !!req.headers.authorization,
        cookies: Object.keys(req.cookies),
        origin: req.headers.origin,
      } : undefined,
    });
  }

  try {
    // Verify token
    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);
    
    // Attach user info to request
    req.user = {
      userId: decoded.userId,
      orgId: decoded.orgId,
      role: decoded.role,
    };

    console.log(`✅ Auth successful: User ${decoded.userId}`);
    next();
  } catch (err: any) {
    console.error('❌ Token verification failed:', err.message);
    return res.status(401).json({ 
      message: 'Token expired or invalid',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
  }
};