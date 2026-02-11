import express from 'express';
import { createServer } from 'http';
import dotenv from 'dotenv';
import cors from 'cors';
import { errorHandler } from './middleware/errorHandler.js';
import authRoutes from './routes/authRoutes.js';
import visitRoutes from './routes/visitRoutes.js';
import photoRoutes from './routes/photoRoutes.js';
import commentRoutes from './routes/commentRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import connectDB from './config/db.js';
import { initSocket } from './config/socket.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 6000;

// Init Socket.IO
initSocket(httpServer);

// Middlewares
app.use(cors({
  origin: process.env.CLIENT_URL
    ? process.env.CLIENT_URL.split(',')
    : ['http://localhost:5173', 'https://knetgh-site.netlify.app'],
}));
app.use(express.json());

// Routes
app.get('/', (_req, res) => {
  res.json({ message: 'Site Tracker API is running' });
});

app.use('/api/auth', authRoutes);
app.use('/api/visits', visitRoutes);
app.use('/api/photos', photoRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/reports', adminRoutes);

// Error handler
app.use(errorHandler);

// Connect to DB and start server
connectDB().then(() => {
  httpServer.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
});
