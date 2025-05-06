// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

/**
 * @title EnsiB E-commerce Platform
 * @dev Handles e-commerce transactions between customers and vendors
 * @dev Updated to align with MongoDB database structure
 */
contract EnsiBEcommerce {
    // Contract owner address (platform administrator)
    address public owner;
    
    // Fee percentage the platform takes (in basis points, 100 = 1%)
    uint16 public platformFeeRate = 250; // 2.5% fee
    
    // Minimum withdrawal amount in wei (0.01 ETH)
    uint256 public minimumWithdrawalAmount = 10000000000000000;

    // User role enum to match database roles
    enum UserRole { Client, Vendor, Admin }

    // Vendor structure - Updated to match MongoDB user schema
    struct Vendor {
        address payable vendorAddress;
        string email;
        string name;
        bool isRegistered;
        uint256 balance;
        string cryptoKey; // Public key for additional security
        string photoPath; // Path to vendor profile photo (optional)
    }
    
    // Client structure - Added to match MongoDB schema
    struct Client {
        address clientAddress;
        string email;
        string name;
        bool isRegistered;
        UserRole role;
        string photoPath; // Path to client profile photo (optional)
    }
    
    // Order structure - Updated to match database schema
    struct Order {
        uint256 id;
        address customer;
        address vendor;
        uint256 amount;
        string productIds; // Serialized array of product IDs
        OrderStatus status;
        uint256 timestamp;
        string vendorEmail; // Added to ensure email is always available
    }
    
    enum OrderStatus { Placed, Processing, Shipped, Delivered, Cancelled, Refunded }
    
    // Mapping from vendor address to vendor details
    mapping(address => Vendor) public vendors;
    
    // Mapping from vendor email to vendor address
    mapping(string => address) public vendorsByEmail;
    
    // Mapping from client address to client details
    mapping(address => Client) public clients;
    
    // Mapping from client email to client address
    mapping(string => address) public clientsByEmail;
    
    // Mapping of order IDs to orders
    mapping(uint256 => Order) public orders;
    
    // Orders per customer
    mapping(address => uint256[]) public customerOrders;
    
    // Orders per vendor
    mapping(address => uint256[]) public vendorOrders;
    
    // Order counter
    uint256 private orderCounter = 0;
    
    // Events
    event VendorRegistered(address indexed vendorAddress, string email, string name);
    event ClientRegistered(address indexed clientAddress, string email);
    event OrderPlaced(uint256 indexed orderId, address customer, address vendor, uint256 amount);
    event OrderStatusChanged(uint256 indexed orderId, OrderStatus newStatus);
    event VendorPaid(address indexed vendor, uint256 amount);
    event FundsWithdrawn(address indexed vendor, uint256 amount);
    
    // Constructor
    constructor() {
        owner = msg.sender;
    }
    
    // Modifiers
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }
    
    modifier onlyVendor() {
        require(vendors[msg.sender].isRegistered, "Only registered vendors can call this function");
        _;
    }

    modifier onlyClient() {
        require(clients[msg.sender].isRegistered, "Only registered clients can call this function");
        _;
    }
    
    modifier orderExists(uint256 _orderId) {
        require(orders[_orderId].id == _orderId, "Order does not exist");
        _;
    }
    
    // Register a new vendor
    function registerVendor(string memory _email, string memory _name, string memory _cryptoKey) public {
        require(!vendors[msg.sender].isRegistered, "Vendor already registered");
        require(vendorsByEmail[_email] == address(0), "Email already registered");
        
        // Create vendor record
        vendors[msg.sender] = Vendor({
            vendorAddress: payable(msg.sender),
            email: _email,
            name: _name,
            isRegistered: true,
            balance: 0,
            cryptoKey: _cryptoKey,
            photoPath: ""
        });
        
        // Map email to vendor address
        vendorsByEmail[_email] = msg.sender;
        
        emit VendorRegistered(msg.sender, _email, _name);
    }

    // Register a new client
    function registerClient(string memory _email, string memory _name) public {
        require(!clients[msg.sender].isRegistered, "Client already registered");
        require(clientsByEmail[_email] == address(0), "Email already registered");
        
        // Create client record
        clients[msg.sender] = Client({
            clientAddress: msg.sender,
            email: _email,
            name: _name,
            isRegistered: true,
            role: UserRole.Client,
            photoPath: ""
        });
        
        // Map email to client address
        clientsByEmail[_email] = msg.sender;
        
        emit ClientRegistered(msg.sender, _email);
    }
    
    // Update vendor details
    function updateVendorDetails(string memory _name, string memory _cryptoKey, string memory _photoPath) public onlyVendor {
        vendors[msg.sender].name = _name;
        vendors[msg.sender].cryptoKey = _cryptoKey;
        
        // Only update photoPath if provided
        if (bytes(_photoPath).length > 0) {
            vendors[msg.sender].photoPath = _photoPath;
        }
    }

    // Update client details
    function updateClientDetails(string memory _name, string memory _photoPath) public onlyClient {
        clients[msg.sender].name = _name;
        
        // Only update photoPath if provided
        if (bytes(_photoPath).length > 0) {
            clients[msg.sender].photoPath = _photoPath;
        }
    }
    
    // Place an order and pay for products
    function placeOrder(address _vendorAddress, string memory _productIds) public payable {
        require(vendors[_vendorAddress].isRegistered, "Vendor not registered");
        require(msg.value > 0, "Payment amount must be greater than zero");
        
        // Create a new order
        uint256 orderId = orderCounter++;
        Order memory newOrder = Order({
            id: orderId,
            customer: msg.sender,
            vendor: _vendorAddress,
            amount: msg.value,
            productIds: _productIds,
            status: OrderStatus.Placed,
            timestamp: block.timestamp,
            vendorEmail: vendors[_vendorAddress].email
        });
        
        // Store the order
        orders[orderId] = newOrder;
        
        // Add to customer and vendor order lists
        customerOrders[msg.sender].push(orderId);
        vendorOrders[_vendorAddress].push(orderId);
        
        // Calculate platform fee
        uint256 platformFee = (msg.value * platformFeeRate) / 10000;
        uint256 vendorPayment = msg.value - platformFee;
        
        // Add to vendor balance
        vendors[_vendorAddress].balance += vendorPayment;
        
        emit OrderPlaced(orderId, msg.sender, _vendorAddress, msg.value);
    }
    // Update order status (vendor or owner only)
    function updateOrderStatus(uint256 _orderId, OrderStatus _status) public orderExists(_orderId) {
        Order storage order = orders[_orderId];
        // Only vendor or platform owner can update
        require(
            msg.sender == order.vendor || msg.sender == owner,
            "Only vendor or owner can update order status"
        );
        // Cannot update cancelled or refunded orders
        require(
            order.status != OrderStatus.Cancelled && order.status != OrderStatus.Refunded,
            "Cannot update cancelled or refunded orders"
        );
        // Update status
        order.status = _status;  
        emit OrderStatusChanged(_orderId, _status);
// If order is cancelled or refunded by platform owner, process refund
        if ((order.status == OrderStatus.Cancelled || order.status == OrderStatus.Refunded) 
            && msg.sender == owner) {
            processRefund(_orderId);
        }
    }
// Process a refund for an order (only owner can call)
    function processRefund(uint256 _orderId) internal orderExists(_orderId) {
        Order storage order = orders[_orderId]; 
// Calculate platform fee already taken
        uint256 platformFee = (order.amount * platformFeeRate) / 10000;
        uint256 vendorAmount = order.amount - platformFee;// Only deduct if vendor has sufficient balance
        if (vendors[order.vendor].balance >= vendorAmount) {
            vendors[order.vendor].balance -= vendorAmount;
// Send funds back to customer
            payable(order.customer).transfer(order.amount);
        }
    }
// Withdraw vendor balance
    function withdrawFunds() public onlyVendor {
        uint256 withdrawalAmount = vendors[msg.sender].balance;
        require(withdrawalAmount >= minimumWithdrawalAmount, "Withdrawal amount too small");
// Zero the balance before transfer to prevent re-entrancy
        vendors[msg.sender].balance = 0;
        
// Transfer funds to vendor
        payable(msg.sender).transfer(withdrawalAmount);
        
        emit FundsWithdrawn(msg.sender, withdrawalAmount);
    }
// Get vendor details
    function getVendorDetails(address _vendorAddress) public view returns (
        string memory email,
        string memory name,
        bool isRegistered,
        uint256 balance
    ) {
        Vendor storage vendor = vendors[_vendorAddress];
        return (vendor.email, vendor.name, vendor.isRegistered, vendor.balance);
    }
// Get vendor full details
    function getVendorFullDetails(address _vendorAddress) public view returns (
        string memory email,
        string memory name,
        bool isRegistered,
        uint256 balance,
        string memory cryptoKey,
        string memory photoPath
    ) {
        Vendor storage vendor = vendors[_vendorAddress];
        return (
            vendor.email, 
            vendor.name, 
            vendor.isRegistered, 
            vendor.balance, 
            vendor.cryptoKey, 
            vendor.photoPath
        );
    }
    
    // Get client details
    function getClientDetails(address _clientAddress) public view returns (
        string memory email,
        string memory name,
        bool isRegistered,
        UserRole role,
        string memory photoPath
    ) {
        Client storage client = clients[_clientAddress];
        return (
            client.email,
            client.name,
            client.isRegistered,
            client.role,
            client.photoPath
        );
    }
    
    // Get order details
    function getOrderDetails(uint256 _orderId) public view orderExists(_orderId) returns (
        address customer,
        address vendor,
        uint256 amount,
        string memory productIds,
        OrderStatus status,
        uint256 timestamp,
        string memory vendorEmail
    ) {
        Order storage order = orders[_orderId];
        return (
            order.customer,
            order.vendor,
            order.amount,
            order.productIds,
            order.status,
            order.timestamp,
            order.vendorEmail
        );
    }
    
    // Get customer orders
    function getCustomerOrders(address _customer) public view returns (uint256[] memory) {
        return customerOrders[_customer];
    }
    
    // Get vendor orders
    function getVendorOrders() public view onlyVendor returns (uint256[] memory) {
        return vendorOrders[msg.sender];
    }
    
    // Check if an address is a registered vendor
    function isVendor(address _address) public view returns (bool) {
        return vendors[_address].isRegistered;
    }
    
    // Check if an address is a registered client
    function isClient(address _address) public view returns (bool) {
        return clients[_address].isRegistered;
    }
    
    // Update platform fee rate (owner only)
    function updatePlatformFeeRate(uint16 _newRate) public onlyOwner {
        require(_newRate <= 1000, "Fee cannot exceed 10%");
        platformFeeRate = _newRate;
    }
    
    // Update minimum withdrawal amount (owner only)
    function updateMinimumWithdrawal(uint256 _amount) public onlyOwner {
        minimumWithdrawalAmount = _amount;
    }
    
    // Get contract balance (owner only)
    function getContractBalance() public view onlyOwner returns (uint256) {
        return address(this).balance;
    }
    
    // Withdraw platform fees (owner only)
    function withdrawPlatformFees() public onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No balance to withdraw");
        
        payable(owner).transfer(balance);
    }
}
