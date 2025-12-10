// src/controllers/auth.controller.ts
import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { User } from '../models/global/User';
import { Organization } from '../models/global/Organization';
import { connectGlobalDB, connectTenantDB } from '../config/db';
import { generateAccessToken, generateRefreshToken } from '../utils/generateTokens';
import { z } from 'zod';

// === Zod Validation ===
const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  orgName: z.string().min(2),
});

export const register = async (req: Request, res: Response) => {
  try {
    // 1. Validate input
    const { name, email, password, orgName } = registerSchema.parse(req.body);

    // 2. Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // 3. Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 4. Create User
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
    });

    // 5. Create Organization
    const orgSlug = orgName.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now().toString(36);
    const dbName = `taskflow_org_${user._id}`;

    const org = await Organization.create({
      name: orgName,
      slug: orgSlug,
      dbName,
      ownerId: user._id,
    });

    // 6. Create Tenant DB
    const tenantConn = await connectTenantDB(dbName);

    // 7. Initialize Tenant Models (Task, Project, etc.)
    tenantConn.model('Task', require('../models/tenant/Task').TaskSchema);
    tenantConn.model('Project', require('../models/tenant/Project').ProjectSchema);

    // 8. Set current org
    user.currentOrgId = org._id;
    await user.save();

    // 9. Generate Tokens
    const accessToken = generateAccessToken(user._id, org._id, 'OWNER');
    const refreshToken = generateRefreshToken(user._id);

    // 10. Set HttpOnly Cookies
    res.cookie('access_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000, // 15 mins
    });

    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // 11. Send Response
    res.status(201).json({
      message: 'User registered successfully',
      user: { id: user._id, name, email, currentOrgId: org._id },
      org: { id: org._id, name: orgName, slug: org.slug },
    });

  } catch (err: any) {
    console.error('Register error:', err);
    res.status(500).json({ message: err.message || 'Server error' });
  }
};