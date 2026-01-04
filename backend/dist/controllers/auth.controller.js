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
// 🔥 IMPROVED: Cookie configuration helper
const getCookieConfig = (maxAge) => {
    const isProd = process.env.NODE_ENV === "production";
    return {
        httpOnly: true,
        secure: true, // ALWAYS true in production (required for SameSite=None)
        sameSite: isProd ? "none" : "lax",
        maxAge,
        path: "/",
        // 🔥 NEW: Explicitly set domain for cross-origin
        ...(isProd && process.env.COOKIE_DOMAIN && {
            domain: process.env.COOKIE_DOMAIN, // e.g., ".yourdomain.com"
        }),
    };
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
        // 10. 🔥 IMPROVED: Set HttpOnly Cookies with proper config
        res.cookie("access_token", accessToken, getCookieConfig(15 * 60 * 1000));
        res.cookie("refresh_token", refreshToken, getCookieConfig(7 * 24 * 60 * 60 * 1000));
        // 11. Success
        res.status(201).json({
            message: "User & organization created successfully",
            user: { id: user._id, name, email },
            org: { id: org._id, name: orgName, slug: orgSlug },
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
// 🔥 IMPROVED: Login with better cookie handling
const login = async (req, res) => {
    console.log("Login attempt:", req.body);
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
        // 🔥 IMPROVED: Set cookies with proper config
        res.cookie("access_token", accessToken, getCookieConfig(15 * 60 * 1000));
        res.cookie("refresh_token", refreshToken, getCookieConfig(7 * 24 * 60 * 60 * 1000));
        // Process any pending invites
        const pendingInvites = await OrganizationMember_1.OrganizationMember.find({
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
        await User_1.User.findByIdAndUpdate(user._id, { memberships: user.memberships });
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
// 🔥 IMPROVED: Refresh with better cookie handling
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
        // 🔥 IMPROVED: Set cookie with proper config
        res.cookie("access_token", newAccessToken, getCookieConfig(15 * 60 * 1000));
        return res.json({ message: "Token refreshed" });
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
        // Fetch user (exclude password)
        const user = await User_1.User.findById(userId).select("-password");
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        // Fetch organization
        const org = await Organization_1.Organization.findById(orgId);
        if (!org) {
            return res.status(404).json({ message: "Organization not found" });
        }
        // Respond with clean data
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
// Logout user by clearing cookies
const logout = (req, res) => {
    // 🔥 IMPROVED: Clear cookies with same config
    const isProd = process.env.NODE_ENV === "production";
    const clearConfig = {
        httpOnly: true,
        secure: true,
        sameSite: isProd ? "none" : "lax",
        path: "/",
        ...(isProd && process.env.COOKIE_DOMAIN && {
            domain: process.env.COOKIE_DOMAIN,
        }),
    };
    res.clearCookie("access_token", clearConfig);
    res.clearCookie("refresh_token", clearConfig);
    res.json({ message: "Logged out" });
};
exports.logout = logout;
