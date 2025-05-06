const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const router = express.Router();

// Use a consistent JWT secret key with user.js
const JWT_SECRET = process.env.JWT_SECRET || 'PCD_JWT_SECRET_KEY_2024';
// JWT authentication middleware with detailed logging
const authenticateToken = (req, res, next) => {
  console.log('Authenticating request to products API');
  const authHeader = req.headers.authorization;
  console.log('Authorization header:', authHeader ? 'Present' : 'Missing');
  
  // Expecting header value "Bearer <token>"
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) {
    console.log('No token provided');
    return res.status(401).json({ message: 'Missing authentication token' });
  }
  
  try {
    console.log('Verifying JWT token');
    const user = jwt.verify(token, JWT_SECRET);
    console.log('Token verified, user:', user.email, 'role:', user.role);
    
    // Check if user is a vendor
    if (user.role !== 'vendor') {
      console.log('Access denied: User is not a vendor');
      return res.status(403).json({ message: 'Access denied. Only vendors can add products.' });
    }
    
    req.user = user;
    console.log('Authentication successful');
    next();
  } catch (err) {
    console.log('Token verification failed:', err.message);
    return res.status(403).json({ message: 'Invalid authentication token' });
  }
};

// Define the Product schema first
const productSchema = new mongoose.Schema({
  vendorEmail: { type: String, required: true },
  name: { type: String, required: true },
  mainPhoto: { type: String, required: true },
  mainDescription: { type: String, required: true },
  otherPhotos: [{ type: String }],
  photosDescriptions: [{ type: String }],
  price: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now }
});

// Create a separate connection for products database with proper SSL options
let productConnection;
let Product;

try {
  // Use local MongoDB if remote connection fails
  const connectWithRetry = async () => {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/Products_DB';
    const dbName = process.env.DB_NAME || 'Products_DB';
    
    try {
      console.log('Attempting to connect to MongoDB...');
      
      const options = {
        dbName: dbName,
        // Remove deprecated options
        // Add proper SSL/TLS options if using Atlas
        ssl: mongoURI.includes('mongodb+srv'),
        tls: mongoURI.includes('mongodb+srv'),
        tlsAllowInvalidCertificates: false, // Set to true only for development
        serverSelectionTimeoutMS: 5000, // Reduce timeout for faster failure detection
        connectTimeoutMS: 10000,
        retryWrites: true,
        w: 'majority'
      };
      
      productConnection = await mongoose.createConnection(mongoURI, options);
      
      console.log('Connected to Products_DB successfully');
      
      // Define the model after successful connection
      Product = productConnection.models.Product || productConnection.model('Product', productSchema);
      
      return true;
    } catch (err) {
      console.error('Error connecting to remote MongoDB:', err);
      // If remote fails, try local MongoDB
      if (mongoURI !== 'mongodb://localhost:27017/Products_DB') {
        console.log('Falling back to local MongoDB...');
        try {
          productConnection = await mongoose.createConnection('mongodb://localhost:27017/Products_DB', {
            dbName: 'Products_DB'
          });
          console.log('Connected to local MongoDB successfully');
          // Define the model after successful connection
          Product = productConnection.models.Product || productConnection.model('Product', productSchema);
          return true;
        } catch (localErr) {
          console.error('Error connecting to local MongoDB:', localErr);
          return false;
        }
      }
      return false;
    }
  };

  // Initial connection attempt
  connectWithRetry();
} catch (err) {
  console.error('Error in MongoDB connection setup:', err);
}

// In-memory fallback data for products if database is not available
const fallbackProducts = [
  {
    _id: 'fallback1',
    vendorEmail: 'demo@example.com',
    name: 'Sample Product 1',
    mainPhoto: 'img/product/feature-product/f-p-1.jpg',
    mainDescription: 'This is a sample product when database is unavailable.',
    otherPhotos: [],
    photosDescriptions: [],
    price: 29.99,
    createdAt: new Date()
  },
  {
    _id: 'fallback2',
    vendorEmail: 'demo@example.com',
    name: 'Sample Product 2',
    mainPhoto: 'img/product/feature-product/f-p-2.jpg',
    mainDescription: 'Another sample product for demonstration.',
    otherPhotos: [],
    photosDescriptions: [],
    price: 49.99,
    createdAt: new Date()
  }
];

// Configure Multer storage to use vendor's email folder from JWT token 
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    console.log('Processing file upload', file.originalname);
    // Use vendor email obtained from the token (attached by authenticateToken)
    const vendorEmail = req.user.email;
    if (!vendorEmail) {
      console.log('Vendor email not available in token');
      return cb(new Error('Vendor email not available in token'), null);
    }
    
    console.log('Creating upload directory for vendor:', vendorEmail);
    // Create directory path - ensure uploads directory exists in the project root
    const uploadDir = path.join(process.cwd(), 'uploads', 'products', vendorEmail);
    
    // Create directory recursively if not exists
    fs.mkdir(uploadDir, { recursive: true }, (err) => {
      if (err) {
        console.error('Error creating directory:', err);
        return cb(err);
      }
      console.log('Upload directory created:', uploadDir);
      cb(null, uploadDir);
    });
  },
  filename: function (req, file, cb) {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const filename = file.fieldname + '-' + uniqueSuffix + ext;
    console.log('Generated filename:', filename);
    cb(null, filename);
  }
});
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});
// Add a simple in-memory cache for vendor information
// This will be at the top level of the file, near other imports
const vendorCache = {
  data: {}, // Store product ID -> vendor email mappings
  expiry: {}, // Store expiration timestamps
  defaultTTL: 3600000, // Cache TTL: 1 hour (in milliseconds)
  // Get cached vendor info
  get(productId) {
    if (this.data[productId] && this.expiry[productId] > Date.now()) {
      return this.data[productId]; // Return cached data if not expired
    }
    return null; // Cache miss or expired
  },
  // Set vendor info in cache
  set(productId, vendorEmail) {
    this.data[productId] = vendorEmail;
    this.expiry[productId] = Date.now() + this.defaultTTL;
  },
  
  // Clear specific entry or entire cache
  clear(productId = null) {
    if (productId) {
      delete this.data[productId];
      delete this.expiry[productId];
    } else {
      this.data = {};
      this.expiry = {};
    }
  }
};

// Route to add a new product
router.post('/add', authenticateToken, (req, res, next) => {
  console.log('Product add request received');
  
  // Use multer upload middleware
  const uploadMiddleware = upload.fields([
    { name: 'mainPhoto', maxCount: 1 },
    { name: 'otherPhotos', maxCount: 3 }
  ]);

  uploadMiddleware(req, res, async (err) => {
    if (err) {
      console.error('Multer upload error:', err);
      return res.status(400).json({ message: 'File upload error: ' + err.message });
    }

    try {
      console.log('Processing product data');
      // Get vendorEmail from the token
      const vendorEmail = req.user.email;
      console.log('Vendor email:', vendorEmail);
      
      const { name, mainDescription, price, photosDescriptions } = req.body;
      console.log('Product details:', { name, price });
      
      // Validate required fields
      if (!vendorEmail || !name || !mainDescription || !price) {
        console.log('Missing required fields');
        return res.status(400).json({ message: 'Missing required fields.' });
      }
      
      // Check if files were uploaded
      console.log('Files received:', req.files ? Object.keys(req.files) : 'none');
      
      // Retrieve file paths for the main photo
      const mainPhotoFile = req.files['mainPhoto'] && req.files['mainPhoto'][0];
      if (!mainPhotoFile) {
        console.log('Main photo is missing');
        return res.status(400).json({ message: 'Main photo is required.' });
      }
      
      // Store paths relative to server root for easier access later
      const mainPhotoPath = mainPhotoFile.path.replace(/\\/g, '/');
      console.log('Main photo path:', mainPhotoPath);
      
      let otherPhotosPaths = [];
      if (req.files['otherPhotos']) {
        otherPhotosPaths = req.files['otherPhotos'].map(file => file.path.replace(/\\/g, '/'));
        console.log('Other photos paths:', otherPhotosPaths);
      }
      
      // Process photosDescriptions:
      let descriptions = [];
      if (photosDescriptions) {
        try {
          descriptions = JSON.parse(photosDescriptions);
        } catch (e) {
          // Fallback: assume comma-separated values
          descriptions = photosDescriptions.split(',').map(desc => desc.trim());
        }
        console.log('Photo descriptions:', descriptions);
      }
      
      // Create a new product document using vendorEmail from the token
      const newProduct = new Product({
        vendorEmail,
        name,
        mainPhoto: mainPhotoPath,
        mainDescription,
        otherPhotos: otherPhotosPaths,
        photosDescriptions: descriptions,
        price: parseFloat(price)
      });
      
      console.log('Saving product to database');
      await newProduct.save();
      
      console.log('Product saved successfully:', newProduct._id);
      
      return res.status(201).json({
        message: 'Product added successfully!',
        productId: newProduct._id
      });
    } catch (err) {
      console.error('Error adding product:', err);
      return res.status(500).json({ message: 'Server error', error: err.message });
    }
  });
});

// Route to get all products
router.get('/all', async (req, res) => {
  try {
    console.log('Fetching all products');
    let products = [];
    
    // Get products from database
    products = await Product.find().sort({ createdAt: -1 });
    console.log(`Found ${products.length} products in database`);
    
    // Make sure we serve the correct image paths
    const productsWithFixedPaths = products.map(product => {
      // Convert to plain object if it's a mongoose document
      const productObj = product.toObject ? product.toObject() : product;
      
      // Fix the mainPhoto path to be a simple relative path
      if (productObj.mainPhoto) {
        // Extract just the filename from the path
        const pathParts = productObj.mainPhoto.split('/');
        const filename = pathParts[pathParts.length - 1];
        
        // Use a simple consistent format for the image path
        productObj.mainPhoto = filename;
      }
      
      // Also fix paths for other photos if they exist
      if (productObj.otherPhotos && productObj.otherPhotos.length > 0) {
        productObj.otherPhotos = productObj.otherPhotos.map(path => {
          if (path) {
            const pathParts = path.split('/');
            return pathParts[pathParts.length - 1];
          }
          return path;
        });
      }
      
      return productObj;
    });
    
    return res.status(200).json({
      products: productsWithFixedPaths
    });
  } catch (err) {
    console.error('Error fetching all products:', err);
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Route to get a single product by ID
router.get('/:id', async (req, res) => {
  try {
    console.log('Fetching product by ID:', req.params.id);
    
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid product ID format' });
    }

    let product;
    // Try to get from database first
    if (Product) {
      product = await Product.findById(req.params.id);
    }

    // If no product found in DB and database is not available, check fallback data
    if (!product && (!Product || !productConnection)) {
      console.log('Database unavailable, checking fallback data');
      product = fallbackProducts.find(p => p._id === req.params.id);
    }

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Convert mongoose document to plain object if needed
    const productObj = product.toObject ? product.toObject() : product;

    // Fix the image paths
    if (productObj.mainPhoto) {
      const pathParts = productObj.mainPhoto.split('/');
      productObj.mainPhoto = pathParts[pathParts.length - 1];
    }

    if (productObj.otherPhotos && productObj.otherPhotos.length > 0) {
      productObj.otherPhotos = productObj.otherPhotos.map(path => {
        if (path) {
          const pathParts = path.split('/');
          return pathParts[pathParts.length - 1];
        }
        return path;
      });
    }

    return res.status(200).json(productObj);
  } catch (err) {
    console.error('Error fetching product:', err);
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Route to update product price
router.patch('/update/:id', authenticateToken, async (req, res) => {
  try {
    console.log('Updating product price', req.params.id);
    
    const { price } = req.body;
    if (!price || isNaN(price) || price <= 0) {
      return res.status(400).json({ message: 'Invalid price value' });
    }
    
    // Check if the product exists and belongs to this vendor
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    // Verify product belongs to the authenticated vendor
    if (product.vendorEmail !== req.user.email) {
      return res.status(403).json({ message: 'Not authorized to update this product' });
    }
    
    // Update the product price
    product.price = price;
    await product.save();
    
    console.log('Product price updated successfully', req.params.id);
    return res.status(200).json({
      message: 'Price updated successfully',
      product: {
        _id: product._id,
        name: product.name,
        price: product.price
      }
    });
  } catch (err) {
    console.error('Error updating product price:', err);
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Route to delete a product
router.delete('/delete/:id', authenticateToken, async (req, res) => {
  try {
    console.log('Deleting product', req.params.id);
    
    // Check if the product exists and belongs to this vendor
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    // Verify product belongs to the authenticated vendor
    if (product.vendorEmail !== req.user.email) {
      return res.status(403).json({ message: 'Not authorized to delete this product' });
    }
    
    // Delete the product from the database
    await Product.findByIdAndDelete(req.params.id);
    
    // Delete product images if they exist
    if (product.mainPhoto) {
      const mainPhotoPath = path.join(process.cwd(), 'uploads', 'products', req.user.email, path.basename(product.mainPhoto));
      if (fs.existsSync(mainPhotoPath)) {
        fs.unlinkSync(mainPhotoPath);
      }
    }
    
    // Delete any other photos if they exist
    if (product.otherPhotos && product.otherPhotos.length > 0) {
      product.otherPhotos.forEach(photoPath => {
        const fullPath = path.join(process.cwd(), 'uploads', 'products', req.user.email, path.basename(photoPath));
        if (fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath);
        }
      });
    }
    
    console.log('Product deleted successfully', req.params.id);
    return res.status(200).json({ message: 'Product deleted successfully' });
  } catch (err) {
    console.error('Error deleting product:', err);
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Route to get vendor email for a product
router.get('/vendor/:productId', async (req, res) => {
  try {
    const productId = req.params.productId;
    
    // Only log once per minute per product ID to prevent log spam
    const now = Date.now();
    if (!router.vendorInfoLogTimestamps) {
      router.vendorInfoLogTimestamps = {};
    }
    
    // Check if we've logged this product ID in the last minute
    const lastLog = router.vendorInfoLogTimestamps[productId];
    if (!lastLog || (now - lastLog > 60000)) { // 60000 ms = 1 minute
      console.log(`Fetching vendor info for product ${productId}`);
      router.vendorInfoLogTimestamps[productId] = now;
    }

    if (!productId) {
      return res.status(400).json({ error: 'Product ID is required' });
    }
    
    // Check if we have cached vendor info for this product
    const cachedVendorEmail = vendorCache.get(productId);
    if (cachedVendorEmail) {
      return res.status(200).json({
        vendorEmail: cachedVendorEmail,
        status: 'success',
        source: 'cache'
      });
    }
    
    // Check if Product model is initialized
    if (!Product) {
      console.error('Product model not initialized, trying to reconnect...');
      
      // Wait for connection to be established
      try {
        await connectWithRetry();
        // If still not initialized, use fallback
        if (!Product) {
          console.error('Still could not initialize Product model, using fallback product');
          // Check if product ID exists in fallback products
          const fallbackProduct = fallbackProducts.find(p => p._id === productId);
          
          if (fallbackProduct) {
            // Cache the fallback vendor email
            vendorCache.set(productId, fallbackProduct.vendorEmail);
            
            return res.status(200).json({
              vendorEmail: fallbackProduct.vendorEmail,
              status: 'success (fallback)',
              note: 'Using fallback data because database is unavailable'
            });
          } else {
            return res.status(404).json({ error: 'Product not found in fallback data' });
          }
        }
      } catch (connErr) {
        console.error('Failed to reconnect to database:', connErr);
        return res.status(500).json({ 
          error: 'Database connection not available',
          status: 'error'
        });
      }
    }
    
    // Validate MongoDB ObjectId format
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      console.error(`Invalid product ID format: ${productId}`);
      return res.status(400).json({ 
        error: 'Invalid product ID format',
        status: 'error'
      });
    }
    
    // Try to find the product
    const product = await Product.findById(productId);
    
    if (!product) {
      console.error(`Product not found with ID: ${productId}`);
      return res.status(404).json({ 
        error: 'Product not found',
        status: 'error'
      });
    }
    
    // Add the vendor email to the cache for future requests
    vendorCache.set(productId, product.vendorEmail);
    
    console.log(`Successfully found vendor info: ${product.vendorEmail} for product: ${productId}`);
    return res.status(200).json({
      vendorEmail: product.vendorEmail,
      status: 'success',
      source: 'database'
    });
  } catch (err) {
    console.error('Error fetching vendor for product:', err);
    return res.status(500).json({ 
      error: 'Server error', 
      details: err.message,
      status: 'error'
    });
  }
});

// Get newest products (limit to 5)
router.get('/newest', async (req, res) => {
    try {
        console.log('Fetching newest products');
        
        if (!Product) {
            console.log('Product model not initialized, attempting to reconnect...');
            await connectWithRetry();
            
            if (!Product) {
                console.log('Still no Product model, returning fallback data');
                return res.json(fallbackProducts.slice(0, 5));
            }
        }
        
        const products = await Product.find()
            .sort({ createdAt: -1 })
            .limit(5);
            
        console.log(`Found ${products.length} newest products`);
        
        // Convert mongoose documents to plain objects and fix image paths
        const productsWithFixedPaths = products.map(product => {
            const productObj = product.toObject ? product.toObject() : product;
            
            if (productObj.mainPhoto) {
                // Ensure the path is relative to the uploads directory
                const filename = path.basename(productObj.mainPhoto);
                productObj.mainPhoto = `/uploads/products/${productObj.vendorEmail}/${filename}`;
            }
            
            if (productObj.otherPhotos && productObj.otherPhotos.length > 0) {
                productObj.otherPhotos = productObj.otherPhotos.map(photoPath => {
                    if (photoPath) {
                        const filename = path.basename(photoPath);
                        return `/uploads/products/${productObj.vendorEmail}/${filename}`;
                    }
                    return photoPath;
                });
            }
            
            return productObj;
        });
        
        res.json(productsWithFixedPaths);
    } catch (error) {
        console.error('Error fetching newest products:', error);
        res.status(500).json({ 
            message: 'Error fetching newest products',
            error: error.message 
        });
    }
});

module.exports = router;