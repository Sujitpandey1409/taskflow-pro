// src/server.ts
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { createServer } from 'http';
import { connectGlobalDB } from './config/db';
import { createChatServer } from './socket/chat.socket';
// add routes
import authRoutes from './routes/auth.routes';
import memberRoutes from './routes/member.routes';
import projectRoutes from './routes/project.routes';
import taskRoutes from './routes/task.routes';

const app = express();
const server = createServer(app);

app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "https://taskflow-pro-sujit.vercel.app",
      "http://10.186.82.102:3000"
    ],
    credentials: true
  })
);
app.use(express.json());
app.use(cookieParser());
app.use('/api/auth', authRoutes);
app.use('/api/members', memberRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/tasks', taskRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', mongo: 'connected', timestamp: new Date().toISOString() });
});

// Debug route to inspect cookies and headers
app.get('/api/debug/cookies', (req, res) => {
  res.json({
    cookies: req.cookies,
    signedCookies: req.signedCookies,
    headers: {
      origin: req.headers.origin,
      referer: req.headers.referer,
      authorization: req.headers.authorization ? 'Present' : 'Missing',
    },
    cookieHeader: req.headers.cookie,
  });
});

// Start server
const start = async () => {
  try {
    await connectGlobalDB();
    const PORT = process.env.PORT || 5000;
    createChatServer(server);
    server.listen(PORT, () => {
      console.log(`Backend MERN running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error(err);
  }
};

start();
