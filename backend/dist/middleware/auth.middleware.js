"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.protect = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const protect = async (req, res, next) => {
    let token;
    token = req.cookies.access_token;
    if (!token && req.headers.authorization?.startsWith('Bearer ')) {
        token = req.headers.authorization.substring(7);
        console.log('⚠️  Using token from Authorization header (cookie not found)');
    }
    // No token found anywhere
    if (!token) {
        console.log('❌ No token found in cookies or headers');
        return res.status(401).json({
            message: 'Not authorized, no token',
            debug: process.env.NODE_ENV === 'development' ? {
                hasCookie: !!req.cookies.access_token,
                hasAuthHeader: !!req.headers.authorization,
                cookies: Object.keys(req.cookies),
                origin: req.headers.origin,
            } : undefined,
        });
    }
    try {
        // Verify token
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        // Attach user info to request
        req.user = {
            userId: decoded.userId,
            orgId: decoded.orgId,
            role: decoded.role,
        };
        console.log(`✅ Auth successful: User ${decoded.userId}`);
        next();
    }
    catch (err) {
        console.error('❌ Token verification failed:', err.message);
        return res.status(401).json({
            message: 'Token expired or invalid',
            error: process.env.NODE_ENV === 'development' ? err.message : undefined,
        });
    }
};
exports.protect = protect;
