document.addEventListener('DOMContentLoaded', function() {
  // Fetch all products from the server ONLY if product-container exists
  if (document.getElementById('product-container')) {
    fetchProducts();
  } else {
    console.log("Product container not found on this page. Skipping product fetch.");
  }

  // Set up event listeners for filters (might also need checks if filters are page-specific)
  setupFilters();
});

// Function to fetch products from the server
function fetchProducts() {
  fetch('/api/products/all')
    .then(response => {
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      return response.json();
    })
    .then(data => {
      // Process the products data
      displayProducts(data.products);
      populateVendorList(data.products);
    })
    .catch(error => {
      console.error('Error fetching products:', error);
      // Add null check for container in error handler
      const container = document.getElementById('product-container');
      if (container) {
        container.innerHTML = `
          <div class="col-12 text-center py-5">
            <div class="alert alert-danger" role="alert">
              Error loading products. Please try again later.
            </div>
          </div>
        `;
      } else {
        console.error("Cannot display fetch error message: product-container not found.");
      }
    });
}

// Function to display products on the page
function displayProducts(products) {
  const container = document.getElementById('product-container');
  // Add null check at the beginning
  if (!container) {
    console.error("Cannot display products: element with id 'product-container' not found.");
    return; 
  }
  
  // Remove loading indicator if exists
  const loadingIndicator = document.getElementById('loading-indicator');
  if (loadingIndicator) {
    loadingIndicator.remove();
  }
  
  if (!products || products.length === 0) {
    container.innerHTML = `
      <div class="col-12 text-center py-5">
        <p>No products found.</p>
      </div>
    `;
    return;
  }
  
  console.log('Products to display:', products.length);
  // Clear the container before adding new products
  container.innerHTML = '';
  
  // Create product cards
  products.forEach((product, index) => {
    // Format price properly - ensure it's a valid number
    let price = 0;
    try {
      price = parseFloat(product.price);
      if (isNaN(price)) price = 0;
    } catch(e) {
      console.error('Error parsing price for product:', product.name, e);
      price = 0;
    }
    
    // Ensure we have a valid image path
    let imagePath = '';
    if (product.mainPhoto) {
      // Fix the path construction to avoid duplicating or using absolute paths
      // Check if mainPhoto is already a full path or just a filename
      if (product.mainPhoto.includes('C:') || product.mainPhoto.includes('/uploads/products/')) {
        // Extract just the filename from the full path
        const parts = product.mainPhoto.split('/');
        const filename = parts[parts.length - 1];
        imagePath = `uploads/products/${product.vendorEmail}/${filename}`;
      } else if (product.mainPhoto.startsWith('/')) {
        // Path already starts with /, use as is but remove the leading slash for relative path
        imagePath = product.mainPhoto.substring(1);
      } else {
        // Simple path without duplication
        imagePath = `uploads/products/${product.vendorEmail}/${product.mainPhoto}`;
      }
      
      // Log for debugging
      console.log(`Product ${product.name} main photo: ${imagePath}`);
    } else {
      imagePath = 'img/product/feature-product/f-p-1.jpg'; // Default fallback
      console.log(`Using default image for ${product.name}`);
    }
    
    const productCard = document.createElement('div');
    productCard.className = 'col-lg-4 col-md-6';
    productCard.setAttribute('data-vendor', product.vendorEmail);
    
    // Create product card with fixed image path
    productCard.innerHTML = `
      <div class="single-product" data-product-id="${product._id}">
        <div class="product-img">
          <img class="card-img" src="${imagePath}" alt="${product.name}" 
               onerror="this.onerror=null; this.src='img/product/feature-product/f-p-1.jpg'; console.log('Image failed to load: ${imagePath}');" />
          <div class="p_icon">
            <a href="single-product.html?id=${product._id}">
              <i class="ti-eye"></i>
            </a>
            <a href="#" class="add-to-wishlist" data-id="${product._id}">
              <i class="ti-heart"></i>
            </a>
            <a href="#" class="add-to-cart" data-id="${product._id}" data-name="${product.name}" data-price="${price.toFixed(2)}" data-image="${imagePath}">
              <i class="ti-shopping-cart"></i>
            </a>
          </div>
        </div>
        <div class="product-btm">
          <a href="single-product.html?id=${product._id}" class="d-block">
            <h4>${product.name}</h4>
          </a>
          <div class="mt-3">
            <span class="mr-4">$${price.toFixed(2)}</span>
          </div>
        </div>
      </div>
    `;
    
    container.appendChild(productCard);
  });
  
  // Initialize product interaction events
  initProductEvents();
}

// Function to populate vendor list for filtering
function populateVendorList(products) {
  const vendorList = document.getElementById('vendor-list');
  if (!vendorList) return;
  
  const vendors = new Set();
  
  // Collect unique vendor emails
  products.forEach(product => {
    vendors.add(product.vendorEmail);
  });
  
  // Add vendor filter options (skip if already populated)
  if (vendorList.querySelectorAll('li').length <= 1) {
    vendors.forEach(vendor => {
      const vendorItem = document.createElement('li');
      const displayName = vendor.split('@')[0]; // Show only the part before @ for readability
      vendorItem.innerHTML = `
        <a href="#" class="vendor-filter" data-vendor="${vendor}">${displayName}'s Products</a>
      `;
      vendorList.appendChild(vendorItem);
    });
  }
  
  // Add event listeners to vendor filters
  document.querySelectorAll('.vendor-filter').forEach(filter => {
    filter.addEventListener('click', function(e) {
      e.preventDefault();
      
      // Remove active class from all filters
      document.querySelectorAll('.vendor-filter').forEach(f => {
        f.classList.remove('active');
      });
      
      // Add active class to clicked filter
      this.classList.add('active');
      
      const selectedVendor = this.getAttribute('data-vendor');
      filterProductsByVendor(selectedVendor);
    });
  });
}

// Function to filter products by vendor
function filterProductsByVendor(vendor) {
  const allProducts = document.querySelectorAll('[data-vendor]');
  
  allProducts.forEach(product => {
    if (vendor === 'all' || product.getAttribute('data-vendor') === vendor) {
      product.style.display = '';
    } else {
      product.style.display = 'none';
    }
  });
}

// Function to set up sorting and filtering
function setupFilters() {
  // Sorting dropdown change event
  const sortingSelect = document.querySelector('.sorting');
  if (sortingSelect) {
    sortingSelect.addEventListener('change', function() {
      const sortBy = this.value;
      sortProducts(sortBy);
    });
  }
}

// Function to sort products
function sortProducts(sortBy) {
  const container = document.getElementById('product-container');
  const products = Array.from(container.children);
  
  products.sort((a, b) => {
    switch (sortBy) {
      case '2': // Price: Low to High
        return getPriceFromElement(a) - getPriceFromElement(b);
      case '3': // Price: High to Low
        return getPriceFromElement(b) - getPriceFromElement(a);
      case '4': // Newest First
        // Default is already newest first from the API
        return 0;
      default: // Default sorting
        return 0;
    }
  });
  
  // Re-append sorted elements
  products.forEach(product => {
    container.appendChild(product);
  });
}

// Helper function to get price from product element
function getPriceFromElement(element) {
  const priceElement = element.querySelector('.mt-3 span');
  if (!priceElement) return 0;
  
  const priceText = priceElement.innerText.replace('$', '');
  return parseFloat(priceText);
}

// Function to initialize product interaction events
function initProductEvents() {
  // Add to cart event
  document.querySelectorAll('.add-to-cart').forEach(button => {
    button.addEventListener('click', function(e) {
      e.preventDefault();
      // Retrieve data from the clicked button's attributes
      const productId = this.getAttribute('data-id');
      const productName = this.getAttribute('data-name'); // Make sure this is correct
      const productPrice = this.getAttribute('data-price'); // Make sure this is correct
      const productImage = this.getAttribute('data-image');
      
      // Add detailed logging
      console.log('Add to Cart button clicked.');
      console.log('Retrieved Data:', { 
          productId: productId, 
          productName: productName, 
          productPrice: productPrice, 
          productImage: productImage 
      });

      // Check if data is valid before calling addToCart
      if (!productId || !productName || !productPrice || !productImage) {
          console.error('Missing product data attributes on the button.');
          alert('Could not add product to cart. Data missing.');
          return;
      }
      
      addToCart(productId, productName, productPrice, productImage);
    });
  });
  
  // Add to wishlist event
  document.querySelectorAll('.add-to-wishlist').forEach(button => {
    button.addEventListener('click', function(e) {
      e.preventDefault();
      const productId = this.getAttribute('data-id');
      addToWishlist(productId);
    });
  });
}

// Function to add product to cart
function addToCart(productId, productName, productPrice, productImage) {
  // Ensure the price is a valid number
  const price = parseFloat(productPrice);
  
  if (isNaN(price)) {
    console.error('Invalid product price:', productPrice);
    alert('Error adding product to cart: Invalid price');
    return;
  }
  
  // Get existing cart from localStorage or initialize empty array
  let cart = [];
  try {
    cart = JSON.parse(localStorage.getItem('cart') || '[]');
    if (!Array.isArray(cart)) cart = []; // Ensure cart is an array
  } catch(e) {
    console.error("Error parsing cart from localStorage:", e);
    cart = []; // Reset cart if parsing fails
  }
  
  // Check if product already in cart
  const existingProduct = cart.find(item => item.id === productId);
  
  if (existingProduct) {
    existingProduct.quantity = (parseInt(existingProduct.quantity) || 0) + 1;
    existingProduct.totalPrice = (existingProduct.quantity * price).toFixed(2);
    console.log(`Increased quantity for ${productName} to ${existingProduct.quantity}`);
  } else {
    // Create new cart item with all required details
    cart.push({
      id: productId,
      name: productName,
      price: price.toFixed(2),
      image: productImage,
      quantity: 1,
      totalPrice: price.toFixed(2),
      addedAt: new Date().toISOString()
    });
    console.log(`Added new product ${productName} to cart with price $${price.toFixed(2)} and image ${productImage}`);
  }
  
  // Save updated cart back to localStorage
  localStorage.setItem('cart', JSON.stringify(cart));
  
  // Log the cart contents for debugging
  console.log('Cart contents after adding item:', JSON.parse(localStorage.getItem('cart')));
  
  // Show success message
  showAddToCartMessage(productName);
}

// Function to show add to cart message
function showAddToCartMessage(productName) {
  const message = document.createElement('div');
  message.classList.add('cart-message');
  message.innerHTML = `<div class="alert alert-success alert-dismissible fade show" role="alert">
    <strong>${productName}</strong> has been added to your cart!
    <button type="button" class="close" data-dismiss="alert" aria-label="Close">
      <span aria-hidden="true">&times;</span>
    </button>
    <div class="mt-2">
      <a href="cart.html" class="btn btn-outline-primary btn-sm">View Cart</a>
    </div>
  </div>`;
  
  document.body.appendChild(message);
  
  // Style the message
  Object.assign(message.style, {
    position: 'fixed',
    top: '20px',
    right: '20px',
    zIndex: 1050,
    maxWidth: '300px'
  });
  
  // Remove after 3 seconds
  setTimeout(() => {
    message.remove();
  }, 3000);
}
// Function to add product to wishlist
function addToWishlist(productId) {
  // Get existing wishlist from localStorage or initialize empty array
  const wishlist = JSON.parse(localStorage.getItem('wishlist') || '[]'); 
  // Check if product already in wishlist
  if (!wishlist.includes(productId)) {
    wishlist.push(productId);
    // Save updated wishlist back to localStorage
    localStorage.setItem('wishlist', JSON.stringify(wishlist));
    // Show success message
    alert('Product added to wishlist!');
  } else {
    alert('This product is already in your wishlist!');
  }
}
