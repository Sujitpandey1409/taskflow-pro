"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectTenantDB = exports.connectGlobalDB = void 0;
// src/config/db.ts
const mongoose_1 = __importDefault(require("mongoose"));
require("dotenv/config");
// Singleton for global connection
// ======================
// 1. GLOBAL DB (Users, Orgs)
// ======================
let globalConn = null;
const connectGlobalDB = async () => {
    if (globalConn)
        return globalConn;
    console.log('Connecting to Global DB...', process.env.MONGO_GLOBAL_URI);
    globalConn = await mongoose_1.default.connect(process.env.MONGO_GLOBAL_URI, {
        dbName: 'taskflow_global',
    });
    console.log('Connected to Global DB: taskflow_global');
    return globalConn;
};
exports.connectGlobalDB = connectGlobalDB;
// ======================
// 2. TENANT DB (Per Organization)
// ======================
const tenantConnections = new Map();
const connectTenantDB = async (dbName) => {
    if (tenantConnections.has(dbName)) {
        return tenantConnections.get(dbName);
    }
    // Replace only the DB name in URI
    const tenantUri = process.env.MONGO_GLOBAL_URI.replace('taskflow_global', dbName);
    const conn = await mongoose_1.default.createConnection(tenantUri).asPromise();
    console.log(`Connected to TENANT DB: ${dbName}`);
    tenantConnections.set(dbName, conn);
    return conn;
};
exports.connectTenantDB = connectTenantDB;
