import { Server } from 'socket.io';
let io;
export const initSocket = (httpServer) => {
    io = new Server(httpServer, {
        cors: {
            origin: process.env.CLIENT_URL || 'http://localhost:5173',
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
export const getIO = () => {
    if (!io) {
        throw new Error('Socket.IO not initialized');
    }
    return io;
};
