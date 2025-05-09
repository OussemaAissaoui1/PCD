document.addEventListener('DOMContentLoaded', function() {
    console.log('========== CART.JS INITIALIZATION ==========');
    console.log('Page URL:', window.location.href);
    console.log('Is cart page:', window.location.href.includes('cart.html'));
    
    // Debug localStorage functionality
    try {
        const testValue = 'test-' + new Date().getTime();
        localStorage.setItem('cart-test', testValue);
        const retrievedValue = localStorage.getItem('cart-test');
        console.log('LocalStorage working:', retrievedValue === testValue);
        localStorage.removeItem('cart-test');
    } catch (e) {
        console.error('LocalStorage error:', e);
    }
    
    // Debug cart contents
    try {
        const cartData = localStorage.getItem('cart');
        console.log('Raw cart data:', cartData);
        
        if (cartData) {
            const parsedCart = JSON.parse(cartData);
            console.log('Parsed cart items:', parsedCart);
            console.log('Number of items:', parsedCart.length);
            
            if (parsedCart.length > 0) {
                console.log('First item:', parsedCart[0]);
            }
        } else {
            console.log('No cart data found in localStorage');
            // Initialize empty cart
            localStorage.setItem('cart', JSON.stringify([]));
            console.log('Created new empty cart');
        }
    } catch (e) {
        console.error('Error accessing cart data:', e);
        // Reset cart if corrupted
        localStorage.setItem('cart', JSON.stringify([]));
    }
    
    // Make sure cart icon links directly to cart page
    const cartIcons = document.querySelectorAll('.ti-shopping-cart');
    cartIcons.forEach(icon => {
        const link = icon.closest('a');
        if (link) {
            link.href = 'cart.html';
            console.log('Cart icon now links to cart.html');
        }
    });
    
    // If we're on the cart page, ensure items are loaded
    if (window.location.href.includes('cart.html')) {
        console.log('On cart page - loading items');
        
        const cartItemsContainer = document.getElementById('cart-items');
        if (cartItemsContainer) {
            console.log('Found cart-items container, loading cart');
            // Load cart directly instead of using setTimeout
            loadCartItems(); 
        } else {
            console.error('ERROR: Could not find #cart-items container!');
        }
    }
    
    // Set up event listeners for cart
    setupCartEventListeners();
    
    // Call at page load and then whenever the cart page or checkout page is loaded
    if (window.location.href.includes('cart.html') || 
        window.location.href.includes('checkout.html')) {
      ensureVendorEmailInCart();
    }
});

// Function to load cart items from localStorage
function loadCartItems() {
    console.log('LOADING CART ITEMS - FUNCTION CALLED');
    
    // Get cart container element
    const cartContainer = document.getElementById('cart-items');
    const cartSummary = document.getElementById('cart-summary');
    
    if (!cartContainer) {
        console.error("CRITICAL ERROR: Cart container (#cart-items) not found!");
        console.log('DOM structure:', document.body.innerHTML);
        return;
    }
    
    console.log('Cart container found:', cartContainer);
    
    // Get cart data from localStorage with better error handling
    let cart = [];
    try {
        const cartData = localStorage.getItem('cart');
        console.log('Raw cart data from localStorage:', cartData);
        
        if (!cartData || cartData === 'undefined' || cartData === 'null') {
            console.log('No valid cart data, using empty array');
            localStorage.setItem('cart', JSON.stringify([]));
            cart = [];
        } else {
            cart = JSON.parse(cartData);
            if (!Array.isArray(cart)) {
                console.error('Cart data is not an array, resetting cart');
                cart = [];
                localStorage.setItem('cart', JSON.stringify([]));
            }
        }
    } catch (error) {
        console.error('Error parsing cart data:', error);
        cart = [];
        localStorage.setItem('cart', JSON.stringify([]));
    }
    
    // Log cart data for debugging
    console.log('Cart for display:', cart);
    
    // Display empty cart message if no items
    if (!cart || cart.length === 0) {
        console.log('Cart is empty, displaying empty message');
        
        // Ensure cartContainer is accessible before manipulating it
        if (cartContainer) {
            cartContainer.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center py-5">
                        <h4>Your cart is empty</h4>
                        <a href="category.html" class="btn btn-primary mt-3">Continue Shopping</a>
                    </td>
                </tr>
            `;
            
            // Update cart summary for empty cart
            if (cartSummary) {
                cartSummary.innerHTML = `
                    <h2>Cart Summary</h2>
                    <ul class="list">
                        <li><a href="#">Subtotal <span>$0.00</span></a></li>
                        <li><a href="#">Shipping <span>$0.00</span></a></li>
                        <li><a href="#">Total <span>$0.00</span></a></li>
                    </ul>
                    <a class="btn_1 checkout_btn_1 disabled" href="checkout.html" style="pointer-events: none; background-color: #ccc;">Proceed to checkout</a>
                `;
            } else {
                console.error('Cart summary container not found');
            }
        }
        
        return;
    }
    
    // If there are items in cart, clear the container and add each item
    console.log(`Found ${cart.length} items in cart, displaying them`);
    cartContainer.innerHTML = '';
    
    // Track total price
    let subtotal = 0;
    
    // Display each cart item
    cart.forEach((item, index) => {
        console.log(`Item ${index + 1}:`, item);
        
        // Validate item data and provide defaults for missing values
        const productId = item.id || `item-${index}`;
        const productName = item.name || 'Unknown Product';
        const price = parseFloat(item.price) || 0;
        const quantity = parseInt(item.quantity) || 1;
        const imagePath = item.image || 'img/product/feature-product/f-p-1.jpg';
        const itemTotal = price * quantity;
        
        // Add to subtotal
        subtotal += itemTotal;
        
        // Create HTML for cart item with improved styling to match project design
        const cartItemHTML = `
            <tr class="cart-item" data-id="${productId}">
                <td>
                    <div class="media">
                        <div class="d-flex">
                            <img src="${imagePath}" alt="${productName}" width="100" height="100" class="rounded"
                                 style="object-fit: cover; border: 1px solid #eee;"
                                 onerror="this.onerror=null; this.src='img/product/feature-product/f-p-1.jpg';">
                        </div>
                        <div class="media-body ml-3">
                            <p class="font-weight-bold" style="margin-bottom: 5px;">${productName}</p>
                            <small class="text-muted">Item #${productId.substring(0, 8)}</small>
                        </div>
                    </div>
                </td>
                <td>
                    <h5 class="text-primary">$${price.toFixed(2)}</h5>
                </td>
                <td>
                    <div class="product_count" style="display: flex; align-items: center; justify-content: center;">
                        <button class="quantity-btn" data-action="decrease" style="border: none; background: #f8f9fa; width: 30px; height: 30px; border-radius: 50%;">-</button>
                        <input type="text" name="qty" id="sst${productId}" maxlength="12" value="${quantity}" 
                               title="Quantity:" class="input-text qty" readonly
                               style="width: 40px; text-align: center; margin: 0 5px; border: 1px solid #eee; border-radius: 4px;">
                        <button class="quantity-btn" data-action="increase" style="border: none; background: #f8f9fa; width: 30px; height: 30px; border-radius: 50%;">+</button>
                    </div>
                </td>
                <td>
                    <h5 class="font-weight-bold">$${itemTotal.toFixed(2)}</h5>
                </td>
                <td>
                    <button class="remove-item btn btn-sm" style="background: transparent; color: #ff6c00;">
                        <i class="ti-trash"></i>
                    </button>
                </td>
            </tr>
        `;
        
        cartContainer.innerHTML += cartItemHTML;
        console.log(`Added item ${index + 1} to cart display`);
    });
    
    // Update cart summary with calculated values and styled buttons
    if (cartSummary) {
        const shipping = subtotal > 0 ? 10.00 : 0; // $10 shipping fee if cart not empty
        const total = subtotal + shipping;
        
        cartSummary.innerHTML = `
            <h2>Cart Summary</h2>
            <ul class="list">
                <li><a href="#">Subtotal <span>$${subtotal.toFixed(2)}</span></a></li>
                <li><a href="#">Shipping <span>$${shipping.toFixed(2)}</span></a></li>
                <li><a href="#">Total <span class="font-weight-bold text-primary">$${total.toFixed(2)}</span></a></li>
            </ul>
            ${subtotal > 0 ? 
                `<a href="checkout.html" class="main_btn">Proceed to checkout</a>
                 <a href="category.html" class="gray_btn" style="margin-top: 10px; display: block; text-align: center;">Continue Shopping</a>` :
                `<a href="checkout.html" class="main_btn" style="background-color: #ccc; color: #666; pointer-events: none; border-color: #ccc;">Proceed to checkout</a>
                 <a href="category.html" class="main_btn" style="margin-top: 10px; display: block; text-align: center;">Shop Now</a>`}
        `;
        console.log('Updated cart summary with totals');
    } else {
        console.error('Cart summary container not found');
    }
    
    // Add empty cart styling if cart is empty
    if (!cart || cart.length === 0) {
        cartContainer.innerHTML = `
            <tr>
                <td colspan="5" class="text-center py-5">
                    <div class="empty-cart-container" style="padding: 40px 20px;">
                        <i class="ti-shopping-cart-full" style="font-size: 60px; color: #ddd; display: block; margin-bottom: 20px;"></i>
                        <h4 style="color: #555; margin-bottom: 20px;">Your cart is empty</h4>
                        <p style="color: #888; margin-bottom: 25px;">Looks like you haven't added anything to your cart yet.</p>
                        <a href="category.html" class="main_btn">Start Shopping</a>
                    </div>
                </td>
            </tr>
        `;
    }
}

// Function to set up event listeners for cart interactions
function setupCartEventListeners() {
    console.log('Setting up cart event listeners');
    
    // Delegate event handling to document
    document.addEventListener('click', function(e) {
        // Handle quantity change buttons
        if (e.target.classList.contains('quantity-btn')) {
            const cartItem = e.target.closest('.cart-item');
            if (cartItem) {
                const productId = cartItem.dataset.id;
                const action = e.target.dataset.action;
                console.log(`Quantity ${action} clicked for product ${productId}`);
                updateQuantity(productId, action);
            }
        }
        
        // Handle remove item buttons
        if (e.target.classList.contains('remove-item') || 
            (e.target.parentElement && e.target.parentElement.classList.contains('remove-item'))) {
            const cartItem = e.target.closest('.cart-item');
            if (cartItem) {
                const productId = cartItem.dataset.id;
                console.log(`Remove button clicked for product ${productId}`);
                removeFromCart(productId);
            }
        }
    });
    
    // Add click event for checkout button
    const checkoutBtn = document.querySelector('.checkout_btn_1');
    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', function(e) {
            const cart = JSON.parse(localStorage.getItem('cart') || '[]');
            if (cart.length === 0) {
                e.preventDefault();
                alert('Your cart is empty. Please add products before checking out.');
            }
        });
    }
}

// Function to update item quantity
function updateQuantity(productId, action) {
    console.log(`Updating quantity for product ${productId}, action: ${action}`);
    
    // Get current cart
    let cart = [];
    try {
        cart = JSON.parse(localStorage.getItem('cart') || '[]');
    } catch (error) {
        console.error('Error parsing cart for quantity update:', error);
        return;
    }
    
    // Find product in cart
    const productIndex = cart.findIndex(item => item.id === productId);
    
    if (productIndex === -1) {
        console.error(`Product ${productId} not found in cart`);
        return;
    }
    
    // Update quantity based on action
    if (action === 'increase') {
        cart[productIndex].quantity = (parseInt(cart[productIndex].quantity) || 1) + 1;
        console.log(`Increased quantity to ${cart[productIndex].quantity}`);
    } else if (action === 'decrease') {
        const currentQty = parseInt(cart[productIndex].quantity) || 1;
        if (currentQty > 1) {
            cart[productIndex].quantity = currentQty - 1;
            console.log(`Decreased quantity to ${cart[productIndex].quantity}`);
        } else {
            console.log('Quantity would go below 1, removing item instead');
            removeFromCart(productId);
            return;
        }
    }
    
    // Update item total price
    const price = parseFloat(cart[productIndex].price) || 0;
    cart[productIndex].totalPrice = (cart[productIndex].quantity * price).toFixed(2);
    
    // Save updated cart
    localStorage.setItem('cart', JSON.stringify(cart));
    console.log('Cart updated in localStorage');
    
    // Reload cart display
    loadCartItems();
}

// Function to remove item from cart
function removeFromCart(productId) {
    console.log(`Removing product ${productId} from cart`);
    
    // Get current cart and filter out the product
    let cart = [];
    try {
        cart = JSON.parse(localStorage.getItem('cart') || '[]');
        cart = cart.filter(item => item.id !== productId);
    } catch (error) {
        console.error('Error parsing cart for item removal:', error);
        return;
    }
    
    // Save updated cart
    localStorage.setItem('cart', JSON.stringify(cart));
    console.log('Updated cart saved to localStorage');
    
    // Reload cart display
    loadCartItems();
}

// Function to add an item to the cart
function addToCart(productId, productName, price, image, vendorEmail = 'default@ensi-ecommerce.com') {
    console.log(`Adding to cart: ${productName} (ID: ${productId}) - $${price} - Vendor: ${vendorEmail}`);
    
    // Get existing cart from localStorage or initialize empty array
    let cart = [];
    try {
        cart = JSON.parse(localStorage.getItem('cart') || '[]');
    } catch (e) {
        console.error('Error parsing cart data:', e);
        cart = [];
    }
    
    // Check if product already exists in cart
    const existingItemIndex = cart.findIndex(item => item.id === productId);
    
    if (existingItemIndex >= 0) {
        // Increment quantity if item already exists
        cart[existingItemIndex].quantity += 1;
    } else {
        // Add new item to cart with vendor email
        cart.push({
            id: productId,
            name: productName,
            price: price,
            image: image,
            quantity: 1,
            vendorEmail: vendorEmail
        });
    }
    
    // Update localStorage
    localStorage.setItem('cart', JSON.stringify(cart));
    
    // Update cart count in header
    updateCartCount();
    
    // Show a toast or notification
    showAddedToCartNotification(productName);
}

// Add a client-side cache for vendor information
const vendorCache = {
  data: {}, // Store product ID -> vendor email mappings
  
  // Check if we have cached data for this product
  has(productId) {
    return !!this.data[productId];
  },
  
  // Get cached vendor info
  get(productId) {
    return this.data[productId];
  },
  
  // Set vendor info in cache
  set(productId, vendorEmail) {
    this.data[productId] = vendorEmail;
  }
};

// Function to ensure vendor email is available for cart items
async function ensureVendorEmailInCart() {
  try {
    // Get current cart
    let cart = [];
    try {
      cart = JSON.parse(localStorage.getItem('cart') || '[]');
    } catch (e) {
      console.error('Error parsing cart data:', e);
      return;
    }

    if (cart.length === 0) {
      return; // No items to process
    }

    let updatedItems = false;
    let fetchPromises = [];

    // Check each item for vendor email
    for (let i = 0; i < cart.length; i++) {
      const item = cart[i];
      
      // If item doesn't have a vendor email or has a placeholder one
      if (!item.vendorEmail || item.vendorEmail === 'default@ensi-ecommerce.com') {
        // Check if we already have this vendor info cached
        if (vendorCache.has(item.id)) {
          cart[i].vendorEmail = vendorCache.get(item.id);
          updatedItems = true;
          console.log(`Using cached vendor email for ${item.id}: ${vendorCache.get(item.id)}`);
          continue;
        }
        
        console.log(`Item ${item.id} missing vendor email, attempting to fetch it once`);
        
        // Create a closure to capture the current index and item
        const fetchVendorInfo = async (index, itemId) => {
          try {
            const vendorData = await fetch(`/api/products/vendor/${itemId}`)
              .then(response => response.json())
              .catch(err => {
                console.error('Error fetching vendor data:', err);
                return null;
              });
            
            if (vendorData && vendorData.vendorEmail) {
              // Store in cache
              vendorCache.set(itemId, vendorData.vendorEmail);
              // Update the cart item
              cart[index].vendorEmail = vendorData.vendorEmail;
              updatedItems = true;
              console.log(`Updated item ${itemId} with vendor email: ${vendorData.vendorEmail}`);
            }
          } catch (error) {
            console.error(`Error retrieving vendor email for item ${itemId}:`, error);
          }
        };
        
        // Add this fetch operation to our list of promises
        fetchPromises.push(fetchVendorInfo(i, item.id));
      }
    }
    
    // Wait for all fetch operations to complete
    if (fetchPromises.length > 0) {
      console.log(`Fetching vendor info for ${fetchPromises.length} items...`);
      await Promise.all(fetchPromises);
      console.log('All vendor info fetches completed');
    }
    
    // If we updated any items, save the cart back to localStorage
    if (updatedItems) {
      localStorage.setItem('cart', JSON.stringify(cart));
      console.log('Cart updated with vendor emails');
    }
  } catch (error) {
    console.error('Error ensuring vendor emails in cart:', error);
  }
}
