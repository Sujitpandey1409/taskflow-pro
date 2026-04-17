// src/config/db.ts
import mongoose from 'mongoose';
import 'dotenv/config';

// Singleton for global connection

// ======================
// 1. GLOBAL DB (Users, Orgs)
// ======================

let globalConn: typeof mongoose | null = null;

export const connectGlobalDB = async (): Promise<typeof mongoose> => {
  if (globalConn) return globalConn;
  
  globalConn = await mongoose.connect(process.env.MONGO_GLOBAL_URI!, {
    dbName: 'taskflow_global',
  });

  console.log('Connected to Global DB: taskflow_global');
  return globalConn;
};

// ======================
// 2. TENANT DB (Per Organization)
// ======================
const tenantConnections = new Map<string, mongoose.Connection>();

export const connectTenantDB = async (dbName: string): Promise<mongoose.Connection> => {
  if (tenantConnections.has(dbName)) {
    return tenantConnections.get(dbName)!;
  }

  const conn = await mongoose.createConnection(process.env.MONGO_GLOBAL_URI!, {
    dbName,
  }).asPromise();

  console.log(`Connected to TENANT DB: ${dbName}`);
  tenantConnections.set(dbName, conn);
  return conn;
}

