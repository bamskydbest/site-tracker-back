import { Server as HttpServer } from 'http';
import { Server } from 'socket.io';
import type { ServerToClientEvents, ClientToServerEvents } from '../types/socket.js';

let io: Server<ClientToServerEvents, ServerToClientEvents>;

export const initSocket = (httpServer: HttpServer): Server<ClientToServerEvents, ServerToClientEvents> => {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL
        ? process.env.CLIENT_URL.split(',')
        : ['http://localhost:5173', 'https://knetgh-site.netlify.app'],
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    socket.on('join-visit', (visitId) => {
      socket.join(`visit:${visitId}`);
    });

    socket.on('leave-visit', (visitId) => {
      socket.leave(`visit:${visitId}`);
    });

    socket.on('join-admin', () => {
      socket.join('admin-dashboard');
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });

  return io;
};

export const getIO = (): Server<ClientToServerEvents, ServerToClientEvents> => {
  if (!io) {
    throw new Error('Socket.IO not initialized');
  }
  return io;
};
