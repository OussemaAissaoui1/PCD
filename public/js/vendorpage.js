const mainPhotoInput = document.getElementById('mainPhoto');
const mainDescInput = document.getElementById('mainDescription');
const otherPhotosInput = document.getElementById('otherPhotos');
const descriptionsInput = document.getElementById('descriptions');

const singlePriceInput = document.getElementById('singlePrice');
const mainPreview = document.getElementById('mainPreview');
const sliderPreview = document.getElementById('sliderPreview');
const verticalPreview = document.getElementById('verticalPreview');

const sliderImageBlock = document.getElementById('sliderImageBlock');
const dotsContainer = document.getElementById('dotsContainer');

let currentIndex = 0;
let images = [];

// Update main preview
mainPhotoInput.addEventListener('change', () => {
  const file = mainPhotoInput.files[0];
  if (file) {
    const url = URL.createObjectURL(file);
    mainPreview.innerHTML = `
      <img src="${url}" class="img-fluid" />
      <div class="main-preview-description">${mainDescInput.value}</div>
    `;
  }
});

mainDescInput.addEventListener('input', () => {
  const descDiv = mainPreview.querySelector('.main-preview-description');
  if (descDiv) {
    descDiv.textContent = mainDescInput.value;
  }
});

// Update preview images
function updatePreview() {
  const files = Array.from(otherPhotosInput.files).slice(0, 3);
  const descriptions = descriptionsInput.value.split('\n');

  images = files.map((file, index) => ({
    url: URL.createObjectURL(file),
    description: descriptions[index] || `Image ${index + 1}`
  }));

  currentIndex = 0;

  if (document.getElementById('sliderBtn').classList.contains('active')) {
    renderSlider();
  } else {
    renderVertical();
  }
}

// Event bindings
otherPhotosInput.addEventListener('change', updatePreview);
descriptionsInput.addEventListener('input', updatePreview);

// Render slider
function renderSlider() {
  if (!images.length) return;

  sliderImageBlock.innerHTML = '';
  dotsContainer.innerHTML = '';

  const item = images[currentIndex];
  const image = document.createElement('img');
  image.src = item.url;
  image.className = 'img-fluid fade';

  const descDiv = document.createElement('div');
  descDiv.className = 'image-description';
  descDiv.textContent = item.description;

  sliderImageBlock.appendChild(image);
  sliderImageBlock.appendChild(descDiv);

  images.forEach((_, i) => {
    const dot = document.createElement('span');
    dot.className = 'dot' + (i === currentIndex ? ' active' : '');
    dot.addEventListener('click', () => {
      currentIndex = i;
      renderSlider();
    });
    dotsContainer.appendChild(dot);
  });

  sliderPreview.style.display = 'block';
  verticalPreview.style.display = 'none';
}

// Render vertical
function renderVertical() {
  if (!images.length) return;

  verticalPreview.innerHTML = images.map(item => `
    <div class="image-block">
      <img src="${item.url}" class="img-fluid" />
      <div class="image-description">${item.description}</div>
    </div>
  `).join('');

  verticalPreview.style.display = 'block';
  sliderPreview.style.display = 'none';
}

// Navigation buttons
document.getElementById('prevBtn').addEventListener('click', () => {
  currentIndex = (currentIndex - 1 + images.length) % images.length;
  renderSlider();
});

document.getElementById('nextBtn').addEventListener('click', () => {
  currentIndex = (currentIndex + 1) % images.length;
  renderSlider();
});

// Toggle buttons
document.getElementById('sliderBtn').addEventListener('click', () => {
  if (!images.length) return alert('No images to display in the slider.');

  document.getElementById('sliderBtn').classList.add('active');
  document.getElementById('verticalBtn').classList.remove('active');

  renderSlider();
});

document.getElementById('verticalBtn').addEventListener('click', () => {
  if (!images.length) return alert('No images to display in the vertical preview.');

  document.getElementById('verticalBtn').classList.add('active');
  document.getElementById('sliderBtn').classList.remove('active');

  renderVertical();
});
const vendorForm = document.getElementById('vendorForm');

vendorForm.addEventListener('submit', async (e) => {
  e.preventDefault(); // Prevent the default form submission

  const formData = new FormData(vendorForm); // Create a FormData object
  const token = localStorage.getItem('token'); // Retrieve the token from localStorage

  if (!token) {
    alert('You must be logged in to submit the form.');
    return;
  }

  try {
    const response = await fetch('/api/products/add', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}` // Include the token in the Authorization header
      },
      body: formData // Send the form data
    });

    const result = await response.json();

    if (response.ok) {
      alert('Product added successfully!');
      vendorForm.reset(); // Reset the form
    } else {
      alert(result.message || 'Failed to add product.');
    }
  } catch (error) {
    console.error('Error submitting the form:', error);
    alert('An error occurred while submitting the form.');
  }
});

// Check if user is logged in on page load
document.addEventListener('DOMContentLoaded', function() {
  // Check if user is logged in and is a vendor
  const token = localStorage.getItem('token');
  
  if (token) {
    try {
      // Decode JWT token to get user info
      const payload = JSON.parse(atob(token.split('.')[1]));
      console.log('User role from token:', payload.role);
      
      // Show vendor-specific UI if user is a vendor
      if (payload.role === 'vendor') {
        const addProductNav = document.getElementById('addProductNav');
        if (addProductNav) {
          addProductNav.style.display = 'block';
        }
      }
    } catch (error) {
      console.error('Error parsing token:', error);
    }
  }
  
  // Product form submission handler
  const productForm = document.getElementById('productForm');
  if (productForm) {
    console.log('Product form found, attaching submit handler');
    
    productForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      console.log('Form submission started');
      
      // Get token from local storage
      const token = localStorage.getItem('token');
      if (!token) {
        alert('You must be logged in as a vendor to add products');
        return;
      }
      
      // Create FormData object from form
      const formData = new FormData(productForm);
      
      // Log form data for debugging
      console.log('Form data being sent:');
      for (let pair of formData.entries()) {
        console.log(pair[0] + ': ' + (pair[1] instanceof File ? pair[1].name : pair[1]));
      }
      
      try {
        // Send form data to backend
        console.log('Sending request to /api/products/add');
        const response = await fetch('/api/products/add', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData
        });
        
        console.log('Response status:', response.status);
        
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const data = await response.json();
          console.log('Response data:', data);
          
          if (response.ok) {
            alert('Product added successfully!');
            productForm.reset();
          } else {
            alert(`Error: ${data.message || 'Could not add product'}`);
          }
        } else {
          const text = await response.text();
          console.error('Non-JSON response:', text);
          alert('Server returned an invalid response format');
        }
      } catch (error) {
        console.error('Error sending product data:', error);
        alert('An error occurred while submitting the form: ' + error.message);
      }
    });
    console.log('Submit handler attached to product form');
  } else {
    console.log('Product form not found on this page');
  }
});