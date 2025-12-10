// src/middleware/tenant.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { connectTenantDB } from '../config/db';
import { Organization } from '../models/global/Organization';

export const loadTenantDB = async (req: Request, res: Response, next: NextFunction) => {
  const orgId = req.user?.orgId;

  if (!orgId) {
    return res.status(400).json({ message: 'No organization selected' });
  }

  try {
    const org = await Organization.findById(orgId);
    if (!org) return res.status(404).json({ message: 'Organization not found' });

    // Connect to tenant DB
    const tenantConn = await connectTenantDB(org.dbName);

    // Attach models to req.tenantDB
    req.tenantDB = {
      Task: tenantConn.model('Task', require('../models/tenant/Task').TaskSchema),
      Project: tenantConn.model('Project', require('../models/tenant/Project').ProjectSchema),
      // Add more later
    };

    next();
  } catch (err) {
    return res.status(500).json({ message: 'Failed to load tenant database' });
  }
};