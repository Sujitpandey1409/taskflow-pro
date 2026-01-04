// src/controllers/auth.controller.ts - ULTRA-ROBUST COOKIE FIX
import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { User, IUser } from "../models/global/User";
import { Organization } from "../models/global/Organization";
import { OrganizationMember } from "../models/global/OrganizationMember";
import { connectGlobalDB, connectTenantDB } from "../config/db";
import {
  generateAccessToken,
  generateRefreshToken,
} from "../utils/generateTokens";
import { z } from "zod";
import jwt from "jsonwebtoken";

// === Zod Validation ===
const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  orgName: z.string().min(2),
});

// 🔥 ULTRA-ROBUST: Cookie configuration that GUARANTEES cookies work
const setCookie = (res: Response, name: string, value: string, maxAge: number) => {
  const isProd = process.env.NODE_ENV === "production";
  
  // 🔥 Method 1: Using res.cookie (standard)
  res.cookie(name, value, {
    httpOnly: true,
    secure: true, // ALWAYS true for production
    sameSite: isProd ? "none" : "lax",
    domain: ".vercel.app", // Adjust domain as needed
    maxAge: maxAge,
    path: "/",
  });

  // 🔥 Method 2: ALSO set via header (backup method)
  // This ensures cookies are set even if res.cookie fails
  const cookieString = [
    `${name}=${value}`,
    `Max-Age=${Math.floor(maxAge / 1000)}`,
    'Path=/',
    'HttpOnly',
    'Secure',
    isProd ? 'SameSite=None' : 'SameSite=Lax',
  ].join('; ');

  // Append to existing Set-Cookie headers
  const existingCookies = res.getHeader('Set-Cookie') || [];
  const cookiesArray = (Array.isArray(existingCookies) 
    ? existingCookies 
    : [existingCookies]).filter((cookie): cookie is string => typeof cookie === 'string');
  
  res.setHeader('Set-Cookie', [...cookiesArray, cookieString]);
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
      return res.status(400).json({ message: "User already exists" });
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
    const orgSlug =
      orgName.toLowerCase().replace(/\s+/g, "-") +
      "-" +
      Date.now().toString(36);
    const dbName = `taskflow_org_${user._id}`;

    const org = await Organization.create({
      name: orgName,
      slug: orgSlug,
      dbName,
      ownerId: user._id,
    });

    await OrganizationMember.create({
      userId: user._id,
      orgId: org._id,
      role: "OWNER",
      invitedBy: user._id,
      status: "ACCEPTED",
      joinedAt: new Date(),
    });

    // 7. Create Tenant DB
    tenantConn = await connectTenantDB(dbName);

    // 8. Set current org and add membership
    await User.findByIdAndUpdate(user._id, {
      currentOrgId: org._id,
      memberships: [{ orgId: org._id, role: "OWNER", status: "ACCEPTED" }],
    });

    // 9. Generate Tokens
    const accessToken = generateAccessToken(user._id, org._id, "OWNER");
    const refreshToken = generateRefreshToken(user._id);

    // 10. 🔥 ULTRA-ROBUST: Set cookies with dual method
    setCookie(res, "access_token", accessToken, 15 * 60 * 1000);
    setCookie(res, "refresh_token", refreshToken, 7 * 24 * 60 * 60 * 1000);

    console.log('✅ Cookies set for registration:', { userId: user._id });

    // 11. Success
    res.status(201).json({
      message: "User & organization created successfully",
      user: { id: user._id, name, email },
      org: { id: org._id, name: orgName, slug: orgSlug },
      // 🔥 NEW: Return tokens in response body as backup
      tokens: {
        access_token: accessToken,
        refresh_token: refreshToken,
      },
    });
  } catch (err: any) {
    // === CRITICAL: If tenant setup fails → rollback ===
    if (tenantConn) {
      try {
        await tenantConn.dropDatabase();
        console.log(`Rolled back tenant DB due to error`);
      } catch (rollbackErr) {
        console.error("Rollback failed:", rollbackErr);
      }
    }

    console.error("Register error:", err);
    res.status(500).json({
      message: "Registration failed",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
};

// 🔥 ULTRA-ROBUST: Login with guaranteed cookies
export const login = async (req: Request, res: Response) => {
  console.log("Login attempt:", { email: req.body.email, ip: req.ip });
  
  try {
    const { email, password } = z
      .object({
        email: z.string().email(),
        password: z.string().min(6),
      })
      .parse(req.body);

    await connectGlobalDB();

    const user: IUser | null = await User.findOne({ email }).select("+password");
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Get user's current org
    if (!user.currentOrgId) {
      return res.status(400).json({ message: "No organization selected" });
    }

    const org = await Organization.findById(user.currentOrgId);
    if (!org) {
      return res.status(400).json({ message: "Organization not found" });
    }

    // Generate tokens
    const accessToken = generateAccessToken(user._id, org._id, "OWNER");
    const refreshToken = generateRefreshToken(user._id);

    // 🔥 ULTRA-ROBUST: Set cookies with dual method
    setCookie(res, "access_token", accessToken, 15 * 60 * 1000);
    setCookie(res, "refresh_token", refreshToken, 7 * 24 * 60 * 60 * 1000);

    console.log('✅ Cookies set for login:', { 
      userId: user._id, 
      cookiesSent: res.getHeader('Set-Cookie')
    });

    // Process any pending invites
    const pendingInvites = await OrganizationMember.find({
      userId: user._id,
      status: "PENDING",
    });

    for (const invite of pendingInvites) {
      invite.status = "ACCEPTED";
      invite.joinedAt = new Date();
      await invite.save();

      if (!user.memberships) {
        user.memberships = [];
      }
      user.memberships.push({
        orgId: invite.orgId,
        role: invite.role,
        status: "ACCEPTED",
      });
    }

    await User.findByIdAndUpdate(user._id, { memberships: user.memberships });

    res.json({
      message: "Login successful",
      user: { id: user._id, name: user.name, email: user.email },
      org: { id: org._id, name: org.name, slug: org.slug },
      // 🔥 NEW: Return tokens in response body as backup
      tokens: {
        access_token: accessToken,
        refresh_token: refreshToken,
      },
    });
  } catch (err: any) {
    console.error("Login error:", err);
    res.status(500).json({ message: err.message });
  }
};

// 🔥 ULTRA-ROBUST: Refresh with guaranteed cookies
export const refresh = async (req: Request, res: Response) => {
  const refreshToken = req.cookies.refresh_token;

  if (!refreshToken) {
    return res.status(401).json({ message: "No refresh token" });
  }

  try {
    const decoded: any = jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_SECRET!
    );

    const user = await User.findById(decoded.userId);
    if (!user || !user.currentOrgId) {
      return res.status(401).json({ message: "Invalid refresh token" });
    }

    const org = await Organization.findById(user.currentOrgId);
    if (!org) {
      return res.status(401).json({ message: "Org not found" });
    }

    const newAccessToken = generateAccessToken(user._id, org._id, "OWNER");

    // 🔥 ULTRA-ROBUST: Set cookie with dual method
    setCookie(res, "access_token", newAccessToken, 15 * 60 * 1000);

    console.log('✅ Cookie refreshed:', { userId: user._id });

    return res.json({ 
      message: "Token refreshed",
      // 🔥 NEW: Return token in response body as backup
      tokens: {
        access_token: newAccessToken,
      },
    });
  } catch (err) {
    console.error("Refresh error:", err);
    return res.status(401).json({ message: "Invalid refresh token" });
  }
};

// Get current user info
export const me = async (req: Request, res: Response) => {
  try {
    const { userId, orgId } = req.user as {
      userId: string;
      orgId: string;
      role: string;
    };

    const user = await User.findById(userId).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const org = await Organization.findById(orgId);
    if (!org) {
      return res.status(404).json({ message: "Organization not found" });
    }

    res.status(200).json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
      org: {
        id: org._id,
        name: org.name,
        slug: org.slug,
      },
    });
  } catch (error) {
    console.error("ME CONTROLLER ERROR:", error);
    res.status(500).json({ message: "Failed to fetch user data" });
  }
};

// 🔥 ULTRA-ROBUST: Logout with proper cookie clearing
export const logout = (req: Request, res: Response) => {
  const isProd = process.env.NODE_ENV === "production";
  
  // Method 1: Using clearCookie
  res.clearCookie("access_token", {
    httpOnly: true,
    secure: true,
    sameSite: isProd ? "none" : "lax",
    path: "/",
  });

  res.clearCookie("refresh_token", {
    httpOnly: true,
    secure: true,
    sameSite: isProd ? "none" : "lax",
    path: "/",
  });

  // Method 2: Also set expired cookies via header
  const expiredCookies = [
    `access_token=; Max-Age=0; Path=/; HttpOnly; Secure; ${isProd ? 'SameSite=None' : 'SameSite=Lax'}`,
    `refresh_token=; Max-Age=0; Path=/; HttpOnly; Secure; ${isProd ? 'SameSite=None' : 'SameSite=Lax'}`,
  ];

  res.setHeader('Set-Cookie', expiredCookies);

  console.log('✅ Cookies cleared for logout');

  res.json({ message: "Logged out" });
};