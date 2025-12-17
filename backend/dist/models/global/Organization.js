"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Organization = void 0;
const mongoose_1 = require("mongoose");
const orgSchema = new mongoose_1.Schema({
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    dbName: { type: String, required: true, unique: true },
    ownerId: { type: String, required: true },
}, { timestamps: true });
exports.Organization = (0, mongoose_1.model)('Organization', orgSchema);
