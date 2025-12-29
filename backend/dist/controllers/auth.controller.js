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
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
// === Zod Validation ===
const registerSchema = zod_1.z.object({
    name: zod_1.z.string().min(2),
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(6),
    orgName: zod_1.z.string().min(2),
});
// Helper: Safely load model schema
const loadModelSchema = (modelName) => {
    const filePath = path_1.default.join(__dirname, `../models/tenant/${modelName}.ts`);
    if (fs_1.default.existsSync(filePath)) {
        return (require(`../models/tenant/${modelName}`).TaskSchema ||
            require(`../models/tenant/${modelName}`).default);
    }
    return null;
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
        // 8. === SAFELY REGISTER ONLY EXISTING MODELS ===
        // 9. Set current org and add membership
        await User_1.User.findByIdAndUpdate(user._id, {
            currentOrgId: org._id,
            memberships: [{ orgId: org._id, role: "OWNER", status: "ACCEPTED" }],
        });
        // 10. Generate Tokens
        const accessToken = (0, generateTokens_1.generateAccessToken)(user._id, org._id, "OWNER");
        const refreshToken = (0, generateTokens_1.generateRefreshToken)(user._id);
        // 11. Set HttpOnly Cookies
        const isProd = process.env.NODE_ENV === "production";
        res.cookie("access_token", accessToken, {
            httpOnly: true,
            secure: isProd, // REQUIRED for SameSite=None
            sameSite: isProd ? "none" : "lax",
            maxAge: 15 * 60 * 1000,
            path: "/",
        });
        res.cookie("refresh_token", refreshToken, {
            httpOnly: true,
            secure: isProd,
            sameSite: isProd ? "none" : "lax",
            maxAge: 7 * 24 * 60 * 60 * 1000,
            path: "/",
        });
        // 12. Success
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
// login user and set tokens in cookies
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
        const accessToken = (0, generateTokens_1.generateAccessToken)(user._id, org._id, "OWNER"); // Role from org later
        const refreshToken = (0, generateTokens_1.generateRefreshToken)(user._id);
        // Set cookies
        const isProd = process.env.NODE_ENV === "production";
        res.cookie("access_token", accessToken, {
            httpOnly: true,
            secure: isProd, // REQUIRED for SameSite=None
            sameSite: isProd ? "none" : "lax",
            maxAge: 15 * 60 * 1000,
            path: "/",
        });
        res.cookie("refresh_token", refreshToken, {
            httpOnly: true,
            secure: isProd,
            sameSite: isProd ? "none" : "lax",
            maxAge: 7 * 24 * 60 * 60 * 1000,
            path: "/",
        });
        // process any pending invites
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
        res.status(500).json({ message: err.message });
    }
};
exports.login = login;
// if refresh token is valid, issue new access token
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
        const isProd = process.env.NODE_ENV === "production";
        res.cookie("access_token", newAccessToken, {
            httpOnly: true,
            secure: isProd, // REQUIRED
            sameSite: isProd ? "none" : "lax",
            maxAge: 15 * 60 * 1000,
            path: "/",
        });
        return res.json({ message: "Token refreshed" });
    }
    catch (err) {
        return res.status(401).json({ message: "Invalid refresh token" });
    }
};
exports.refresh = refresh;
// get current user info
const me = async (req, res) => {
    try {
        // 👇 Provided by protect middleware
        const { userId, orgId } = req.user;
        // 1️⃣ Fetch user (exclude password)
        const user = await User_1.User.findById(userId).select("-password");
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        // 2️⃣ Fetch organization
        const org = await Organization_1.Organization.findById(orgId);
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
    }
    catch (error) {
        console.error("ME CONTROLLER ERROR:", error);
        res.status(500).json({ message: "Failed to fetch user data" });
    }
};
exports.me = me;
// Logout user by clearing cookies
const logout = (req, res) => {
    res.clearCookie("access_token");
    res.clearCookie("refresh_token");
    res.json({ message: "Logged out" });
};
exports.logout = logout;
