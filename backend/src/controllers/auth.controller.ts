// src/controllers/auth.controller.ts (FIXED VERSION)
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
import path from "path";
import fs from "fs";
import jwt from "jsonwebtoken";

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
    return (
      require(`../models/tenant/${modelName}`).TaskSchema ||
      require(`../models/tenant/${modelName}`).default
    );
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

    // 8. === SAFELY REGISTER ONLY EXISTING MODELS ===
    

    // 9. Set current org and add membership
    await User.findByIdAndUpdate(user._id, {
      currentOrgId: org._id,
      memberships: [{ orgId: org._id, role: "OWNER", status: "ACCEPTED" }],
    });

    // 10. Generate Tokens
    const accessToken = generateAccessToken(user._id, org._id, "OWNER");
    const refreshToken = generateRefreshToken(user._id);

    // 11. Set HttpOnly Cookies
    res.cookie("access_token", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 15 * 60 * 1000,
    });

    res.cookie("refresh_token", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    // 12. Success
    res.status(201).json({
      message: "User & organization created successfully",
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

// login user and set tokens in cookies
export const login = async (req: Request, res: Response) => {
  console.log("Login attempt:", req.body);
  try {
    const { email, password } = z
      .object({
        email: z.string().email(),
        password: z.string().min(6),
      })
      .parse(req.body);

    await connectGlobalDB();

    const user: IUser | null = await User.findOne({ email }).select(
      "+password"
    );
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
    const accessToken = generateAccessToken(user._id, org._id, "OWNER"); // Role from org later
    const refreshToken = generateRefreshToken(user._id);

    // Set cookies
    res.cookie("access_token", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 15 * 60 * 1000,
    });

    res.cookie("refresh_token", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    // process any pending invites
    const pendingInvites = await OrganizationMember.find({
      userId: user._id,
      status: "PENDING",
    });

    for (const invite of pendingInvites) {
      invite.status = "ACCEPTED";
      invite.joinedAt = new Date();
      await invite.save();

      // Add to user memberships
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
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

// if refresh token is valid, issue new access token
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
    if (!org) return res.status(401).json({ message: "Org not found" });

    const newAccessToken = generateAccessToken(user._id, org._id, "OWNER");

    res.cookie("access_token", newAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 15 * 60 * 1000,
    });

    res.json({ message: "Token refreshed" });
  } catch (err) {
    res.status(401).json({ message: "Invalid refresh token" });
  }
};

// get current user info
export const me = async (req: Request, res: Response) => {
  try {
    // 👇 Provided by protect middleware
    const { userId, orgId } = req.user as {
      userId: string;
      orgId: string;
      role: string;
    };

    // 1️⃣ Fetch user (exclude password)
    const user = await User.findById(userId).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // 2️⃣ Fetch organization
    const org = await Organization.findById(orgId);
    if (!org) {
      return res.status(404).json({ message: "Organization not found" });
    }

    // 3️⃣ Respond with clean data
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


// Logout user by clearing cookies
export const logout = (req: Request, res: Response) => {
  res.clearCookie("access_token");
  res.clearCookie("refresh_token");
  res.json({ message: "Logged out" });
};
