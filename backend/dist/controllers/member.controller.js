"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMembers = exports.inviteMember = void 0;
const OrganizationMember_1 = require("../models/global/OrganizationMember");
const User_1 = require("../models/global/User");
const inviteMember = async (req, res) => {
    const { email, role = "MEMBER" } = req.body;
    const inviterId = req.user.userId;
    const orgId = req.user.orgId;
    const normalizedEmail = email.toLowerCase().trim();
    try {
        const invitee = await User_1.User.findOne({ email: normalizedEmail });
        const existing = await OrganizationMember_1.OrganizationMember.findOne({
            inviteEmail: normalizedEmail,
            orgId,
        });
        if (existing) {
            if (existing.status === "ACCEPTED") {
                return res.status(400).json({ message: "User already in organization" });
            }
            existing.role = role;
            existing.invitedBy = inviterId;
            existing.userId = invitee?._id?.toString();
            await existing.save();
            return res.json({ message: `Invite updated for ${normalizedEmail}` });
        }
        await OrganizationMember_1.OrganizationMember.create({
            userId: invitee?._id?.toString(),
            inviteEmail: normalizedEmail,
            orgId,
            role,
            invitedBy: inviterId,
            status: "PENDING",
        });
        res.json({ message: `Invite recorded for ${normalizedEmail}` });
    }
    catch (err) {
        res.status(500).json({ message: err.message });
    }
};
exports.inviteMember = inviteMember;
const getMembers = async (req, res) => {
    const orgId = req.user.orgId;
    try {
        const memberships = await OrganizationMember_1.OrganizationMember.find({ orgId }).lean();
        const memberUserIds = memberships
            .map((membership) => membership.userId)
            .filter((userId) => Boolean(userId));
        const users = await User_1.User.find({
            _id: { $in: memberUserIds },
        })
            .select("name email")
            .lean();
        const userMap = new Map(users.map((user) => [String(user._id), user]));
        const members = memberships.map((membership) => {
            const user = membership.userId ? userMap.get(String(membership.userId)) : null;
            return {
                userId: membership.userId ? String(membership.userId) : "",
                name: user?.name ?? "Pending invite",
                email: user?.email ?? membership.inviteEmail,
                role: membership.role,
                status: membership.status,
            };
        });
        res.json({ members });
    }
    catch (err) {
        res.status(500).json({ message: err.message });
    }
};
exports.getMembers = getMembers;
