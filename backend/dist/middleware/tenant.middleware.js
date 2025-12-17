"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadTenantDB = void 0;
const Organization_1 = require("../models/global/Organization");
const db_1 = require("../config/db");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
// Helper to safely load schema files
const loadModelSchema = (modelName) => {
    const fileJS = path_1.default.join(__dirname, `../models/tenant/${modelName}.js`);
    const fileTS = path_1.default.join(__dirname, `../models/tenant/${modelName}.ts`);
    // Check for compiled JS first (production)
    if (fs_1.default.existsSync(fileJS)) {
        const module = require(`../models/tenant/${modelName}.js`);
        return module[`${modelName}Schema`] || module.default;
    }
    // Check for TS file in development
    if (fs_1.default.existsSync(fileTS)) {
        const module = require(`../models/tenant/${modelName}.ts`);
        return module[`${modelName}Schema`] || module.default;
    }
    return null;
};
const loadTenantDB = async (req, res, next) => {
    const orgId = req.user?.orgId;
    if (!orgId) {
        return res.status(400).json({ message: "No organization selected" });
    }
    try {
        const org = await Organization_1.Organization.findById(orgId);
        if (!org) {
            return res.status(404).json({ message: "Organization not found" });
        }
        // Connect to tenant database
        const tenantConn = await (0, db_1.connectTenantDB)(org.dbName);
        console.log(`Connected to tenant DB: ${org.dbName}`);
        const modelsToLoad = ["Task", "Project"];
        // Build req.tenantDB object
        req.tenantDB = {};
        for (const modelName of modelsToLoad) {
            const schema = loadModelSchema(modelName);
            if (!schema) {
                console.warn(`Schema for ${modelName} not found. Skipping.`);
                continue;
            }
            // Register model only once
            const model = tenantConn.models[modelName] || tenantConn.model(modelName, schema);
            req.tenantDB[modelName] = model;
            console.log(`Model '${modelName}' registered on DB: ${org.dbName}`);
        }
        next();
    }
    catch (err) {
        console.error("Tenant DB Load Error:", err);
        return res.status(500).json({ message: "Failed to load tenant database" });
    }
};
exports.loadTenantDB = loadTenantDB;
