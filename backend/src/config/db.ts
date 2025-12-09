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



