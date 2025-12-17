"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateRefreshToken = exports.generateAccessToken = void 0;
// src/utils/generateTokens.ts
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
// Generate Access Token (short-lived: 15 mins)
const generateAccessToken = (userId, orgId, role) => {
    return jsonwebtoken_1.default.sign({ userId, orgId, role }, process.env.JWT_SECRET, { expiresIn: '15m' });
};
exports.generateAccessToken = generateAccessToken;
// Generate Refresh Token (long-lived: 7 days)
const generateRefreshToken = (userId) => {
    return jsonwebtoken_1.default.sign({ userId }, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });
};
exports.generateRefreshToken = generateRefreshToken;
