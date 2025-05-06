const express = require('express');
const multer = require('multer');
const path = require('path');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const notifier = require('node-notifier');
const router = express.Router();
// Create uploads directory if it doesn't exist
const dir = './uploads';
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir);
}

// Define User schema and model
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String },
  cryptoKey: { type: String },
  photoPath: { type: String },
});
const User = mongoose.model('User', userSchema);
// Define Order schema and model
const orderSchema = new mongoose.Schema({
  orderId: { type: String, required: true, unique: true },
  email: { type: String, required: true },
  status: { type: String, enum: ['Pending', 'Shipped', 'Delivered'], default: 'Pending' },
  createdAt: { type: Date, default: Date.now },
});
const Order = mongoose.model('Order', orderSchema);
// Multer setup for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    const email = req.body.email || 'unknown_user';
    const cleanEmail = email.replace(/[^a-zA-Z0-9]/g, '_');
    const ext = path.extname(file.originalname);
    cb(null, `${cleanEmail}_profile_picture${ext}`);
  },
});
const upload = multer({ storage });
// JWT secret key
const JWT_SECRET = process.env.JWT_SECRET || 'PCD_JWT_SECRET_KEY_2024'; // Replace with a strong, static secret key
// Token blacklist for logout
const tokenBlacklist = [];
// Signup route
router.post('/signup', upload.single('profilePicture'), async (req, res) => {
  const { name, email, password, confirmPassword, role, cryptoKey } = req.body;
  const photoPath = req.file ? req.file.path : null;
  // Validate input
  if (!name || !email || !password || !confirmPassword) {
    notifier.notify({ title: 'Signup Failed', message: 'All fields are required.' });
    return res.status(400).json({ message: 'All fields are required.' });
  }
  if (password !== confirmPassword) {
    notifier.notify({ title: 'Signup Failed', message: 'Passwords do not match.' });
    return res.status(400).json({ message: 'Passwords do not match.' });
  }
  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      notifier.notify({ title: 'Signup Failed', message: 'User already registered.' });
      return res.status(400).json({ message: 'User already registered.' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ name, email, password: hashedPassword, role, cryptoKey, photoPath });
    await newUser.save();
    const token = jwt.sign({ id: newUser._id, email: newUser.email }, JWT_SECRET, { expiresIn: '1h' });
    notifier.notify({ title: 'Signup Successful', message: `Welcome, ${newUser.name}!` });
    res.status(201).json({
      message: 'Signup successful!',
      token,
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        photoPath: newUser.photoPath,
      },
    });
  } catch (err) {
    notifier.notify({ title: 'Signup Failed', message: 'Server error occurred.' });
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Signin route
// Signin route
router.post('/signin', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User does not exist!' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ message: 'Incorrect password!' });
    }

    // Generate JWT token with the user's role
    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '3h' }
    );

    res.status(200).json({
      message: 'Signin successful!',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        photoPath: user.photoPath,
      },
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});
// Middleware to verify JWT
const authenticateToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ message: 'Access denied. No token provided.' });
  }

  // Check if the token is blacklisted
  if (tokenBlacklist.includes(token)) {
    return res.status(403).json({ message: 'Token is invalidated. Please log in again.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(403).json({ message: 'Token has expired.' });
    }
    res.status(403).json({ message: 'Invalid token.' });
  }
};

// Example protected route
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }
    res.status(200).json({ user });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Track order route
router.post('/track-order', async (req, res) => {
  const { order, email } = req.body;
  if (!order || !email) {
    return res.status(400).json({ message: 'Both Order ID and Email are required.' });
  }
  try {
    const trackedOrder = await Order.findOne({ orderId: order, email });

    if (!trackedOrder) {
      return res.status(404).json({ message: 'Order not found or invalid credentials.' });
    }

    notifier.notify({ title: 'Order Found', message: `Order ${trackedOrder.orderId} is ${trackedOrder.status}.` });
    res.status(200).json({
      message: 'Order found!',
      orderDetails: {
        orderId: trackedOrder.orderId,
        email: trackedOrder.email,
        status: trackedOrder.status,
        createdAt: trackedOrder.createdAt,
      },
    });
  } catch (err) {
    notifier.notify({ title: 'Order Tracking Failed', message: 'Server error occurred.' });
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Logout route
router.post('/logout', authenticateToken, (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (token) {
    tokenBlacklist.push(token);
    notifier.notify({ title: 'Logout Successful', message: 'You have been logged out.' });
  }
  res.status(200).json({ message: 'Logged out successfully!' });
});

// Get all vendors API endpoint (for blockchain sync)
router.get('/vendors', async (req, res) => {
  try {
    // Find all users with role 'vendor'
    const vendors = await User.find({ role: 'vendor' }, 'email name cryptoKey');
    
    res.status(200).json({ 
      message: 'Vendors retrieved successfully',
      vendors: vendors
    });
  } catch (err) {
    console.error('Error fetching vendors:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

/**
 * Get user's cryptoKey (private key) for blockchain transactions
 * @route GET /api/user/get-crypto-key
 * @access Private - requires authentication
 */
router.get('/get-crypto-key', authenticateToken, async (req, res) => {
  try {
    const email = req.query.email;
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    
    // Find the user by email
    const user = await User.findOne({ email });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Check if requester is the same as the requested user info
    if (req.user.id !== user._id.toString()) {
      return res.status(403).json({ error: 'Not authorized to access this information' });
    }
    
    // Return the cryptoKey if it exists
    if (user.cryptoKey) {
      return res.json({ cryptoKey: user.cryptoKey });
    } else {
      return res.status(404).json({ error: 'No cryptoKey found for this user' });
    }
  } catch (error) {
    console.error('Error retrieving cryptoKey:', error);
    res.status(500).json({ error: 'Server error retrieving cryptoKey' });
  }
});

/**
 * Save user's cryptoKey (private key) to the database
 * POST /api/user/save-crypto-key
 * Required fields: email, cryptoKey
 * Authorization: Bearer token required
 */
router.post('/save-crypto-key', authenticateToken, async (req, res) => {
  try {
    const { email, cryptoKey } = req.body;
    
    if (!email || !cryptoKey) {
      return res.status(400).json({ error: 'Email and cryptoKey are required' });
    }
    
    // Verify the user is authorized to update this email's data
    if (req.user.role !== 'admin' && req.user.email !== email) {
      return res.status(403).json({ error: 'Unauthorized to update this user\'s cryptoKey' });
    }
    
    // Update the user's cryptoKey in the database
    const result = await User.updateOne(
      { email: email },
      { $set: { cryptoKey: cryptoKey } }
    );
    
    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    return res.status(200).json({ 
      message: 'CryptoKey saved successfully',
      email: email
    });
  } catch (error) {
    console.error('Error saving cryptoKey:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get cryptoKeys for a list of vendor emails
 * POST /api/user/vendor-keys
 * Required body: { emails: ["vendor1@example.com", "vendor2@example.com"] }
 * Returns: { "vendor1@example.com": "0xKey1", "vendor2@example.com": "0xKey2", ... }
 */
router.post('/vendor-keys', async (req, res) => {
  try {
    const { emails } = req.body;

    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return res.status(400).json({ error: 'An array of vendor emails is required.' });
    }

  
    const vendors = await User.find(
      { 
        email: { $in: emails }, 
        role: 'vendor'
      },
      'email cryptoKey' 
    );

   
    const vendorKeyMap = vendors.reduce((map, vendor) => {
      if (vendor.email && vendor.cryptoKey) { 
        map[vendor.email] = vendor.cryptoKey;
      }
      return map;
    }, {});

    res.status(200).json(vendorKeyMap);

  } catch (error) {
    console.error('Error fetching vendor keys:', error);
    res.status(500).json({ error: 'Server error fetching vendor keys' });
  }
});

module.exports = router;

router.User = User;
router.Order = Order;

