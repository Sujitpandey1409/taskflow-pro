import { Schema, model } from 'mongoose';

export interface IUser {
  _id: string;
  email: string;
  password: string;
  name?: string;
  currentOrgId?: string;
}

const userSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    name: { type: String },
    currentOrgId: { type: String },
  },
  { timestamps: true }
);

export const User = model<IUser>('User', userSchema);