"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// src/models/tenant/Task.ts
const mongoose_1 = require("mongoose");
const TaskSchema = new mongoose_1.Schema({
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
        type: mongoose_1.Schema.Types.ObjectId,
        required: true,
    },
    dueDate: {
        type: Date,
        default: null,
    },
    labels: [String],
}, { timestamps: true });
exports.default = TaskSchema;
