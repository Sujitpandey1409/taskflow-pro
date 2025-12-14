// src/middleware/rbac.middleware.ts
import { Request, Response, NextFunction } from 'express';

export const requireRole = (requiredRole: 'OWNER' | 'ADMIN' | 'MEMBER') => {
  return (req: Request, res: Response, next: NextFunction) => {
    const userRole = req.user?.role as 'OWNER' | 'ADMIN' | 'MEMBER' | undefined;

    const hierarchy = { OWNER: 3, ADMIN: 2, MEMBER: 1 };
    if (userRole && hierarchy[userRole] >= hierarchy[requiredRole]) {
      next();
    } else {
      res.status(403).json({ message: 'Insufficient permissions' });
    }
  };
};