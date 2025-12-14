// src/models/tenant/Project.ts
import { Schema } from 'mongoose';

const ProjectSchema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  status: {
    type: String,
    enum: ['ACTIVE', 'ARCHIVED', 'COMPLETED'],
    default: 'ACTIVE',
  },
  ownerId: {
    type: String,
    required: true,
  },
}, { timestamps: true });

export default ProjectSchema;