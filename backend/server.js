const express    = require('express');
const cors       = require('cors');
const dotenv     = require('dotenv');
const http       = require('http');
const { Server } = require('socket.io');
const connectDB  = require('./config/db');

dotenv.config();
connectDB();

const app    = express();
const server = http.createServer(app); // wrap express in http server for socket.io

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
  },
});

// ── Make io accessible to all controllers via app.locals ──────────────────────
app.locals.io = io;

// ── Socket.io connection handler ─────────────────────────────────────────────
io.on('connection', (socket) => {
  console.log(`🔌 Socket connected: ${socket.id}`);

  // Client sends their userId + role immediately after connecting
  // Frontend emits: socket.emit('register', { userId, role })
  socket.on('register', ({ userId, role }) => {
    if (!userId) return;

    // Every user joins their own private room
    socket.join(`user:${userId}`);

    // Admins also join the shared admins room
    if (role === 'admin') {
      socket.join('admins');
    }

    console.log(`✅ Registered socket for user ${userId} (${role})`);
  });

  socket.on('disconnect', () => {
    console.log(`🔌 Socket disconnected: ${socket.id}`);
  });
});

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json());

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/auth',         require('./routes/authRoutes'));
app.use('/api/attendance',   require('./routes/attendanceRoutes'));
app.use('/api/tasks',        require('./routes/taskRoutes'));
app.use('/api/leaves',       require('./routes/leaveRoutes'));
app.use('/api/salary',       require('./routes/salaryRoutes'));
app.use('/api/employees',    require('./routes/employeeRoutes'));
app.use('/api/productivity', require('./routes/productivityRoutes'));
app.use('/api/reports',      require('./routes/reportRoutes'));
app.use('/api/admin',        require('./routes/adminRoutes'));
app.use('/api/predictions',  require('./routes/predictionRoutes'));
app.use('/api/burnout',      require('./routes/burnout'));

app.get('/', (req, res) => {
  res.json({ message: 'HR Management System API is running ✅' });
});

// ── Start server (use `server.listen`, not `app.listen`) ──────────────────────
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server + WebSocket running on port ${PORT}`);
});