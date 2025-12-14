// src/models/tenant/Task.ts
import { Schema } from "mongoose";

const TaskSchema = new Schema(
  {
    title: {
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
      enum: ["TODO", "IN_PROGRESS", "DONE"],
      default: "TODO",
    },
    priority: {
      type: String,
      enum: ["LOW", "MEDIUM", "HIGH", "URGENT"],
      default: "MEDIUM",
    },
    assignee: {
      type: String, // userId of member
      default: null,
    },
    projectId: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    dueDate: {
      type: Date,
      default: null,
    },
    labels: [String],
  },
  { timestamps: true }
);

export default TaskSchema;
