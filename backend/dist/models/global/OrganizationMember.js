"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrganizationMember = void 0;
// src/models/global/OrganizationMember.ts
const mongoose_1 = require("mongoose");
const memberSchema = new mongoose_1.Schema({
    userId: { type: String, required: true },
    orgId: { type: String, required: true },
    role: {
        type: String,
        enum: ['OWNER', 'ADMIN', 'MEMBER'],
        default: 'MEMBER',
    },
    invitedBy: { type: String, required: true },
    invitedAt: { type: Date, default: Date.now },
    joinedAt: { type: Date },
    status: { type: String, enum: ['PENDING', 'ACCEPTED'], default: 'PENDING' },
}, { timestamps: true });
// Unique: one user per org
memberSchema.index({ userId: 1, orgId: 1 }, { unique: true });
exports.OrganizationMember = (0, mongoose_1.model)('OrganizationMember', memberSchema);
