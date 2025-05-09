// This file specifically handles cart initialization on the cart.html page

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('Cart initializer loaded');
    
    // Check if we're on the cart page
    if (window.location.pathname.includes('cart.html')) {
        console.log('On cart page - initializing cart');
        
        // Force cart rendering
        renderCart();
    }
});

// Function to render cart contents
function renderCart() {
    console.log('Rendering cart contents');

    const cartContainer = document.getElementById('cart-items');
    if (!cartContainer) {
        console.error('Cart container not found!');
        return;
    }

    let cart;
    try {
        const cartData = localStorage.getItem('cart');
        cart = cartData ? JSON.parse(cartData) : [];
        if (!Array.isArray(cart)) cart = [];
    } catch (e) {
        console.error('Error loading cart:', e);
        cart = [];
    }

    console.log(`Cart has ${cart.length} items`);
    cartContainer.innerHTML = ''; // Clear existing items

    if (cart.length === 0) {
        showEmptyCartMessage();
    } else {
        // Add each item to the table
        cart.forEach((item, index) => {
            const productId = item.id || `item-${index}`;
            const productName = item.name || 'Unknown Product';
            const price = parseFloat(item.price) || 0;
            const quantity = parseInt(item.quantity) || 1;
            const imagePath = item.image || 'img/product/feature-product/f-p-1.jpg';
            const itemTotal = price * quantity;

            const row = document.createElement('tr');
            row.className = 'cart-item';
            row.dataset.id = productId; // Use product ID to identify row

            row.innerHTML = `
                <td>
                    <div class="media">
                        <div class="d-flex">
                            <img src="${imagePath}" alt="${productName}" width="100"
                                 onerror="this.onerror=null; this.src='img/product/feature-product/f-p-1.jpg';">
                        </div>
                        <div class="media-body">
                            <p>${productName}</p>
                        </div>
                    </div>
                </td>
                <td>
                    <h5>$${price.toFixed(2)}</h5>
                </td>
                <td>
                    <div class="product_count">
                        <button class="quantity-btn" data-action="decrease" data-id="${productId}">-</button>
                        <input type="text" name="qty" value="${quantity}" title="Quantity:" class="input-text qty" readonly>
                        <button class="quantity-btn" data-action="increase" data-id="${productId}">+</button>
                    </div>
                </td>
                <td class="item-total">
                    <h5>$${itemTotal.toFixed(2)}</h5>
                </td>
                <td>
                    <button class="remove-item btn btn-sm btn-danger" data-id="${productId}">
                        <i class="ti-trash"></i>
                    </button>
                </td>
            `;
            cartContainer.appendChild(row);
        });
    }

    // Update the cart summary and setup events
    updateCartSummary();
    setupCartEvents(); // Setup events after rendering
}

// Function to display the empty cart message
function showEmptyCartMessage() {
    const cartContainer = document.getElementById('cart-items');
    if (cartContainer) {
        cartContainer.innerHTML = `
            <tr>
                <td colspan="5" class="text-center py-5">
                    <h4>Your cart is empty</h4>
                    <a href="category.html" class="btn btn-primary mt-3">Continue Shopping</a>
                </td>
            </tr>
        `;
    }
}

// Function to update the cart summary section
function updateCartSummary() {
    const cartSummary = document.getElementById('cart-summary');
    if (!cartSummary) return;

    let cart;
    try {
        const cartData = localStorage.getItem('cart');
        cart = cartData ? JSON.parse(cartData) : [];
        if (!Array.isArray(cart)) cart = [];
    } catch (e) {
        console.error('Error loading cart for summary:', e);
        cart = [];
    }

    let subtotal = 0;
    cart.forEach(item => {
        subtotal += (parseFloat(item.price) || 0) * (parseInt(item.quantity) || 0);
    });

    const shipping = cart.length > 0 ? 10.00 : 0.00; // Add shipping only if cart not empty
    const total = subtotal + shipping;

    const checkoutButtonEnabled = cart.length > 0;

    cartSummary.innerHTML = `
        <h2>Cart Summary</h2>
        <ul class="list">
            <li><a href="#">Subtotal <span>$${subtotal.toFixed(2)}</span></a></li>
            <li><a href="#">Shipping <span>$${shipping.toFixed(2)}</span></a></li>
            <li><a href="#">Total <span>$${total.toFixed(2)}</span></a></li>
        </ul>
        <a class="btn_1 checkout_btn_1 ${checkoutButtonEnabled ? '' : 'disabled'}"
           href="${checkoutButtonEnabled ? 'checkout.html' : '#'}"
           style="${checkoutButtonEnabled ? '' : 'pointer-events: none; background-color: #ccc;'}">
           Proceed to checkout
        </a>
    `;
}


// Function to set up cart event listeners (delegated approach)
function setupCartEvents() {
    const cartContainer = document.getElementById('cart-items');
    if (!cartContainer) return;

    // Use event delegation on the container
    cartContainer.addEventListener('click', function(event) {
        const target = event.target;

        // --- Quantity Adjustment ---
        if (target.matches('.quantity-btn')) {
            const action = target.dataset.action;
            const productId = target.dataset.id;
            const row = target.closest('.cart-item');
            const quantityInput = row.querySelector('.input-text.qty');
            const itemTotalElement = row.querySelector('.item-total h5');

            let cart = JSON.parse(localStorage.getItem('cart') || '[]');
            const productIndex = cart.findIndex(item => item.id === productId);

            if (productIndex !== -1) {
                let currentQuantity = parseInt(cart[productIndex].quantity) || 0;
                const price = parseFloat(cart[productIndex].price) || 0;

                if (action === 'increase') {
                    currentQuantity++;
                    cart[productIndex].quantity = currentQuantity;
                } else if (action === 'decrease') {
                    currentQuantity--;
                    if (currentQuantity > 0) {
                        cart[productIndex].quantity = currentQuantity;
                    } else {
                        // Remove item if quantity reaches 0
                        cart.splice(productIndex, 1);
                        row.remove(); // Remove row from DOM
                    }
                }

                // Update DOM only if item still exists
                if (currentQuantity > 0) {
                    quantityInput.value = currentQuantity;
                    itemTotalElement.textContent = `$${(price * currentQuantity).toFixed(2)}`;
                }

                // Save updated cart and update summary
                localStorage.setItem('cart', JSON.stringify(cart));
                updateCartSummary();

                // Check if cart became empty
                if (cart.length === 0) {
                    showEmptyCartMessage();
                }
            }
        }

        // --- Remove Item ---
        if (target.closest('.remove-item')) {
            // Use closest because the click might be on the icon <i> inside the button
            const button = target.closest('.remove-item');
            const productId = button.dataset.id;
            const row = button.closest('.cart-item');

            let cart = JSON.parse(localStorage.getItem('cart') || '[]');
            cart = cart.filter(item => item.id !== productId);

            // Remove row from DOM
            row.remove();

            // Save updated cart and update summary
            localStorage.setItem('cart', JSON.stringify(cart));
            updateCartSummary();

            // Check if cart became empty
            if (cart.length === 0) {
                showEmptyCartMessage();
            }
        }
    });

    }
