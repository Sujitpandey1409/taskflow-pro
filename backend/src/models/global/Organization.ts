import { Schema, model } from 'mongoose';

export interface IOrganization {
  _id: string;
  name: string;
  slug: string;
  dbName: string; // e.g., taskflow_org_abc123
  ownerId: string;
}

const orgSchema = new Schema<IOrganization>(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    dbName: { type: String, required: true, unique: true },
    ownerId: { type: String, required: true },
  },
  { timestamps: true }
);

export const Organization = model<IOrganization>('Organization', orgSchema);