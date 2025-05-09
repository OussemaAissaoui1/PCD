/**
 * Vendor Tracking Dashboard Script
 * Handles vendor dashboard functionality including products and orders with API integration
 */

document.addEventListener('DOMContentLoaded', function() {
    console.log("Vendor tracking dashboard loaded");
    
    // Debug function to check API connectivity
    const checkApiEndpoints = async () => {
        const endpoints = [
            '/api/products/all', // Updated to match the correct endpoint
            '/api/products/add',
            '/api/user/profile'
        ];
        console.log("Checking API endpoints..."); 
        for (const endpoint of endpoints) {
            try {
                const response = await fetch(endpoint);
                console.log(`Endpoint ${endpoint}: Status ${response.status}`);
            } catch (error) {
                console.error(`Endpoint ${endpoint}: Error`, error);
            }
        }
    };
    // Call this function to debug
    checkApiEndpoints();
    
    // Check if user is logged in and is a vendor
    const checkVendorAuth = () => {
        // Check token first
        const token = localStorage.getItem('token');
        let userData = null;
        
        if (token) {
            try {
                // Parse JWT payload
                const payload = JSON.parse(atob(token.split('.')[1]));
                console.log("User role from token:", payload.role);
                
                if (payload.role !== 'vendor') {
                    console.log("User is not a vendor, redirecting...");
                    window.location.href = 'index.html';
                    return null;
                }
                
                // Create userData object from token payload
                userData = {
                    id: payload.id || payload._id,  // Make sure to include vendor ID
                    name: payload.name || 'Vendor',
                    email: payload.email || 'No email provided',
                    cryptoKey: payload.cryptoKey || 'Not provided',
                    role: payload.role,
                    token: token
                };
            } catch (error) {
                console.error("Error parsing token:", error);
            }
        }
        
        // Fall back to userData if token failed
        if (!userData) {
            userData = JSON.parse(localStorage.getItem('userData') || '{}');
            
            if (!userData.token || userData.role !== 'vendor') {
                console.log("Not authenticated as vendor, redirecting...");
                window.location.href = 'index.html';
                return null;
            }
        }
        
        return userData;
    };
    
    const userData = checkVendorAuth();
    if (!userData) {
        console.log("Vendor authentication failed");
        return;
    }
    
    console.log("Vendor authenticated:", userData.name);
    // Populate vendor information on the page
    const vendorNameElement = document.getElementById('vendorName');
    const vendorEmailElement = document.getElementById('vendorEmail');
    const vendorCryptoKeyElement = document.getElementById('vendorCryptoKey');
    const profilePictureElement = document.getElementById('profilePicture');
    const totalProductsElement = document.getElementById('totalProducts');
    const totalOrdersElement = document.getElementById('totalOrders');
    
    if (vendorNameElement) vendorNameElement.textContent = userData.name;
    if (vendorEmailElement) vendorEmailElement.textContent = userData.email;
    if (vendorCryptoKeyElement) vendorCryptoKeyElement.textContent = userData.cryptoKey;
    if (profilePictureElement) {
        profilePictureElement.src = 'img/default-avatar.png'; // Use relative path
        profilePictureElement.style.display = 'block';
    }
    
    // Initialize dashboard data counters
    let totalProducts = 0;
    let totalOrders = 0;
    
    // Fetch vendor's products from the real API with the correct endpoint
    const fetchVendorProducts = async () => {
        try {
            console.log("Fetching vendor products from MongoDB...");
            
            // Show loading indicator if it exists
            const loadingIndicator = document.getElementById('loadingIndicator');
            if (loadingIndicator) loadingIndicator.style.display = 'block';
            
            // Use the API endpoint defined in your products.js file
            const response = await fetch('/api/products/all', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${userData.token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`Failed to fetch products: ${response.status}`);
            }
            
            const data = await response.json();
            console.log("API Response:", data);
            
            // Extract products array from the response
            let products = [];
            if (data.products && Array.isArray(data.products)) {
                products = data.products;
            } else if (Array.isArray(data)) {
                products = data;
            }
            
            console.log("Extracted products:", products);
            
            // Filter products to only include those from this vendor
            const vendorProducts = products.filter(product => {
                // In your MongoDB schema products are associated with vendorEmail
                const productVendorEmail = product.vendorEmail;
                const userEmail = userData.email;
                
                // Log for debugging
                console.log("Comparing product vendor:", productVendorEmail, "with user email:", userEmail);
                
                return productVendorEmail === userEmail;
            });
            
            console.log("Vendor's products:", vendorProducts);
            
            // Update total products count
            totalProducts = vendorProducts.length;
            if (totalProductsElement) totalProductsElement.textContent = totalProducts;
            
            // Render products on page
            renderProducts(vendorProducts);
            
            // Hide "no products" message if we have products
            const noProductsMessage = document.getElementById('noProductsMessage');
            if (noProductsMessage) {
                noProductsMessage.style.display = vendorProducts.length > 0 ? 'none' : 'block';
            }
        } catch (error) {
            console.error("Error fetching products:", error);
            alert("Could not load your products. Please try again later.");
        } finally {
            // Hide loading indicator if it exists
            const loadingIndicator = document.getElementById('loadingIndicator');
            if (loadingIndicator) loadingIndicator.style.display = 'none';
        }
    };
    
    // Fetch vendor's orders
    const fetchVendorOrders = async () => {
        try {
            console.log("Fetching vendor orders from MongoDB...");
            
            // In a real implementation, you would fetch orders from your MongoDB
            // For now, we'll just show a message that orders are not implemented yet
            
            // Show a "not implemented" message
            const container = document.getElementById('vendorOrders');
            if (container) {
                container.innerHTML = `
                    <div class="alert alert-info">
                        <p>Order tracking functionality will be implemented soon.</p>
                        <p>Check back later to view your customer orders.</p>
                    </div>
                `;
            }
            
            // Hide any loading indicators
            const noOrdersMessage = document.getElementById('noOrdersMessage');
            if (noOrdersMessage) {
                noOrdersMessage.style.display = 'none';
            }
            
            // Set order count to 0 for now
            totalOrders = 0;
            if (totalOrdersElement) totalOrdersElement.textContent = totalOrders;
            
        } catch (error) {
            console.error("Error fetching orders:", error);
            alert("Could not load your orders. Please try again later.");
        }
    };
    
    // Render products on the page - update to match the schema from your API
    const renderProducts = (products) => {
        const container = document.getElementById('vendorProducts');
        const template = document.getElementById('productTemplate');
        
        if (!container || !template) {
            console.error("Product container or template not found");
            return;
        }
        
        // Clear existing content
        container.innerHTML = '';
        
        // Check if we have products
        if (!products || products.length === 0) {
            const noProductsMessage = document.getElementById('noProductsMessage');
            if (noProductsMessage) {
                noProductsMessage.style.display = 'block';
            }
            return;
        }
        
        products.forEach(product => {
            const productElement = document.importNode(template.content, true);
            
            // Set product data in the template
            const productImg = productElement.querySelector('.product-img img');
            if (productImg) {
                // Get the mainPhoto path from the MongoDB product document
                let imageSrc = '';
                
                // Handle different possible image path formats
                if (product.mainPhoto) {
                    // If it's a complete URL, use it directly
                    if (product.mainPhoto.startsWith('http')) {
                        imageSrc = product.mainPhoto;
                    } 
                    // If it's a relative path with uploads/products
                    else if (product.mainPhoto.includes('uploads/products')) {
                        imageSrc = `/${product.mainPhoto}`;
                    }
                    // If it's just the filename (what your API returns after processing)
                    else {
                        imageSrc = `/uploads/products/${product.vendorEmail}/${product.mainPhoto}`;
                    }
                } else {
                    // Fallback to a default image
                    imageSrc = 'img/product/default-product.jpg';
                }
                
                productImg.src = imageSrc;
                productImg.alt = product.name || 'Product image';
                
                // Add error handler for image loading
                productImg.onerror = function() {
                    console.log("Error loading image, using fallback");
                    this.src = 'img/product/default-product.jpg';
                };
            }
            
            const productName = productElement.querySelector('.product-name');
            if (productName) productName.textContent = product.name || 'Unnamed product';
            
            const priceValue = productElement.querySelector('.price-value');
            if (priceValue) priceValue.textContent = parseFloat(product.price).toFixed(2);
            
            // For category, use a field from your schema if available, or default to Description
            const productCategory = productElement.querySelector('.product-category');
            if (productCategory) {
                productCategory.textContent = product.category || 
                                             (product.mainDescription ? 
                                              product.mainDescription.substring(0, 20) + '...' : 
                                              'Uncategorized');
            }
            
            // Set data attributes - use _id for MongoDB ObjectID
            const productCard = productElement.querySelector('.product-card');
            if (productCard) productCard.dataset.productId = product._id;
            
            container.appendChild(productElement);
        });
        
        // Setup event listeners for actions
        setupProductActionListeners();
    };
    
    // Render orders on the page
    const renderOrders = (orders) => {
        const container = document.getElementById('vendorOrders');
        const template = document.getElementById('orderTemplate');
        const productTemplate = document.getElementById('orderProductTemplate');
        
        if (!container || !template || !productTemplate) {
            console.error("Order container or templates not found");
            return;
        }
        
        orders.forEach(order => {
            const orderElement = document.importNode(template.content, true);
            
            // Set order data in the template
            const orderId = orderElement.querySelector('.order-id');
            if (orderId) orderId.textContent = order.id;
            
            const orderDate = orderElement.querySelector('.order-date');
            if (orderDate) orderDate.textContent = new Date(order.date).toLocaleDateString();
            
            const orderStatus = orderElement.querySelector('.order-status');
            if (orderStatus) {
                orderStatus.textContent = order.status;
                
                // Set status class for styling
                if (order.status === 'Completed') {
                    orderStatus.classList.add('badge-success');
                } else if (order.status === 'Shipped') {
                    orderStatus.classList.add('badge-primary');
                } else if (order.status === 'Processing') {
                    orderStatus.classList.add('badge-warning');
                }
            }
            
            const orderTotal = orderElement.querySelector('.order-total');
            if (orderTotal) orderTotal.textContent = `$${order.total.toFixed(2)}`;
            
            // Set customer information
            const customerName = orderElement.querySelector('.customer-name');
            if (customerName) customerName.textContent = order.customer.name;
            
            const customerEmail = orderElement.querySelector('.customer-email');
            if (customerEmail) customerEmail.textContent = order.customer.email;
            
            const customerPhone = orderElement.querySelector('.customer-phone');
            if (customerPhone) customerPhone.textContent = order.customer.phone;
            
            const customerAddress = orderElement.querySelector('.customer-address');
            if (customerAddress) customerAddress.textContent = order.customer.address;
            
            const customerCity = orderElement.querySelector('.customer-city');
            if (customerCity) customerCity.textContent = order.customer.city;
            
            const customerZip = orderElement.querySelector('.customer-zip');
            if (customerZip) customerZip.textContent = order.customer.zip;
            
            const orderNotes = orderElement.querySelector('.order-notes');
            if (orderNotes) orderNotes.textContent = order.customer.notes || 'None';
            
            // Add products to the order
            const productsContainer = orderElement.querySelector('.order-products');
            if (productsContainer && order.products) {
                order.products.forEach(product => {
                    const productElement = document.importNode(productTemplate.content, true);
                    
                    // Set product data
                    const productImg = productElement.querySelector('img');
                    if (productImg) {
                        productImg.src = product.image;
                        productImg.alt = product.name;
                    }
                    
                    const productName = productElement.querySelector('.order-product-name');
                    if (productName) productName.textContent = product.name;
                    
                    const productQuantity = productElement.querySelector('.order-product-quantity');
                    if (productQuantity) productQuantity.textContent = product.quantity;
                    
                    const productPrice = productElement.querySelector('.order-product-price');
                    if (productPrice) productPrice.textContent = product.price.toFixed(2);
                    
                    productsContainer.appendChild(productElement);
                });
            }
            
            container.appendChild(orderElement);
        });
    };
    
    // Setup event listeners for product actions (edit price, remove)
    const setupProductActionListeners = () => {
        // Edit price button
        document.querySelectorAll('.edit-price-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const productCard = this.closest('.product-card');
                if (!productCard) return;
                
                const priceForm = productCard.querySelector('.edit-price-form');
                if (!priceForm) return;
                
                const priceValue = productCard.querySelector('.price-value');
                if (!priceValue) return;
                
                // Show form with current price
                priceForm.style.display = 'block';
                const priceInput = priceForm.querySelector('.new-price-input');
                if (priceInput) priceInput.value = priceValue.textContent;
                
                // Hide edit button while editing
                this.style.display = 'none';
            });
        });
        
        // Cancel price edit
        document.querySelectorAll('.cancel-price-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const productCard = this.closest('.product-card');
                if (!productCard) return;
                
                const priceForm = productCard.querySelector('.edit-price-form');
                if (!priceForm) return;
                
                const editBtn = productCard.querySelector('.edit-price-btn');
                if (!editBtn) return;
                
                // Hide form and show edit button
                priceForm.style.display = 'none';
                editBtn.style.display = 'inline-block';
            });
        });
        
        // Save price edit - Now uses the API
        document.addEventListener('click', function(e) {
            if (e.target && e.target.classList.contains('save-price-btn')) {
                const btn = e.target;
                const productCard = btn.closest('.product-card');
                if (!productCard) return;
                
                const productId = productCard.dataset.productId;
                const priceInput = productCard.querySelector('.new-price-input');
                if (!priceInput) return;
                
                const newPrice = priceInput.value;
                const priceDisplay = productCard.querySelector('.price-value');
                if (!priceDisplay) return;
                
                const editBtn = productCard.querySelector('.edit-price-btn');
                const priceForm = productCard.querySelector('.edit-price-form');
                
                if (!newPrice || isNaN(newPrice) || parseFloat(newPrice) <= 0) {
                    alert('Please enter a valid price.');
                    return;
                }
                
                // Use an async IIFE (Immediately Invoked Function Expression)
                (async function() {
                    try {
                        // Display "updating" state
                        btn.textContent = 'Updating...';
                        btn.disabled = true;
                        
                        // Use the correct endpoint for your API
                        const response = await fetch(`/api/products/update/${productId}`, {
                            method: 'PATCH',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${userData.token}`
                            },
                            body: JSON.stringify({ price: parseFloat(newPrice) })
                        });
                        
                        if (!response.ok) {
                            throw new Error(`Failed to update price: ${response.status}`);
                        }
                        
                        const data = await response.json();
                        console.log("Price updated successfully:", data);
                        
                        // Update the display price
                        priceDisplay.textContent = parseFloat(newPrice).toFixed(2);
                        
                        // Hide form and show edit button
                        if (priceForm) priceForm.style.display = 'none';
                        if (editBtn) editBtn.style.display = 'inline-block';
                        
                        // Show success message
                        alert(`Price updated to $${parseFloat(newPrice).toFixed(2)}`);
                        
                    } catch (error) {
                        console.error('Error updating price:', error);
                        alert('Failed to update price. Please try again.');
                    } finally {
                        // Reset button state
                        btn.textContent = 'Save';
                        btn.disabled = false;
                    }
                })();
            }
        });
        
        // Remove product buttons - Now uses the API
        document.querySelectorAll('.remove-product-btn').forEach(btn => {
            btn.addEventListener('click', async function() {
                if (!confirm('Are you sure you want to remove this product? This cannot be undone.')) {
                    return;
                }
                
                const productCard = this.closest('.product-card');
                if (!productCard) return;
                
                const productId = productCard.dataset.productId;
                
                try {
                    // Display "removing" state
                    btn.textContent = 'Removing...';
                    btn.disabled = true;
                    
                    // Make API call to delete product using the correct endpoint
                    const response = await fetch(`/api/products/delete/${productId}`, {
                        method: 'DELETE',
                        headers: {
                            'Authorization': `Bearer ${userData.token}`,
                            'Content-Type': 'application/json'
                        }
                    });
                    
                    // Check if deletion was successful
                    if (!response.ok) {
                        throw new Error(`Failed to delete product: ${response.status}`);
                    }
                    
                    console.log(`Product ${productId} removed successfully`);
                    
                    // Remove product from the UI
                    const productCol = productCard.closest('.col-lg-4');
                    if (productCol) productCol.remove();
                    
                    // Update counter
                    totalProducts--;
                    if (totalProductsElement) totalProductsElement.textContent = totalProducts;
                    
                    // Show "no products" message if all products are removed
                    if (totalProducts === 0) {
                        const noProductsMessage = document.getElementById('noProductsMessage');
                        if (noProductsMessage) noProductsMessage.style.display = 'block';
                    }
                    
                    // Show success message
                    alert('Product removed successfully');
                    
                } catch (error) {
                    console.error('Error removing product:', error);
                    alert('Failed to remove product. Please try again.');
                } finally {
                    // Reset button state
                    btn.textContent = 'Remove';
                    btn.disabled = false;
                }
            });
        });
    };
    
    // Update products on the category page if it's in LocalStorage
    const updateCategoryPageProducts = (productId, newPrice) => {
        try {
            // Check if we have category products in localStorage
            const categoryProducts = JSON.parse(localStorage.getItem('categoryProducts') || '[]');
            if (categoryProducts.length > 0) {
                // Find and update the product price
                const updatedProducts = categoryProducts.map(product => {
                    if ((product._id || product.id) === productId) {
                        return { ...product, price: newPrice };
                    }
                    return product;
                });
                
                // Save back to localStorage for the category page to use
                localStorage.setItem('categoryProducts', JSON.stringify(updatedProducts));
                console.log('Category page products updated with new price');
            }
        } catch (error) {
            console.error('Error updating category page products:', error);
        }
    };
    
    // Initiate the loading of vendor dashboard data
    fetchVendorProducts();
    fetchVendorOrders();
    
    // Toggle logout menu on profile picture click
    const profilePicture = document.getElementById('profilePicture');
    const logoutMenu = document.getElementById('logoutMenu');
    
    if (profilePicture && logoutMenu) {
        profilePicture.addEventListener('click', function() {
            logoutMenu.style.display = logoutMenu.style.display === 'block' ? 'none' : 'block';
        });
        
        // Close menu when clicking elsewhere
        document.addEventListener('click', function(e) {
            if (e.target !== profilePicture && logoutMenu.style.display === 'block') {
                logoutMenu.style.display = 'none';
            }
        });
    }
    
    // Handle logout button click
    const logoutButton = document.getElementById('logoutButton');
    if (logoutButton) {
        logoutButton.addEventListener('click', function(e) {
            e.preventDefault();
            localStorage.removeItem('token');
            localStorage.removeItem('userData');
            window.location.href = 'index.html';
        });
    }
});

document.addEventListener('DOMContentLoaded', () => {
    console.log("Vendor tracking page loaded.");
    fetchVendorOrders();
});

async function fetchVendorOrders() {
    const ordersListDiv = document.getElementById('vendor-orders-list');
    const loadingIndicator = document.getElementById('loading-indicator');

    if (!ordersListDiv || !loadingIndicator) {
        console.error('Required HTML elements (vendor-orders-list or loading-indicator) not found.');
        if (ordersListDiv) {
             ordersListDiv.innerHTML = '<div class="alert alert-danger">Page setup error: Missing required elements.</div>';
        }
        return;
    }

    // Show loading indicator
    loadingIndicator.style.display = 'block';
    ordersListDiv.innerHTML = ''; // Clear previous content

    // 1. Get token from localStorage (check both common locations)
    let token = localStorage.getItem('token');
    if (!token) {
        try {
            const userDataString = localStorage.getItem('userData');
            if (userDataString) {
                const userData = JSON.parse(userDataString);
                token = userData ? userData.token : null;
            }
        } catch (e) {
            console.error("Error parsing userData from localStorage:", e);
            token = null; // Ensure token is null if parsing fails
        }
    }

    if (!token) {
        console.error('Authentication token not found.');
        loadingIndicator.style.display = 'none';
        ordersListDiv.innerHTML = `
            <div class="alert alert-danger" role="alert">
                You must be logged in as a vendor to view orders. Please <a href="index.html" class="alert-link">log in</a>.
            </div>
        `;
        // Optional: Redirect to login page after a delay
        // setTimeout(() => { window.location.href = '/index.html'; }, 3000);
        return;
    }

    console.log("Token found, fetching vendor orders...");

    try {
        // 2. Fetch orders from the backend API
        const response = await fetch('/api/orders/vendor', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
                // Add 'Accept': 'application/json' if needed
            }
        });

        // Hide loading indicator once fetch is complete (success or error)
        loadingIndicator.style.display = 'none';

        if (!response.ok) {
            let errorMsg = 'Failed to fetch orders.';
            try {
                // Try to parse error message from server response
                const errorData = await response.json();
                errorMsg = errorData.error || `Server responded with status ${response.status}`;
            } catch (e) {
                 // If response is not JSON or parsing fails, use status text
                 errorMsg = `Server error: ${response.status} ${response.statusText}`;
            }

            // Handle specific auth errors
            if (response.status === 401 || response.status === 403) {
                 errorMsg = 'Authentication failed or you are not authorized. Please log in again.';
                 // Optionally clear token and redirect
                 // localStorage.removeItem('token');
                 // localStorage.removeItem('userData');
                 // setTimeout(() => { window.location.href = '/index.html'; }, 3000);
            }
            throw new Error(errorMsg);
        }

        const orders = await response.json();
        console.log("Received orders:", orders);

        // 3. Display orders
        displayOrders(orders, ordersListDiv);

    } catch (error) {
        console.error('Error fetching vendor orders:', error);
        loadingIndicator.style.display = 'none'; // Ensure loading is hidden on error
        ordersListDiv.innerHTML = `
            <div class="alert alert-danger" role="alert">
                Error loading your orders: ${error.message}
            </div>
        `;
    }
}

function displayOrders(orders, container) {
    if (!orders || orders.length === 0) {
        container.innerHTML = `
            <div class="alert alert-info text-center" role="alert">
                <i class="fa fa-info-circle mr-2"></i>You currently have no orders containing your products.
            </div>
        `;
        return;
    }

    let tableHTML = `
        <table class="table table-hover table-striped">
            <thead class="thead-light">
                <tr>
                    <th scope="col">Order ID</th>
                    <th scope="col">Date</th>
                    <th scope="col">Customer Email</th>
                    <th scope="col">Your Items in Order</th>
                    <th scope="col">Status</th>
                    <th scope="col">Actions</th>
                    <th scope="col">Shipping Address</th>
                </tr>
            </thead>
            <tbody>
    `;

    orders.forEach(order => {
        // Format items for display
        const itemsList = order.items && Array.isArray(order.items) ? order.items.map(item => {
            // Get saved status from localStorage or use item status
            const savedStatus = localStorage.getItem(`order_${order.orderId}_item_${item.id}_status`) || item.status || 'Pending';
            const statusBadgeClass = getStatusBadgeClass(savedStatus);
            return `
                <li class="small mb-2" data-item-id="${item.id}">
                    ${item.quantity || 1} x ${item.name || 'Unknown Item'} 
                    (${item.price ? '$'+parseFloat(item.price).toFixed(2) : 'Price N/A'})
                    <br>
                    <span class="badge ${statusBadgeClass} status-badge">${savedStatus}</span>
                </li>`;
        }).join('') : '<li>No item details available</li>';

        // Format shipping address safely
        let shippingInfo = 'Not Provided';
        if (order.shippingAddress) {
            const addr = order.shippingAddress;
            shippingInfo = [addr.firstName, addr.lastName, addr.address, addr.city, addr.zip]
                            .filter(part => part && String(part).trim() !== '')
                            .join(', ');
            if (!shippingInfo) shippingInfo = 'Address details incomplete';
        }

        const orderDate = order.createdAt ? new Date(order.createdAt).toLocaleDateString() : 'Date N/A';

        tableHTML += `
            <tr>
                <td class="small">${order.orderId || 'N/A'}</td>
                <td class="small">${orderDate}</td>
                <td class="small">${order.customerEmail || 'N/A'}</td>
                <td><ul class="list-unstyled mb-0">${itemsList}</ul></td>
                <td class="text-center">
                    ${order.items.map(item => {
                        const savedStatus = localStorage.getItem(`order_${order.orderId}_item_${item.id}_status`) || item.status || 'Pending';
                        return `
                            <div class="status-control mb-2" data-item-id="${item.id}">
                                <select class="form-control form-control-sm status-select" 
                                        data-order-id="${order.orderId}" 
                                        data-item-id="${item.id}">
                                    <option value="Pending" ${savedStatus === 'Pending' ? 'selected' : ''}>Pending</option>
                                    <option value="Shipped" ${savedStatus === 'Shipped' ? 'selected' : ''}>Shipped</option>
                                    <option value="Delivered" ${savedStatus === 'Delivered' ? 'selected' : ''}>Delivered</option>
                                </select>
                            </div>
                        `;
                    }).join('')}
                </td>
                <td>
                    ${order.items.map(item => `
                        <button class="btn btn-sm btn-primary update-status-btn mb-2" 
                                data-order-id="${order.orderId}" 
                                data-item-id="${item.id}">
                            Update Status
                        </button>
                    `).join('')}
                </td>
                <td class="small">${shippingInfo}</td>
            </tr>
        `;
    });

    tableHTML += `
            </tbody>
        </table>
    `;

    container.innerHTML = tableHTML;

    // Add event listeners for status updates
    setupStatusUpdateListeners();
}

function getStatusBadgeClass(status) {
    switch (status.toLowerCase()) {
        case 'delivered':
            return 'badge-success';
        case 'shipped':
            return 'badge-info';
        case 'pending':
            return 'badge-warning';
        default:
            return 'badge-secondary';
    }
}

function setupStatusUpdateListeners() {
    document.querySelectorAll('.update-status-btn').forEach(btn => {
        btn.addEventListener('click', async function() {
            const orderId = this.dataset.orderId;
            const itemId = this.dataset.itemId;
            const statusSelect = document.querySelector(`select[data-order-id="${orderId}"][data-item-id="${itemId}"]`);
            
            if (!statusSelect) return;

            const newStatus = statusSelect.value;
            const originalStatus = statusSelect.value;
            const storageKey = `order_${orderId}_item_${itemId}_status`;
            
            try {
                btn.disabled = true;
                btn.textContent = 'Updating...';
                statusSelect.disabled = true;

                const response = await fetch(`/api/orders/items/${orderId}/${itemId}/status`, {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    },
                    body: JSON.stringify({ status: newStatus })
                });

                if (!response.ok) {
                    throw new Error('Failed to update status');
                }

                const updatedData = await response.json();

                // Store the updated status in localStorage
                localStorage.setItem(storageKey, newStatus);

                // Show success message with auto-refresh notification
                alert('Status updated successfully! The page will refresh to show the latest changes.');
                
                // Auto refresh the page after updating status
                window.location.reload();

            } catch (error) {
                console.error('Error updating status:', error);
                alert('Failed to update status. Please try again.');
                
                // Remove failed status from localStorage and revert to original
                localStorage.removeItem(storageKey);
                statusSelect.value = originalStatus;
                
                // Update badge back to original status
                const statusBadge = document.querySelector(`li[data-item-id="${itemId}"] .status-badge`);
                if (statusBadge) {
                    statusBadge.textContent = originalStatus;
                    statusBadge.className = `badge ${getStatusBadgeClass(originalStatus)} status-badge`;
                }
            } finally {
                // These will only execute if we haven't refreshed the page
                btn.disabled = false;
                btn.textContent = 'Update Status';
                statusSelect.disabled = false;
            }
        });
    });
}
