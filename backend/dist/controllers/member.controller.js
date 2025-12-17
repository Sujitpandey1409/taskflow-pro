"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.inviteMember = void 0;
const OrganizationMember_1 = require("../models/global/OrganizationMember");
const User_1 = require("../models/global/User");
const inviteMember = async (req, res) => {
    const { email, role = 'MEMBER' } = req.body;
    const inviterId = req.user.userId;
    const orgId = req.user.orgId;
    try {
        let invitee = await User_1.User.findOne({ email });
        if (!invitee) {
            return res.status(404).json({ message: 'User not found — they need to register first' });
        }
        const existing = await OrganizationMember_1.OrganizationMember.findOne({
            userId: invitee._id,
            orgId,
        });
        if (existing) {
            if (existing.status === 'ACCEPTED') {
                return res.status(400).json({ message: 'User already in organization' });
            }
        }
        await OrganizationMember_1.OrganizationMember.create({
            userId: invitee._id,
            orgId,
            role,
            invitedBy: inviterId,
            status: 'PENDING',
        });
        res.json({ message: `Invite sent to ${email}` });
    }
    catch (err) {
        res.status(500).json({ message: err.message });
    }
};
exports.inviteMember = inviteMember;
