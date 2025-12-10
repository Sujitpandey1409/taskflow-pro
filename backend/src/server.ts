// src/server.ts
import express from 'express';
// import cors from 'cors';
import cookieParser from 'cookie-parser';
import { connectGlobalDB } from './config/db';
// add routes
import authRoutes from './routes/auth.routes';

const app = express();

// app.use(cors({ origin: 'http://localhost:3000', credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use('/api/auth', authRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', mongo: 'connected', timestamp: new Date().toISOString() });
});

// Start server
const start = async () => {
  try {
    await connectGlobalDB();
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`Backend MERN running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error(err);
  }
};

start();