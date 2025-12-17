"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// src/models/tenant/Project.ts
const mongoose_1 = require("mongoose");
const ProjectSchema = new mongoose_1.Schema({
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
exports.default = ProjectSchema;
