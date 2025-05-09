document.addEventListener('DOMContentLoaded', function() {
    const newProductsContainer = document.querySelector('.new_product_area .row');
    
    async function fetchNewProducts() {
        try {
            console.log('Fetching newest products...');
            
            // Use all products endpoint as fallback if newest endpoint fails
            let response = await fetch('/api/products/all');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            let products = data.products || [];
            
            // Use only the 5 newest products
            products = products.slice(0, 5);
            
            console.log(`Successfully fetched ${products.length} newest products`);
            displayNewProducts(products);
        } catch (error) {
            console.error('Error fetching new products:', error);
            // Display fallback products
            displayFallbackProducts();
        }
    }

    function displayNewProducts(products) {
        if (!products || products.length === 0) {
            displayFallbackProducts();
            return;
        }

        // Clear existing content
        newProductsContainer.innerHTML = '';

        // Display the first product in the featured large section
        const featuredProduct = products[0];
        const featuredHTML = `
            <div class="col-lg-6">
                <div class="new_product">
                    <h5 class="text-uppercase">New Arrival</h5>
                    <h3 class="text-uppercase">${featuredProduct.name}</h3>
                    <div class="product-img">
                        <img class="img-fluid" src="/uploads/products/${featuredProduct.vendorEmail}/${featuredProduct.mainPhoto}" 
                             alt="${featuredProduct.name}" 
                             onerror="this.src='img/product/new-product/new-product1.png'">
                    </div>
                    <h4>${formatPrice(featuredProduct.price)}</h4>
                    <a href="single-product.html?id=${featuredProduct._id}" class="main_btn">View Details</a>
                </div>
            </div>
        `;

        // Container for the smaller product cards
        const smallProductsContainer = document.createElement('div');
        smallProductsContainer.className = 'col-lg-6 mt-5 mt-lg-0';
        smallProductsContainer.innerHTML = '<div class="row">';

        // Display remaining products in smaller cards (up to 4 more products)
        const remainingProducts = products.slice(1, 5);
        let smallProductsHTML = '';
        
        if (remainingProducts.length > 0) {
            smallProductsHTML = remainingProducts.map(product => `
                <div class="col-lg-6 col-md-6">
                    <div class="single-product">
                        <div class="product-img">
                            <img class="img-fluid w-100" 
                                 src="/uploads/products/${product.vendorEmail}/${product.mainPhoto}" 
                                 alt="${product.name}"
                                 onerror="this.src='img/product/new-product/n1.jpg'">
                            <div class="p_icon">
                                <a href="single-product.html?id=${product._id}">
                                    <i class="ti-eye"></i>
                                </a>
                                <a href="#" onclick="event.preventDefault(); addToWishlist('${product._id}')">
                                    <i class="ti-heart"></i>
                                </a>
                                <a href="#" onclick="event.preventDefault(); addToCart('${product._id}')">
                                    <i class="ti-shopping-cart"></i>
                                </a>
                            </div>
                        </div>
                        <div class="product-btm">
                            <a href="single-product.html?id=${product._id}" class="d-block">
                                <h4>${product.name}</h4>
                            </a>
                            <div class="mt-3">
                                <span class="mr-4">${formatPrice(product.price)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            `).join('');
        }

        // Create the row for small products
        const rowDiv = document.createElement('div');
        rowDiv.className = 'row';
        rowDiv.innerHTML = smallProductsHTML;
        smallProductsContainer.innerHTML = '';
        smallProductsContainer.appendChild(rowDiv);

        // Add both sections to the container
        newProductsContainer.innerHTML = featuredHTML;
        newProductsContainer.appendChild(smallProductsContainer);
        
        // Add global functions for cart and wishlist
        window.addToCart = addToCart;
        window.addToWishlist = addToWishlist;
    }

    function displayFallbackProducts() {
        // Display fallback products if API fails
        const fallbackProducts = [
            {
                _id: 'fallback1',
                name: 'Modern Smart Watch',
                price: 199.99,
                mainPhoto: 'img/product/new-product/new-product1.png',
                vendorEmail: 'demo@example.com'
            },
            {
                _id: 'fallback2',
                name: 'Wireless Headphones',
                price: 89.99,
                mainPhoto: 'img/product/new-product/n1.jpg',
                vendorEmail: 'demo@example.com'
            },
            {
                _id: 'fallback3',
                name: 'Premium Sunglasses',
                price: 129.99,
                mainPhoto: 'img/product/new-product/n2.jpg',
                vendorEmail: 'demo@example.com'
            },
            {
                _id: 'fallback4',
                name: 'Fitness Tracker',
                price: 79.99,
                mainPhoto: 'img/product/new-product/n3.jpg',
                vendorEmail: 'demo@example.com'
            },
            {
                _id: 'fallback5',
                name: 'Bluetooth Speaker',
                price: 149.99,
                mainPhoto: 'img/product/new-product/n4.jpg',
                vendorEmail: 'demo@example.com'
            }
        ];
        
        displayNewProducts(fallbackProducts);
    }

    function formatPrice(price) {
        return `$${parseFloat(price).toFixed(2)}`;
    }

    // Helper functions for cart and wishlist
    async function addToCart(productId) {
        const token = localStorage.getItem('token');
        if (!token) {
            $('#loginModal').modal('show');
            return;
        }

        try {
            const response = await fetch(`/api/products/${productId}`);
            if (!response.ok) {
                throw new Error('Failed to fetch product details');
            }
            
            const product = await response.json();
            
            let cart = JSON.parse(localStorage.getItem('cart') || '[]');
            
            const existingItem = cart.find(item => item._id === product._id);
            if (existingItem) {
                existingItem.quantity += 1;
            } else {
                cart.push({
                    _id: product._id,
                    name: product.name,
                    price: product.price,
                    quantity: 1,
                    image: product.mainPhoto,
                    vendorEmail: product.vendorEmail
                });
            }
            
            localStorage.setItem('cart', JSON.stringify(cart));
            updateCartCount();
            alert('Product added to cart!');
        } catch (error) {
            console.error('Error adding to cart:', error);
            alert('Failed to add product to cart');
        }
    }

    function addToWishlist(productId) {
        const token = localStorage.getItem('token');
        if (!token) {
            $('#loginModal').modal('show');
            return;
        }
        // Wishlist functionality can be implemented here
        alert('Wishlist feature coming soon!');
    }

    function updateCartCount() {
        const cart = JSON.parse(localStorage.getItem('cart') || '[]');
        const cartCount = cart.reduce((total, item) => total + (parseInt(item.quantity) || 0), 0);
        
        const cartIcons = document.querySelectorAll('.ti-shopping-cart');
        cartIcons.forEach(icon => {
            const parent = icon.closest('a');
            if (parent) {
                // Remove existing count if any
                const existingCount = parent.querySelector('.cart-count');
                if (existingCount) existingCount.remove();
                
                // Add new count if cart is not empty
                if (cartCount > 0) {
                    const countBadge = document.createElement('span');
                    countBadge.className = 'cart-count';
                    countBadge.textContent = cartCount;
                    countBadge.style.position = 'absolute';
                    countBadge.style.top = '-10px';
                    countBadge.style.right = '-10px';
                    countBadge.style.background = '#71cd14';
                    countBadge.style.color = 'white';
                    countBadge.style.borderRadius = '50%';
                    countBadge.style.width = '20px';
                    countBadge.style.height = '20px';
                    countBadge.style.display = 'flex';
                    countBadge.style.alignItems = 'center';
                    countBadge.style.justifyContent = 'center';
                    countBadge.style.fontSize = '12px';
                    
                    parent.style.position = 'relative';
                    parent.appendChild(countBadge);
                }
            }
        });
    }

    // Initialize
    fetchNewProducts();
});