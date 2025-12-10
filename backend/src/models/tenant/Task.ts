// src/models/tenant/Task.ts
import { Schema, Document, Model, Types } from 'mongoose';

export interface ITask extends Document {
  title: string;
  description?: string;
  status: 'TODO' | 'IN_PROGRESS' | 'DONE';
  assignee?: Types.ObjectId | null;
  projectId: Schema.Types.ObjectId;
}

export const TaskSchema = new Schema<ITask>(
  {
    title: { type: String, required: true },
    description: String,
    status: { type: String, enum: ['TODO', 'IN_PROGRESS', 'DONE'], default: 'TODO' },
    assignee: { type: Schema.Types.ObjectId },
    projectId: { type: Schema.Types.ObjectId, required: true },
  },
  { timestamps: true }
);

// We'll attach this to tenant connection later