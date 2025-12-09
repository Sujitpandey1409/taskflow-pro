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
  console.log('Connecting to Global DB...', process.env.MONGO_GLOBAL_URI);
  
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

  // Replace only the DB name in URI
  const tenantUri = process.env.MONGO_GLOBAL_URI!.replace('taskflow_global', dbName);

  const conn = await mongoose.createConnection(tenantUri).asPromise();

  console.log(`Connected to TENANT DB: ${dbName}`);
  tenantConnections.set(dbName, conn);
  return conn;
}

