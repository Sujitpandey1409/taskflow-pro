// src/controllers/member.controller.ts
import { Request, Response } from 'express';
import { OrganizationMember } from '../models/global/OrganizationMember';
import { User } from '../models/global/User';

export const inviteMember = async (req: Request, res: Response) => {
  const { email, role = 'MEMBER' } = req.body;
  const inviterId = req.user.userId;
  const orgId = req.user.orgId;

  try {
    let invitee = await User.findOne({ email });
    if (!invitee) {
      return res.status(404).json({ message: 'User not found — they need to register first' });
    }

    const existing = await OrganizationMember.findOne({
      userId: invitee._id,
      orgId,
    });

    if (existing) {
      if (existing.status === 'ACCEPTED') {
        return res.status(400).json({ message: 'User already in organization' });
      }
    }

    await OrganizationMember.create({
      userId: invitee._id,
      orgId,
      role,
      invitedBy: inviterId,
      status: 'PENDING',
    });

    res.json({ message: `Invite sent to ${email}` });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};