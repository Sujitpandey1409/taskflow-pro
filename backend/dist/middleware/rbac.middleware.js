"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireRole = void 0;
const OrganizationMember_1 = require("../models/global/OrganizationMember");
const requireRole = (minRole) => {
    return async (req, res, next) => {
        const userId = req.user?.userId;
        const orgId = req.user?.orgId;
        if (!userId || !orgId)
            return res.status(401).json({ message: 'Unauthorized' });
        try {
            const membership = await OrganizationMember_1.OrganizationMember.findOne({ userId, orgId });
            if (!membership || membership.status !== 'ACCEPTED') {
                return res.status(403).json({ message: 'No access to this organization' });
            }
            const roles = { OWNER: 3, ADMIN: 2, MEMBER: 1 };
            if (roles[membership.role] >= roles[minRole]) {
                req.user.role = membership.role; // attach real role
                next();
            }
            else {
                res.status(403).json({ message: 'Insufficient permissions' });
            }
        }
        catch (err) {
            res.status(500).json({ message: 'RBAC check failed' });
        }
    };
};
exports.requireRole = requireRole;
