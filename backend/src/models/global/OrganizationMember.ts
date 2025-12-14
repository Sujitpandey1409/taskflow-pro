// src/models/global/OrganizationMember.ts
import { Schema, model } from 'mongoose';

export interface IOrganizationMember {
  userId: string;
  orgId: string;
  role: 'OWNER' | 'ADMIN' | 'MEMBER';
  invitedBy: string;
  invitedAt?: Date;
  joinedAt?: Date;
  status: 'PENDING' | 'ACCEPTED';
}

const memberSchema = new Schema<IOrganizationMember>({
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

export const OrganizationMember = model<IOrganizationMember>('OrganizationMember', memberSchema);