// src/server.ts
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { connectGlobalDB } from './config/db';
// add routes
import authRoutes from './routes/auth.routes';
import projectRoutes from './routes/project.routes';
import taskRoutes from './routes/task.routes';

const app = express();

app.use(cors({ origin: 'https://taskflow-pro-sujit.vercel.app', credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/tasks', taskRoutes);

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