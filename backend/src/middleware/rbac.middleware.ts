// src/middleware/rbac.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { OrganizationMember } from '../models/global/OrganizationMember';

export const requireRole = (minRole: 'OWNER' | 'ADMIN' | 'MEMBER') => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user?.userId;
    const orgId = req.user?.orgId;

    if (!userId || !orgId) return res.status(401).json({ message: 'Unauthorized' });

    try {
      const membership = await OrganizationMember.findOne({ userId, orgId });
      if (!membership || membership.status !== 'ACCEPTED') {
        return res.status(403).json({ message: 'No access to this organization' });
      }

      const roles = { OWNER: 3, ADMIN: 2, MEMBER: 1 };
      if (roles[membership.role] >= roles[minRole]) {
        req.user.role = membership.role; // attach real role
        next();
      } else {
        res.status(403).json({ message: 'Insufficient permissions' });
      }
    } catch (err) {
      res.status(500).json({ message: 'RBAC check failed' });
    }
  };
};