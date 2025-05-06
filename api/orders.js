// File: api/orders.js
const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const authenticateToken = require('../middleware/auth'); // Assuming auth middleware exists
require('dotenv').config(); // Load environment variables

// --- Database Connection for Orders ---
// Check if a connection already exists to avoid duplicates
let ordersDbConnection = mongoose.connections.find(conn => conn.name === 'orders_DB');

if (!ordersDbConnection) {
    // Create a new connection specifically for the orders database
    const ordersDbUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/orders_DB';
    console.log(`Attempting to connect to orders DB: ${ordersDbUri}`);
    ordersDbConnection = mongoose.createConnection(ordersDbUri, {
        // useNewUrlParser: true, // Deprecated in Mongoose 6+
        // useUnifiedTopology: true, // Deprecated in Mongoose 6+
        // Add new options if needed, e.g., for Atlas:
        // ssl: ordersDbUri.includes('mongodb+srv'),
        // tls: ordersDbUri.includes('mongodb+srv'),
    });

    ordersDbConnection.on('connected', () => {
        console.log('Mongoose connected to orders_DB');
    });
    ordersDbConnection.on('error', (err) => {
        console.error('Mongoose orders_DB connection error:', err);
    });
    ordersDbConnection.on('disconnected', () => {
        console.log('Mongoose disconnected from orders_DB');
    });
    ordersDbConnection.on('open', () => {
         console.log('Mongoose orders_DB connection opened successfully.');
         // Define the model once the connection is open
         if (!Order) { // Ensure model is defined only once
            Order = ordersDbConnection.model('Order', orderSchema);
            console.log('Order model defined on orders_DB connection.');
         }
    });

} else {
    console.log('Using existing Mongoose connection to orders_DB');
    // Define the model if the connection already exists but model wasn't defined yet
    if (!ordersDbConnection.models.Order) {
        Order = ordersDbConnection.model('Order', orderSchema);
        console.log('Order model defined on existing orders_DB connection.');
    } else {
        Order = ordersDbConnection.models.Order;
    }
}


// --- Order Schema (defined before model creation) ---
const orderSchema = new mongoose.Schema({
    orderId: { type: String, required: true, unique: true },
    customerEmail: { type: String, required: true, index: true },
    customerWallet: { type: String },
    items: [{ // Keep the original cart items for overall order view
        id: String,
        name: String,
        price: Number,
        quantity: Number,
        image: String,
        vendorEmail: { type: String, index: true }, // Index for potential vendor filtering later
        status: { 
            type: String, 
            enum: ['Pending', 'Shipped', 'Delivered'],
            default: 'Pending'
        }
    }],
    totalUSD: Number,
    totalETHPaid: Number,
    paymentBreakdown: [{ // Store details of each transaction sent
        vendorKey: String,
        vendorEmail: { type: String, index: true }, // Index for vendor lookup
        amountETH: Number,
        txHash: String,
        blockHash: String,
        success: Boolean,
        items: [{ id: String, name: String, quantity: Number, price: Number }] // Items included in this specific vendor payment
    }],
    status: { type: String, default: 'Completed', index: true }, // 'Completed' since payment succeeded
    paymentMethod: String,
    shippingAddress: { // Optional: Add if you collect shipping info
         firstName: String,
         lastName: String,
         address: String,
         // ... other fields
    },
    createdAt: { type: Date, default: Date.now, index: true },
});

// --- Order Model (variable declared, assigned when connection is ready) ---
let Order;


// --- API Endpoint to Create Order ---
// POST /api/orders/create
router.post('/create', authenticateToken, async (req, res) => {
    // Check if the Order model is available
    if (!Order) {
        console.error('Order model is not initialized. Cannot create order.');
        return res.status(500).json({ error: 'Order service not ready. Please try again later.' });
    }

    try {
        const orderData = req.body;
        console.log("Received order data for creation:", orderData);

        // Basic validation
        if (!orderData || !orderData.orderId || !orderData.paymentBreakdown || orderData.paymentBreakdown.length === 0) {
            return res.status(400).json({ error: 'Invalid order data received.' });
        }

        // Optional Security Check: Ensure customer email matches token or user is admin
        if (req.user.email !== orderData.customerEmail && req.user.role !== 'admin') {
             console.warn(`Security Alert: User ${req.user.email} attempting to save order for ${orderData.customerEmail}`);
             // return res.status(403).json({ error: 'Unauthorized to save this order.' }); // Uncomment if strict check needed
        }

        // Save the main order document
        const newOrder = new Order(orderData);
        const savedOrder = await newOrder.save();

        console.log(`Order ${savedOrder.orderId} saved successfully to orders_DB.`);

        // **Vendor Notification/Data Segregation (Placeholder)**
        const vendorEmailsNotified = [...new Set(orderData.paymentBreakdown
            .filter(p => p.success && p.vendorEmail)
            .map(p => p.vendorEmail))];

        if (vendorEmailsNotified.length > 0) {
             console.log(`TODO: Implement notification logic for vendors: ${vendorEmailsNotified.join(', ')} regarding order ${savedOrder.orderId}`);
             // Example: Trigger email service, push notification, or save to a vendor-specific collection
        }

        res.status(201).json({
            message: 'Order created successfully!',
            orderId: savedOrder.orderId,
            notifiedVendors: vendorEmailsNotified // Example response field
        });

    } catch (error) {
        console.error('Error creating order:', error);
        // Handle potential duplicate orderId error
        if (error.code === 11000) {
             return res.status(409).json({ error: 'Order ID already exists.' });
        }
        res.status(500).json({ error: 'Server error saving order.' });
    }
});

// --- API Endpoint for Vendors to Fetch Their Orders ---
// GET /api/orders/vendor
router.get('/vendor', authenticateToken, async (req, res) => {
    // Check if the Order model is available
    if (!Order) {
        console.error('Order model is not initialized. Cannot fetch vendor orders.');
        return res.status(500).json({ error: 'Order service not ready. Please try again later.' });
    }

    try {
        // Ensure the user is a vendor
        if (req.user.role !== 'vendor') {
            return res.status(403).json({ error: 'Access denied. Only vendors can view vendor orders.' });
        }

        const vendorEmail = req.user.email; // Get vendor's email from their token
        console.log(`Fetching orders for vendor: ${vendorEmail}`);

        // Find orders where this vendor received a successful payment
        const vendorOrders = await Order.find({
            'paymentBreakdown.vendorEmail': vendorEmail,
            'paymentBreakdown.success': true
        }).sort({ createdAt: -1 }); // Sort by newest first

        console.log(`Found ${vendorOrders.length} orders containing items for vendor ${vendorEmail}`);

        // Format the response to only include relevant parts for the vendor
        const formattedOrders = vendorOrders.map(order => {
            // Find the specific payment(s) made to this vendor within the order
            const vendorPayments = order.paymentBreakdown.filter(p => p.vendorEmail === vendorEmail && p.success);

            // Extract items relevant to this vendor from those payments
            const vendorItems = vendorPayments.reduce((acc, payment) => {
                // Ensure payment.items is an array before spreading
                if (Array.isArray(payment.items)) {
                    acc.push(...payment.items);
                }
                return acc;
            }, []);

            return {
                orderId: order.orderId,
                customerEmail: order.customerEmail,
                items: vendorItems, // Show only items they need to fulfill
                status: order.status, // Show overall order status
                createdAt: order.createdAt,
                // Add shippingAddress if it exists and is needed by vendor
                shippingAddress: order.shippingAddress || null
            };
        }).filter(order => order.items.length > 0); // Only include orders where vendor actually has items


        res.status(200).json(formattedOrders);

    } catch (error) {
        console.error(`Error fetching orders for vendor ${req.user.email}:`, error);
        res.status(500).json({ error: 'Server error fetching vendor orders.' });
    }
});

// --- API Endpoint to Update Order Item Status ---
router.patch('/items/:orderId/:itemId/status', authenticateToken, async (req, res) => {
    if (!Order) {
        return res.status(500).json({ error: 'Order service not ready' });
    }

    try {
        const { orderId, itemId } = req.params;
        const { status } = req.body;
        const vendorEmail = req.user.email;

        // Validate status
        if (!['Pending', 'Shipped', 'Delivered'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status value' });
        }

        // Find and update the order item
        const order = await Order.findOne({ orderId: orderId });
        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        // Find the specific item and ensure it belongs to this vendor
        const item = order.items.find(item => 
            item.id === itemId && item.vendorEmail === vendorEmail
        );

        if (!item) {
            return res.status(404).json({ 
                error: 'Item not found or you are not authorized to update this item' 
            });
        }

        // Update the item status
        item.status = status;
        await order.save();

        res.json({ 
            message: 'Status updated successfully',
            orderId: orderId,
            itemId: itemId,
            newStatus: status
        });

    } catch (error) {
        console.error('Error updating item status:', error);
        res.status(500).json({ error: 'Failed to update item status' });
    }
});

router.get('/status/:orderId', async (req, res) => {
    if (!Order) {
        return res.status(500).json({ error: 'Order service not ready' });
    }

    try {
        const { orderId } = req.params;
        const order = await Order.findOne({ orderId });
        
        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        // Format the response to include relevant status information
        const orderStatus = {
            orderId: order.orderId,
            orderDate: order.createdAt,
            items: order.items.map(item => ({
                name: item.name,
                quantity: item.quantity,
                status: item.status,
                vendorEmail: item.vendorEmail
            })),
            shippingAddress: order.shippingAddress
        };

        res.json(orderStatus);
    } catch (error) {
        console.error('Error fetching order status:', error);
        res.status(500).json({ error: 'Failed to fetch order status' });
    }
});

module.exports = router;
