"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.protect = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const protect = async (req, res, next) => {
    const token = req.cookies.access_token;
    if (!token) {
        return res.status(401).json({ message: 'Not authorized, no token' });
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        // Attach user info to request
        req.user = {
            userId: decoded.userId,
            orgId: decoded.orgId,
            role: decoded.role,
        };
        next();
    }
    catch (err) {
        return res.status(401).json({ message: 'Token expired or invalid' });
    }
};
exports.protect = protect;
