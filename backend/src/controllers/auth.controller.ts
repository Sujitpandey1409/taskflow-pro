import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { User, IUser } from "../models/global/User";
import { Organization } from "../models/global/Organization";
import { OrganizationMember } from "../models/global/OrganizationMember";
import { connectGlobalDB, connectTenantDB } from "../config/db";
import { generateAccessToken, generateRefreshToken } from "../utils/generateTokens";

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  orgName: z.string().min(2).optional(),
  registrationMode: z.enum(["CREATE_ORG", "JOIN_INVITE"]).default("CREATE_ORG"),
});

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const isProd = process.env.NODE_ENV === "production";

const getCookieDomain = () => {
  const value = process.env.COOKIE_DOMAIN?.trim();
  return value ? value : undefined;
};

const mergeMemberships = (
  currentMemberships: IUser["memberships"] = [],
  nextMemberships: Array<{ orgId: string; role: string; status: string }>
) => {
  const membershipMap = new Map<string, { orgId: string; role: string; status: string }>();

  currentMemberships.forEach((membership) => {
    membershipMap.set(String(membership.orgId), {
      orgId: String(membership.orgId),
      role: membership.role,
      status: membership.status,
    });
  });

  nextMemberships.forEach((membership) => {
    membershipMap.set(String(membership.orgId), {
      orgId: String(membership.orgId),
      role: membership.role,
      status: membership.status,
    });
  });

  return Array.from(membershipMap.values());
};

const setCookie = (res: Response, name: string, value: string, maxAge: number) => {
  const domain = getCookieDomain();

  res.cookie(name, value, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    domain,
    maxAge,
    path: "/",
  });
};

const acceptPendingInvitesForEmail = async (userId: string, email: string) => {
  const invites = await OrganizationMember.find({
    inviteEmail: email,
    status: "PENDING",
  });

  for (const invite of invites) {
    invite.userId = userId;
    invite.status = "ACCEPTED";
    invite.joinedAt = new Date();
    await invite.save();
  }

  return invites;
};

const getMembershipRole = async (userId: string, orgId: string) => {
  const membership = await OrganizationMember.findOne({
    userId,
    orgId,
    status: "ACCEPTED",
  });

  return membership?.role ?? "MEMBER";
};

export const register = async (req: Request, res: Response) => {
  let tenantConn: any = null;

  try {
    const { name, email, password, orgName, registrationMode } = registerSchema.parse(req.body);
    const normalizedEmail = normalizeEmail(email);

    await connectGlobalDB();

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const pendingInvites = await OrganizationMember.find({
      inviteEmail: normalizedEmail,
      status: "PENDING",
    });

    if (registrationMode === "JOIN_INVITE" && pendingInvites.length === 0) {
      return res.status(400).json({ message: "No pending organization invite found for this email" });
    }

    if (registrationMode === "CREATE_ORG" && !orgName?.trim()) {
      return res.status(400).json({ message: "Organization name is required to create a workspace" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
      name,
      email: normalizedEmail,
      password: hashedPassword,
    });

    if (registrationMode === "JOIN_INVITE") {
      const acceptedInvites = await acceptPendingInvitesForEmail(String(user._id), normalizedEmail);
      const primaryInvite = acceptedInvites[0];
      const primaryOrg = await Organization.findById(primaryInvite.orgId);

      if (!primaryOrg) {
        return res.status(404).json({ message: "Invited organization not found" });
      }

      const memberships = acceptedInvites.map((invite) => ({
        orgId: String(invite.orgId),
        role: invite.role,
        status: "ACCEPTED",
      }));

      await User.findByIdAndUpdate(user._id, {
        currentOrgId: primaryInvite.orgId,
        memberships,
      });

      const accessToken = generateAccessToken(String(user._id), String(primaryInvite.orgId), primaryInvite.role);
      const refreshToken = generateRefreshToken(String(user._id));

      setCookie(res, "access_token", accessToken, 15 * 60 * 1000);
      setCookie(res, "refresh_token", refreshToken, 7 * 24 * 60 * 60 * 1000);

      return res.status(201).json({
        message: "Account created and invite accepted successfully",
        user: { id: user._id, name, email: normalizedEmail },
        org: { id: primaryOrg._id, name: primaryOrg.name, slug: primaryOrg.slug },
      });
    }

    const slugSource = orgName!.trim();
    const orgSlug = `${slugSource.toLowerCase().replace(/\s+/g, "-")}-${Date.now().toString(36)}`;
    const dbName = `taskflow_org_${user._id}`;

    const org = await Organization.create({
      name: slugSource,
      slug: orgSlug,
      dbName,
      ownerId: user._id,
    });

    await OrganizationMember.create({
      userId: String(user._id),
      inviteEmail: normalizedEmail,
      orgId: String(org._id),
      role: "OWNER",
      invitedBy: String(user._id),
      status: "ACCEPTED",
      joinedAt: new Date(),
    });

    tenantConn = await connectTenantDB(dbName);

    await User.findByIdAndUpdate(user._id, {
      currentOrgId: org._id,
      memberships: [{ orgId: String(org._id), role: "OWNER", status: "ACCEPTED" }],
    });

    const accessToken = generateAccessToken(String(user._id), String(org._id), "OWNER");
    const refreshToken = generateRefreshToken(String(user._id));

    setCookie(res, "access_token", accessToken, 15 * 60 * 1000);
    setCookie(res, "refresh_token", refreshToken, 7 * 24 * 60 * 60 * 1000);

    res.status(201).json({
      message: "User and organization created successfully",
      user: { id: user._id, name, email: normalizedEmail },
      org: { id: org._id, name: slugSource, slug: orgSlug },
    });
  } catch (err: any) {
    if (tenantConn) {
      try {
        await tenantConn.dropDatabase();
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

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = z
      .object({
        email: z.string().email(),
        password: z.string().min(6),
      })
      .parse(req.body);

    const normalizedEmail = normalizeEmail(email);

    await connectGlobalDB();

    const user: IUser | null = await User.findOne({ email: normalizedEmail }).select("+password");
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const acceptedInvites = await acceptPendingInvitesForEmail(String(user._id), normalizedEmail);
    const invitedMemberships = acceptedInvites.map((invite) => ({
      orgId: String(invite.orgId),
      role: invite.role,
      status: "ACCEPTED",
    }));

    const mergedMemberships = mergeMemberships(user.memberships, invitedMemberships);

    let currentOrgId = user.currentOrgId;
    if (!currentOrgId && mergedMemberships.length > 0) {
      currentOrgId = mergedMemberships[0].orgId;
    }

    if (!currentOrgId) {
      return res.status(400).json({ message: "No organization selected" });
    }

    const org = await Organization.findById(currentOrgId);
    if (!org) {
      return res.status(400).json({ message: "Organization not found" });
    }

    await User.findByIdAndUpdate(user._id, {
      currentOrgId,
      memberships: mergedMemberships,
    });

    const currentRole = await getMembershipRole(String(user._id), String(org._id));
    const accessToken = generateAccessToken(String(user._id), String(org._id), currentRole);
    const refreshToken = generateRefreshToken(String(user._id));

    setCookie(res, "access_token", accessToken, 15 * 60 * 1000);
    setCookie(res, "refresh_token", refreshToken, 7 * 24 * 60 * 60 * 1000);

    res.json({
      message: "Login successful",
      user: { id: user._id, name: user.name, email: user.email },
      org: { id: org._id, name: org.name, slug: org.slug },
    });
  } catch (err: any) {
    console.error("Login error:", err);
    res.status(500).json({ message: err.message });
  }
};

export const refresh = async (req: Request, res: Response) => {
  const refreshToken = req.cookies.refresh_token;

  if (!refreshToken) {
    return res.status(401).json({ message: "No refresh token" });
  }

  try {
    const decoded: any = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET!);
    const user = await User.findById(decoded.userId);

    if (!user || !user.currentOrgId) {
      return res.status(401).json({ message: "Invalid refresh token" });
    }

    const org = await Organization.findById(user.currentOrgId);
    if (!org) {
      return res.status(401).json({ message: "Org not found" });
    }

    const role = await getMembershipRole(String(user._id), String(org._id));
    const newAccessToken = generateAccessToken(String(user._id), String(org._id), role);

    setCookie(res, "access_token", newAccessToken, 15 * 60 * 1000);

    return res.json({ message: "Token refreshed" });
  } catch (err) {
    console.error("Refresh error:", err);
    return res.status(401).json({ message: "Invalid refresh token" });
  }
};

export const me = async (req: Request, res: Response) => {
  try {
    const { userId, orgId } = req.user as { userId: string; orgId: string; role: string };

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

export const logout = (_req: Request, res: Response) => {
  const domain = getCookieDomain();

  res.clearCookie("access_token", {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    domain,
    path: "/",
  });

  res.clearCookie("refresh_token", {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    domain,
    path: "/",
  });
  res.json({ message: "Logged out" });
};
