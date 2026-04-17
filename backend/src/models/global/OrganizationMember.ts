// src/models/global/OrganizationMember.ts
import { Schema, model } from 'mongoose';

export interface IOrganizationMember {
  userId?: string;
  inviteEmail: string;
  orgId: string;
  role: 'OWNER' | 'ADMIN' | 'MEMBER';
  invitedBy: string;
  invitedAt?: Date;
  joinedAt?: Date;
  status: 'PENDING' | 'ACCEPTED';
}

const memberSchema = new Schema<IOrganizationMember>({
  userId: { type: String },
  inviteEmail: { type: String, required: true, lowercase: true, trim: true },
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

memberSchema.index({ orgId: 1, inviteEmail: 1 }, { unique: true });

export const OrganizationMember = model<IOrganizationMember>('OrganizationMember', memberSchema);
