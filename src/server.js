const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const dotenv = require('dotenv');
const connectDB = require('./config/database');
const { apiLimiter } = require('./middleware/rateLimiter');
const userRoutes = require('./routes/userRoutes');
const auctionRoutes = require('./routes/auctionRoutes');
const bidRoutes = require('./routes/bidRoutes');
const adminRoutes = require('./routes/adminRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const wishlistRoutes = require('./routes/wishlistRoutes');

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Connect to MongoDB
connectDB();

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true
}));
app.use(cookieParser());

// app.use(apiLimiter);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/users', userRoutes);
app.use('/api/auctions', auctionRoutes);
app.use('/api/bids', bidRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/wishlist', wishlistRoutes);

// Socket.io for real-time bidding
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('joinAuction', (auctionId) => {
    socket.join(auctionId);
    console.log(`User ${socket.id} joined auction ${auctionId}`);

    // Send current auction state to the user
    const roomSize = io.sockets.adapter.rooms.get(auctionId)?.size || 0;
    socket.emit('auctionJoined', {
      auctionId,
      activeUsers: roomSize
    });

    // Notify others in the room
    socket.to(auctionId).emit('userJoined', {
      userId: socket.id,
      activeUsers: roomSize
    });
  });

  socket.on('leaveAuction', (auctionId) => {
    socket.leave(auctionId);
    console.log(`User ${socket.id} left auction ${auctionId}`);

    const roomSize = io.sockets.adapter.rooms.get(auctionId)?.size || 0;
    socket.to(auctionId).emit('userLeft', {
      userId: socket.id,
      activeUsers: roomSize
    });
  });

  socket.on('bidPlaced', (data) => {
    const { auctionId, bidData } = data;
    // Broadcast to all users in the auction room except sender
    socket.to(auctionId).emit('newBid', bidData);
  });

  socket.on('auctionEnding', (data) => {
    const { auctionId, timeLeft } = data;
    socket.to(auctionId).emit('auctionEnding', { timeLeft });
  });

  socket.on('auctionEnded', (data) => {
    const { auctionId, winner } = data;
    io.to(auctionId).emit('auctionEnded', { winner });
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Make io accessible in routes
app.set('io', io);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = { app, server, io };