// src/middleware/tenant.middleware.ts
import { Request, Response, NextFunction } from "express";
import { Organization } from "../models/global/Organization";
import { connectTenantDB } from "../config/db";
import path from "path";
import fs from "fs";

// Helper to safely load schema files
const loadModelSchema = (modelName: string) => {
  const fileJS = path.join(__dirname, `../models/tenant/${modelName}.js`);
  const fileTS = path.join(__dirname, `../models/tenant/${modelName}.ts`);

  // Check for compiled JS first (production)
  if (fs.existsSync(fileJS)) {
    const module = require(`../models/tenant/${modelName}.js`);
    return module[`${modelName}Schema`] || module.default;
  }

  // Check for TS file in development
  if (fs.existsSync(fileTS)) {
    const module = require(`../models/tenant/${modelName}.ts`);
    return module[`${modelName}Schema`] || module.default;
  }

  return null;
};

export const loadTenantDB = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const orgId = req.user?.orgId;

  if (!orgId) {
    return res.status(400).json({ message: "No organization selected" });
  }

  try {
    const org = await Organization.findById(orgId);
    if (!org) {
      return res.status(404).json({ message: "Organization not found" });
    }

    // Connect to tenant database
    const tenantConn = await connectTenantDB(org.dbName);
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
      const model =
        tenantConn.models[modelName] || tenantConn.model(modelName, schema);

      req.tenantDB[modelName] = model;

      console.log(`Model '${modelName}' registered on DB: ${org.dbName}`);
    }

    next();
  } catch (err) {
    console.error("Tenant DB Load Error:", err);
    return res.status(500).json({ message: "Failed to load tenant database" });
  }
};
