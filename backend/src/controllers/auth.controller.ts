// src/controllers/auth.controller.ts (FIXED VERSION)
import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { User } from '../models/global/User';
import { Organization } from '../models/global/Organization';
import { connectGlobalDB, connectTenantDB } from '../config/db';
import { generateAccessToken, generateRefreshToken } from '../utils/generateTokens';
import { z } from 'zod';
import path from 'path';
import fs from 'fs';

// === Zod Validation ===
const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  orgName: z.string().min(2),
});

// Helper: Safely load model schema
const loadModelSchema = (modelName: string) => {
  const filePath = path.join(__dirname, `../models/tenant/${modelName}.ts`);
  if (fs.existsSync(filePath)) {
    return require(`../models/tenant/${modelName}`).TaskSchema || require(`../models/tenant/${modelName}`).default;
  }
  return null;
};

export const register = async (req: Request, res: Response) => {
  let tenantConn: any = null;

  try {
    // 1. Validate input
    const { name, email, password, orgName } = registerSchema.parse(req.body);

    // 2. Connect to global DB
    await connectGlobalDB();

    // 3. Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // 4. Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 5. Create User
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
    });

    // 6. Create Organization
    const orgSlug = orgName.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now().toString(36);
    const dbName = `taskflow_org_${user._id}`;

    const org = await Organization.create({
      name: orgName,
      slug: orgSlug,
      dbName,
      ownerId: user._id,
    });

    // 7. Create Tenant DB
    tenantConn = await connectTenantDB(dbName);

    // 8. === SAFELY REGISTER ONLY EXISTING MODELS ===
    const modelsToLoad = ['Task']; // Add more later: 'Project', 'Comment', etc.

    for (const modelName of modelsToLoad) {
      const schema = loadModelSchema(modelName);
      if (schema) {
        tenantConn.model(modelName, schema);
        console.log(`Model '${modelName}' registered in tenant DB: ${dbName}`);
      } else {
        console.warn(`Model file '${modelName}.ts' not found — skipping`);
      }
    }

    // 9. Set current org
    user.currentOrgId = org._id;
    await user.save();

    // 10. Generate Tokens
    const accessToken = generateAccessToken(user._id, org._id, 'OWNER');
    const refreshToken = generateRefreshToken(user._id);

    // 11. Set HttpOnly Cookies
    res.cookie('access_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000,
    });

    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    // 12. Success
    res.status(201).json({
      message: 'User & organization created successfully',
      user: { id: user._id, name, email },
      org: { id: org._id, name: orgName, slug: orgSlug },
    });

  } catch (err: any) {
    // === CRITICAL: If tenant setup fails → rollback ===
    if (tenantConn) {
      try {
        await tenantConn.dropDatabase();
        console.log(`Rolled back tenant DB due to error`);
      } catch (rollbackErr) {
        console.error('Rollback failed:', rollbackErr);
      }
    }

    console.error('Register error:', err);
    res.status(500).json({ 
      message: 'Registration failed', 
      error: process.env.NODE_ENV === 'development' ? err.message : undefined 
    });
  }
};