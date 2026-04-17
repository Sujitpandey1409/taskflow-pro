"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logout = exports.me = exports.refresh = exports.login = exports.register = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const zod_1 = require("zod");
const User_1 = require("../models/global/User");
const Organization_1 = require("../models/global/Organization");
const OrganizationMember_1 = require("../models/global/OrganizationMember");
const db_1 = require("../config/db");
const generateTokens_1 = require("../utils/generateTokens");
const registerSchema = zod_1.z.object({
    name: zod_1.z.string().min(2),
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(6),
    orgName: zod_1.z.string().min(2).optional(),
    registrationMode: zod_1.z.enum(["CREATE_ORG", "JOIN_INVITE"]).default("CREATE_ORG"),
});
const normalizeEmail = (email) => email.trim().toLowerCase();
const mergeMemberships = (currentMemberships = [], nextMemberships) => {
    const membershipMap = new Map();
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
const setCookie = (res, name, value, maxAge) => {
    const isProd = process.env.NODE_ENV === "production";
    res.cookie(name, value, {
        httpOnly: true,
        secure: true,
        sameSite: isProd ? "none" : "lax",
        domain: ".vercel.app",
        maxAge,
        path: "/",
    });
    const cookieString = [
        `${name}=${value}`,
        `Max-Age=${Math.floor(maxAge / 1000)}`,
        "Path=/",
        "HttpOnly",
        "Secure",
        isProd ? "SameSite=None" : "SameSite=Lax",
    ].join("; ");
    const existingCookies = res.getHeader("Set-Cookie") || [];
    const cookiesArray = (Array.isArray(existingCookies) ? existingCookies : [existingCookies]).filter((cookie) => typeof cookie === "string");
    res.setHeader("Set-Cookie", [...cookiesArray, cookieString]);
};
const acceptPendingInvitesForEmail = async (userId, email) => {
    const invites = await OrganizationMember_1.OrganizationMember.find({
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
const getMembershipRole = async (userId, orgId) => {
    const membership = await OrganizationMember_1.OrganizationMember.findOne({
        userId,
        orgId,
        status: "ACCEPTED",
    });
    return membership?.role ?? "MEMBER";
};
const register = async (req, res) => {
    let tenantConn = null;
    try {
        const { name, email, password, orgName, registrationMode } = registerSchema.parse(req.body);
        const normalizedEmail = normalizeEmail(email);
        await (0, db_1.connectGlobalDB)();
        const existingUser = await User_1.User.findOne({ email: normalizedEmail });
        if (existingUser) {
            return res.status(400).json({ message: "User already exists" });
        }
        const pendingInvites = await OrganizationMember_1.OrganizationMember.find({
            inviteEmail: normalizedEmail,
            status: "PENDING",
        });
        if (registrationMode === "JOIN_INVITE" && pendingInvites.length === 0) {
            return res.status(400).json({ message: "No pending organization invite found for this email" });
        }
        if (registrationMode === "CREATE_ORG" && !orgName?.trim()) {
            return res.status(400).json({ message: "Organization name is required to create a workspace" });
        }
        const salt = await bcryptjs_1.default.genSalt(10);
        const hashedPassword = await bcryptjs_1.default.hash(password, salt);
        const user = await User_1.User.create({
            name,
            email: normalizedEmail,
            password: hashedPassword,
        });
        if (registrationMode === "JOIN_INVITE") {
            const acceptedInvites = await acceptPendingInvitesForEmail(String(user._id), normalizedEmail);
            const primaryInvite = acceptedInvites[0];
            const primaryOrg = await Organization_1.Organization.findById(primaryInvite.orgId);
            if (!primaryOrg) {
                return res.status(404).json({ message: "Invited organization not found" });
            }
            const memberships = acceptedInvites.map((invite) => ({
                orgId: String(invite.orgId),
                role: invite.role,
                status: "ACCEPTED",
            }));
            await User_1.User.findByIdAndUpdate(user._id, {
                currentOrgId: primaryInvite.orgId,
                memberships,
            });
            const accessToken = (0, generateTokens_1.generateAccessToken)(String(user._id), String(primaryInvite.orgId), primaryInvite.role);
            const refreshToken = (0, generateTokens_1.generateRefreshToken)(String(user._id));
            setCookie(res, "access_token", accessToken, 15 * 60 * 1000);
            setCookie(res, "refresh_token", refreshToken, 7 * 24 * 60 * 60 * 1000);
            return res.status(201).json({
                message: "Account created and invite accepted successfully",
                user: { id: user._id, name, email: normalizedEmail },
                org: { id: primaryOrg._id, name: primaryOrg.name, slug: primaryOrg.slug },
            });
        }
        const slugSource = orgName.trim();
        const orgSlug = `${slugSource.toLowerCase().replace(/\s+/g, "-")}-${Date.now().toString(36)}`;
        const dbName = `taskflow_org_${user._id}`;
        const org = await Organization_1.Organization.create({
            name: slugSource,
            slug: orgSlug,
            dbName,
            ownerId: user._id,
        });
        await OrganizationMember_1.OrganizationMember.create({
            userId: String(user._id),
            inviteEmail: normalizedEmail,
            orgId: String(org._id),
            role: "OWNER",
            invitedBy: String(user._id),
            status: "ACCEPTED",
            joinedAt: new Date(),
        });
        tenantConn = await (0, db_1.connectTenantDB)(dbName);
        await User_1.User.findByIdAndUpdate(user._id, {
            currentOrgId: org._id,
            memberships: [{ orgId: String(org._id), role: "OWNER", status: "ACCEPTED" }],
        });
        const accessToken = (0, generateTokens_1.generateAccessToken)(String(user._id), String(org._id), "OWNER");
        const refreshToken = (0, generateTokens_1.generateRefreshToken)(String(user._id));
        setCookie(res, "access_token", accessToken, 15 * 60 * 1000);
        setCookie(res, "refresh_token", refreshToken, 7 * 24 * 60 * 60 * 1000);
        res.status(201).json({
            message: "User and organization created successfully",
            user: { id: user._id, name, email: normalizedEmail },
            org: { id: org._id, name: slugSource, slug: orgSlug },
        });
    }
    catch (err) {
        if (tenantConn) {
            try {
                await tenantConn.dropDatabase();
            }
            catch (rollbackErr) {
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
exports.register = register;
const login = async (req, res) => {
    try {
        const { email, password } = zod_1.z
            .object({
            email: zod_1.z.string().email(),
            password: zod_1.z.string().min(6),
        })
            .parse(req.body);
        const normalizedEmail = normalizeEmail(email);
        await (0, db_1.connectGlobalDB)();
        const user = await User_1.User.findOne({ email: normalizedEmail }).select("+password");
        if (!user) {
            return res.status(400).json({ message: "Invalid credentials" });
        }
        const isMatch = await bcryptjs_1.default.compare(password, user.password);
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
        const org = await Organization_1.Organization.findById(currentOrgId);
        if (!org) {
            return res.status(400).json({ message: "Organization not found" });
        }
        await User_1.User.findByIdAndUpdate(user._id, {
            currentOrgId,
            memberships: mergedMemberships,
        });
        const currentRole = await getMembershipRole(String(user._id), String(org._id));
        const accessToken = (0, generateTokens_1.generateAccessToken)(String(user._id), String(org._id), currentRole);
        const refreshToken = (0, generateTokens_1.generateRefreshToken)(String(user._id));
        setCookie(res, "access_token", accessToken, 15 * 60 * 1000);
        setCookie(res, "refresh_token", refreshToken, 7 * 24 * 60 * 60 * 1000);
        res.json({
            message: "Login successful",
            user: { id: user._id, name: user.name, email: user.email },
            org: { id: org._id, name: org.name, slug: org.slug },
        });
    }
    catch (err) {
        console.error("Login error:", err);
        res.status(500).json({ message: err.message });
    }
};
exports.login = login;
const refresh = async (req, res) => {
    const refreshToken = req.cookies.refresh_token;
    if (!refreshToken) {
        return res.status(401).json({ message: "No refresh token" });
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
        const user = await User_1.User.findById(decoded.userId);
        if (!user || !user.currentOrgId) {
            return res.status(401).json({ message: "Invalid refresh token" });
        }
        const org = await Organization_1.Organization.findById(user.currentOrgId);
        if (!org) {
            return res.status(401).json({ message: "Org not found" });
        }
        const role = await getMembershipRole(String(user._id), String(org._id));
        const newAccessToken = (0, generateTokens_1.generateAccessToken)(String(user._id), String(org._id), role);
        setCookie(res, "access_token", newAccessToken, 15 * 60 * 1000);
        return res.json({ message: "Token refreshed" });
    }
    catch (err) {
        console.error("Refresh error:", err);
        return res.status(401).json({ message: "Invalid refresh token" });
    }
};
exports.refresh = refresh;
const me = async (req, res) => {
    try {
        const { userId, orgId } = req.user;
        const user = await User_1.User.findById(userId).select("-password");
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        const org = await Organization_1.Organization.findById(orgId);
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
    }
    catch (error) {
        console.error("ME CONTROLLER ERROR:", error);
        res.status(500).json({ message: "Failed to fetch user data" });
    }
};
exports.me = me;
const logout = (_req, res) => {
    const isProd = process.env.NODE_ENV === "production";
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
    const expiredCookies = [
        `access_token=; Max-Age=0; Path=/; HttpOnly; Secure; ${isProd ? "SameSite=None" : "SameSite=Lax"}`,
        `refresh_token=; Max-Age=0; Path=/; HttpOnly; Secure; ${isProd ? "SameSite=None" : "SameSite=Lax"}`,
    ];
    res.setHeader("Set-Cookie", expiredCookies);
    res.json({ message: "Logged out" });
};
exports.logout = logout;
