// src/utils/generateTokens.ts
import jwt from 'jsonwebtoken';

// Generate Access Token (short-lived: 15 mins)
export const generateAccessToken = (userId: string, orgId: string, role: string) => {
  return jwt.sign(
    { userId, orgId, role },
    process.env.JWT_SECRET!,
    { expiresIn: '15m' }
  );
};

// Generate Refresh Token (long-lived: 7 days)
export const generateRefreshToken = (userId: string) => {
  return jwt.sign(
    { userId },
    process.env.JWT_REFRESH_SECRET!,
    { expiresIn: '7d' }
  );
};