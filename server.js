const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
// Import routes
const user_router = require('./api/user.js');
const product_router = require('./api/products.js');
const order_router = require('./api/orders.js'); // Import the new order routes

// Initialize app and load environment variables
const app = express();
dotenv.config();

// Add this environment variable to fix Node.js TLS issue with MongoDB Atlas
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// Connect to MongoDB with the specified database name
mongoose.connect(process.env.MONGODB_URI, {
  dbName: 'test',
  serverSelectionTimeoutMS: 10000, // 10 seconds
  socketTimeoutMS: 45000, // 45 seconds
  family: 4, // Use IPv4, skip trying IPv6
  retryWrites: true,
  w: 'majority',
  ssl: process.env.MONGODB_URI?.includes('mongodb+srv'),
  tls: process.env.MONGODB_URI?.includes('mongodb+srv'),
})
  .then(() => {
    console.log('✅ Connected to MongoDB');
  })
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err);
    console.log('⚠️ Application will continue with limited functionality');
  });

// Middleware to parse URL-encoded and JSON bodies
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Serve static assets
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Serve static files from public directory
app.use(express.static('public'));

// Serve files from uploads directory
app.use('/uploads', express.static('uploads'));

// API routes
app.use('/api/user', user_router);
app.use('/api/products', product_router);
app.use('/api/orders', order_router); // Use the order routes

// Default route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok',
    dbConnected: mongoose.connection.readyState === 1,
    timestamp: new Date().toISOString()
  });
});

// Start server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`✅ Server is running at http://localhost:${PORT}`);
  console.log(`🔄 Database connection status: ${mongoose.connection.readyState === 1 ? 'Connected' : 'Connecting...'}`);
});