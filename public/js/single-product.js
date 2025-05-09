document.addEventListener('DOMContentLoaded', function() {
    // Get product ID from URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('id');

    if (!productId) {
        console.error('No product ID provided');
        return;
    }
    // Load product details
    loadProductDetails(productId);

    // Initialize the carousel
    $('#carouselExampleIndicators').carousel({
        interval: false // Disable auto-sliding
    });

    // Function to update carousel content
    function updateCarousel(images) {
        const carouselInner = document.getElementById('carousel-inner');
        const indicators = document.getElementById('carousel-indicators');
        
        // Clear existing content
        carouselInner.innerHTML = '';
        indicators.innerHTML = '';

        // Add images to carousel
        images.forEach((image, index) => {
            // Create carousel item
            const item = document.createElement('div');
            item.className = `carousel-item ${index === 0 ? 'active' : ''}`;
            item.innerHTML = `<img src="${image}" class="d-block w-100" alt="Product image ${index + 1}">`;
            carouselInner.appendChild(item);

            // Create indicator
            const indicator = document.createElement('li');
            indicator.setAttribute('data-target', '#carouselExampleIndicators');
            indicator.setAttribute('data-slide-to', index.toString());
            if (index === 0) indicator.classList.add('active');
            
            // Create thumbnail
            const thumb = document.createElement('img');
            thumb.src = image;
            thumb.alt = `Product thumbnail ${index + 1}`;
            indicator.appendChild(thumb);
            
            indicators.appendChild(indicator);
        });
    }

    // Example usage - replace with your actual product images
    const productImages = [
        'img/product/feature-product/f-p-1.jpg',
        'img/product/feature-product/f-p-2.jpg',
        'img/product/feature-product/f-p-3.jpg'
    ];

    updateCarousel(productImages);
});

async function loadProductDetails(productId) {
    try {
        const response = await fetch(`/api/products/${productId}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const product = await response.json();
        
        if (!product) {
            console.error('Product not found');
            return;
        }

        // Update product information
        document.getElementById('product-name').textContent = product.name;
        document.getElementById('product-price').textContent = `$${product.price.toFixed(2)}`;
        document.getElementById('product-description').textContent = product.mainDescription;
        
        // Set availability (always "In Stock" for now since we don't track inventory)
        document.getElementById('product-availability').textContent = 'In Stock';
        
        // Use vendorEmail as category for now
        document.getElementById('product-category').textContent = product.vendorEmail;

        // Load product images
        const mainImageName = product.mainPhoto; // This should be the mainPhoto filename
        const otherImageNames = product.otherPhotos || []; // These should be the otherPhotos filenames
        
        // Combine all images, but ensure main photo is first
        const allImages = [mainImageName, ...otherImageNames].filter(Boolean);

        // Update carousel indicators
        const indicatorsContainer = document.getElementById('carousel-indicators');
        const carouselInner = document.getElementById('carousel-inner');
        
        indicatorsContainer.innerHTML = '';
        carouselInner.innerHTML = '';

        allImages.forEach((image, index) => {
            // Add indicator
            const indicator = document.createElement('li');
            indicator.setAttribute('data-target', '#carouselExampleIndicators');
            indicator.setAttribute('data-slide-to', index);
            if (index === 0) indicator.classList.add('active');
            indicatorsContainer.appendChild(indicator);

            // Add carousel item
            const carouselItem = document.createElement('div');
            carouselItem.className = `carousel-item ${index === 0 ? 'active' : ''}`;
            
            const img = document.createElement('img');
            img.className = 'd-block w-100';
            
            // Construct the full image path including vendor's email folder
            img.src = `/uploads/products/${product.vendorEmail}/${image}`;
            img.alt = `${product.name} - Image ${index + 1}`;
            
            // Fallback image if loading fails
            img.onerror = function() {
                this.src = 'img/product/feature-product/f-p-1.jpg';
            };
            
            carouselItem.appendChild(img);
            carouselInner.appendChild(carouselItem);
        });

        // Initialize carousel
        $('#carouselExampleIndicators').carousel({
            interval: 3000
        });

        // Set up Add to Cart button handler
        const addToCartBtn = document.querySelector('.card_area .main_btn');
        if (addToCartBtn) {
            addToCartBtn.onclick = function(e) {
                e.preventDefault();
                const quantity = parseInt(document.getElementById('sst').value) || 1;
                addToCart(product, quantity);
            };
        }

    } catch (error) {
        console.error('Error loading product details:', error);
        // Show error message to user
        document.getElementById('product-name').textContent = 'Error loading product';
        document.getElementById('product-description').textContent = 'Unable to load product details. Please try again later.';
    }
}

function addToCart(product, quantity) {
    try {
        // Get existing cart
        let cart = JSON.parse(localStorage.getItem('cart') || '[]');
        
        // Check if product already exists in cart
        const existingItem = cart.find(item => item._id === product._id);
        
        if (existingItem) {
            existingItem.quantity += quantity;
        } else {
            // Add new item
            cart.push({
                _id: product._id,
                name: product.name,
                price: product.price,
                quantity: quantity,
                image: product.mainPhoto,
                vendorEmail: product.vendorEmail
            });
        }
        
        // Save updated cart
        localStorage.setItem('cart', JSON.stringify(cart));
        
        // Show success message
        alert('Product added to cart successfully!');
        
        // Update cart count in header if it exists
        updateCartCount();
    } catch (error) {
        console.error('Error adding to cart:', error);
        alert('Failed to add product to cart. Please try again.');
    }
}

function updateCartCount() {
    try {
        const cart = JSON.parse(localStorage.getItem('cart') || '[]');
        const cartCount = cart.reduce((total, item) => total + (parseInt(item.quantity) || 0), 0);
        
        // Find cart icon in header
        const cartLinks = document.querySelectorAll('a.icons i.ti-shopping-cart');
        cartLinks.forEach(cartLink => {
            // Remove existing badge if any
            const existingBadge = cartLink.parentElement.querySelector('.cart-count');
            if (existingBadge) {
                existingBadge.remove();
            }
            
            // Add new badge if cart is not empty
            if (cartCount > 0) {
                const badge = document.createElement('span');
                badge.className = 'cart-count';
                badge.textContent = cartCount;
                badge.style.position = 'absolute';
                badge.style.top = '-10px';
                badge.style.right = '-10px';
                badge.style.background = '#71cd14';
                badge.style.color = 'white';
                badge.style.borderRadius = '50%';
                badge.style.width = '20px';
                badge.style.height = '20px';
                badge.style.display = 'flex';
                badge.style.alignItems = 'center';
                badge.style.justifyContent = 'center';
                badge.style.fontSize = '12px';
                
                cartLink.parentElement.style.position = 'relative';
                cartLink.parentElement.appendChild(badge);
            }
        });
    } catch (error) {
        console.error('Error updating cart count:', error);
    }
}