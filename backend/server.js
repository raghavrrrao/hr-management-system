const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const { authenticateSocket } = require('./socket/socketAuth');

dotenv.config();
connectDB();

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:5173',
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        credentials: true,
    },
});

app.locals.io = io;

io.use(authenticateSocket);

io.on('connection', (socket) => {
    console.log(`🔌 Socket connected: ${socket.id}, user: ${socket.user?.id}`);

    socket.on('register', ({ userId, role }) => {
        if (!userId) return;
        socket.join(`user:${userId}`);
        if (role === 'admin') socket.join('admins');
        console.log(`✅ Registered socket for user ${userId} (${role})`);
    });

    socket.on('disconnect', () => {
        console.log(`🔌 Socket disconnected: ${socket.id}`);
    });
});

// Middleware
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173', credentials: true }));
app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/attendance', require('./routes/attendanceRoutes'));
app.use('/api/tasks', require('./routes/taskRoutes'));
app.use('/api/leaves', require('./routes/leaveRoutes'));
app.use('/api/salary', require('./routes/salaryRoutes'));
app.use('/api/employees', require('./routes/employeeRoutes'));
app.use('/api/productivity', require('./routes/productivityRoutes'));
app.use('/api/reports', require('./routes/reportRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/predictions', require('./routes/predictionRoutes'));
app.use('/api/burnout', require('./routes/burnout'));

app.get('/', (req, res) => {
    res.json({ message: 'HRMS API running' });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`🚀 Server + WebSocket running on port ${PORT}`);
});