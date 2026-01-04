"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logout = exports.me = exports.refresh = exports.login = exports.register = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const User_1 = require("../models/global/User");
const Organization_1 = require("../models/global/Organization");
const OrganizationMember_1 = require("../models/global/OrganizationMember");
const db_1 = require("../config/db");
const generateTokens_1 = require("../utils/generateTokens");
const zod_1 = require("zod");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
// === Zod Validation ===
const registerSchema = zod_1.z.object({
    name: zod_1.z.string().min(2),
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(6),
    orgName: zod_1.z.string().min(2),
});
// 🔥 ULTRA-ROBUST: Cookie configuration that GUARANTEES cookies work
const setCookie = (res, name, value, maxAge) => {
    const isProd = process.env.NODE_ENV === "production";
    // 🔥 Method 1: Using res.cookie (standard)
    res.cookie(name, value, {
        httpOnly: true,
        secure: true, // ALWAYS true for production
        sameSite: isProd ? "none" : "lax",
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
        : [existingCookies]).filter((cookie) => typeof cookie === 'string');
    res.setHeader('Set-Cookie', [...cookiesArray, cookieString]);
};
const register = async (req, res) => {
    let tenantConn = null;
    try {
        // 1. Validate input
        const { name, email, password, orgName } = registerSchema.parse(req.body);
        // 2. Connect to global DB
        await (0, db_1.connectGlobalDB)();
        // 3. Check if user exists
        const existingUser = await User_1.User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: "User already exists" });
        }
        // 4. Hash password
        const salt = await bcryptjs_1.default.genSalt(10);
        const hashedPassword = await bcryptjs_1.default.hash(password, salt);
        // 5. Create User
        const user = await User_1.User.create({
            name,
            email,
            password: hashedPassword,
        });
        // 6. Create Organization
        const orgSlug = orgName.toLowerCase().replace(/\s+/g, "-") +
            "-" +
            Date.now().toString(36);
        const dbName = `taskflow_org_${user._id}`;
        const org = await Organization_1.Organization.create({
            name: orgName,
            slug: orgSlug,
            dbName,
            ownerId: user._id,
        });
        await OrganizationMember_1.OrganizationMember.create({
            userId: user._id,
            orgId: org._id,
            role: "OWNER",
            invitedBy: user._id,
            status: "ACCEPTED",
            joinedAt: new Date(),
        });
        // 7. Create Tenant DB
        tenantConn = await (0, db_1.connectTenantDB)(dbName);
        // 8. Set current org and add membership
        await User_1.User.findByIdAndUpdate(user._id, {
            currentOrgId: org._id,
            memberships: [{ orgId: org._id, role: "OWNER", status: "ACCEPTED" }],
        });
        // 9. Generate Tokens
        const accessToken = (0, generateTokens_1.generateAccessToken)(user._id, org._id, "OWNER");
        const refreshToken = (0, generateTokens_1.generateRefreshToken)(user._id);
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
    }
    catch (err) {
        // === CRITICAL: If tenant setup fails → rollback ===
        if (tenantConn) {
            try {
                await tenantConn.dropDatabase();
                console.log(`Rolled back tenant DB due to error`);
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
// 🔥 ULTRA-ROBUST: Login with guaranteed cookies
const login = async (req, res) => {
    console.log("Login attempt:", { email: req.body.email, ip: req.ip });
    try {
        const { email, password } = zod_1.z
            .object({
            email: zod_1.z.string().email(),
            password: zod_1.z.string().min(6),
        })
            .parse(req.body);
        await (0, db_1.connectGlobalDB)();
        const user = await User_1.User.findOne({ email }).select("+password");
        if (!user) {
            return res.status(400).json({ message: "Invalid credentials" });
        }
        const isMatch = await bcryptjs_1.default.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: "Invalid credentials" });
        }
        // Get user's current org
        if (!user.currentOrgId) {
            return res.status(400).json({ message: "No organization selected" });
        }
        const org = await Organization_1.Organization.findById(user.currentOrgId);
        if (!org) {
            return res.status(400).json({ message: "Organization not found" });
        }
        // Generate tokens
        const accessToken = (0, generateTokens_1.generateAccessToken)(user._id, org._id, "OWNER");
        const refreshToken = (0, generateTokens_1.generateRefreshToken)(user._id);
        // 🔥 ULTRA-ROBUST: Set cookies with dual method
        setCookie(res, "access_token", accessToken, 15 * 60 * 1000);
        setCookie(res, "refresh_token", refreshToken, 7 * 24 * 60 * 60 * 1000);
        console.log('✅ Cookies set for login:', {
            userId: user._id,
            cookiesSent: res.getHeader('Set-Cookie')
        });
        // Process any pending invites
        const pendingInvites = await OrganizationMember_1.OrganizationMember.find({
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
        await User_1.User.findByIdAndUpdate(user._id, { memberships: user.memberships });
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
    }
    catch (err) {
        console.error("Login error:", err);
        res.status(500).json({ message: err.message });
    }
};
exports.login = login;
// 🔥 ULTRA-ROBUST: Refresh with guaranteed cookies
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
        const newAccessToken = (0, generateTokens_1.generateAccessToken)(user._id, org._id, "OWNER");
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
    }
    catch (err) {
        console.error("Refresh error:", err);
        return res.status(401).json({ message: "Invalid refresh token" });
    }
};
exports.refresh = refresh;
// Get current user info
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
// 🔥 ULTRA-ROBUST: Logout with proper cookie clearing
const logout = (req, res) => {
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
exports.logout = logout;
