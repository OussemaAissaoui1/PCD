/**
 * Modal Handler Script
 * Handles user authentication, modal interactions, and navigation menu updates
 */
document.addEventListener('DOMContentLoaded', function() {
    console.log("Modal handler script loaded");
    // Reference UI elements
    const loginIcon = document.getElementById('loginIcon');
    const profileIcon = document.getElementById('profileIcon');
    const profilePicture = document.getElementById('profilePicture');
    const logoutMenu = document.getElementById('logoutMenu');
    const logoutButton = document.getElementById('logoutButton');
    const addProductNav = document.getElementById('addProductNav');
    const vendorOrdersNav = document.getElementById('vendorOrdersNav');
    const signinForm = document.getElementById('signinForm');
    const signupForm = document.querySelector('form[action="/api/user/signup"]');
    // Modal switchers
    document.querySelectorAll('[data-toggle="modal"][data-target="#loginModal"]').forEach(el => {
        el.addEventListener('click', function() {
            if (typeof $ !== 'undefined') {
                $('#signupModal').modal('hide');
            }
        });
    });
    
    document.querySelectorAll('[data-toggle="modal"][data-target="#signupModal"]').forEach(el => {
        el.addEventListener('click', function() {
            if (typeof $ !== 'undefined') {
                $('#loginModal').modal('hide');
            }
        });
    });
    
    // Within modals, handle links between login and signup
    const showSignupLinks = document.querySelectorAll('a[data-target="#signupModal"]');
    showSignupLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            if (typeof $ !== 'undefined') {
                $('#loginModal').modal('hide');
                $('#signupModal').modal('show');
            }
        });
    });
    
    const showLoginLinks = document.querySelectorAll('a[data-target="#loginModal"]');
    showLoginLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            if (typeof $ !== 'undefined') {
                $('#signupModal').modal('hide');
                $('#loginModal').modal('show');
            }
        });
    });
    
    // Handle login form submission
    if (signinForm) {
        signinForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            console.log("Login form submitted");
            
            const emailInput = document.getElementById('emailInput');
            const passwordInput = document.getElementById('passwordInput');
            
            if (!emailInput || !passwordInput) {
                console.error("Email or password input not found");
                return;
            }
            
            const email = emailInput.value;
            const password = passwordInput.value;
            
            if (!email || !password) {
                alert('Please enter both email and password.');
                return;
            }
            
            try {
                // Make login API request
                const response = await fetch('/api/user/signin', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ email, password })
                });
                
                const data = await response.json();
                
                if (response.ok && data.token) {
                    console.log("Login successful");
                    
                    // Store authentication data
                    localStorage.setItem('token', data.token);
                    
                    // Store additional user data if needed
                    if (data.user) {
                        const userData = {
                            name: data.user.name || '',
                            email: data.user.email || '',
                            role: data.user.role || '',
                            profilePicture: data.user.photoPath || '',
                            cryptoKey: data.user.cryptoKey || '',
                            token: data.token
                        };
                        localStorage.setItem('userData', JSON.stringify(userData));
                    }
                    
                    // Close modal if jQuery is available
                    if (typeof $ !== 'undefined') {
                        $('#loginModal').modal('hide');
                    }
                    
                    // Show success message and reload page
                    alert('Login successful!');
                    window.location.reload();
                } else {
                    alert(data.message || 'Login failed. Please check your credentials.');
                }
            } catch (error) {
                console.error("Login error:", error);
                alert('An error occurred during login. Please try again.');
            }
        });
    }
    
    // Handle signup form submission
    if (signupForm) {
        signupForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            console.log("Signup form submitted");
            
            // Create FormData object directly from the form
            const formData = new FormData(signupForm);
            
            // Basic validation
            const name = formData.get('name');
            const email = formData.get('email');
            const password = formData.get('password');
            const confirmPassword = formData.get('confirmPassword');
            
            if (!name || !email || !password || !confirmPassword) {
                alert('Please fill in all required fields.');
                return;
            }
            
            if (password !== confirmPassword) {
                alert('Passwords do not match.');
                return;
            }
            
            try {
                // Make signup API request with FormData (for file uploads)
                const response = await fetch('/api/user/signup', {
                    method: 'POST',
                    body: formData
                });
                
                const data = await response.json();
                
                if (response.ok && data.token) {
                    console.log("Signup successful");
                    
                    // Store authentication data
                    localStorage.setItem('token', data.token);
                    
                    // Store additional user data if needed
                    if (data.user) {
                        const userData = {
                            name: data.user.name || '',
                            email: data.user.email || '',
                            role: data.user.role || '',
                            profilePicture: data.user.photoPath || '',
                            cryptoKey: data.user.cryptoKey || '',
                            token: data.token
                        };
                        localStorage.setItem('userData', JSON.stringify(userData));
                    }
                    
                    // Close modal if jQuery is available
                    if (typeof $ !== 'undefined') {
                        $('#signupModal').modal('hide');
                    }
                    
                    // Show success message and reload page
                    alert('Signup successful!');
                    window.location.reload();
                } else {
                    alert(data.message || 'Signup failed. Please try again.');
                }
            } catch (error) {
                console.error("Signup error:", error);
                alert('An error occurred during signup. Please try again.');
            }
        });
    }
    
    // Check authentication and update UI
    function checkAuthAndUpdateUI() {
        const token = localStorage.getItem('token');
        const userData = JSON.parse(localStorage.getItem('userData') || '{}');
        
        if (token) {
            try {
                // Decode JWT token to check role
                const tokenParts = token.split('.');
                if (tokenParts.length === 3) {
                    const payload = JSON.parse(atob(tokenParts[1]));
                    console.log("User authenticated from token:", payload.email);
                    
                    // Update navigation based on user role
                    if (payload.role === 'vendor') {
                        if (addProductNav) addProductNav.style.display = 'block';
                        if (vendorOrdersNav) vendorOrdersNav.style.display = 'block';
                        console.log("Vendor navigation enabled");
                    } else {
                        if (addProductNav) addProductNav.style.display = 'none';
                        if (vendorOrdersNav) vendorOrdersNav.style.display = 'none';
                    }
                    
                    // Update user icon/profile picture
                    if (loginIcon && profileIcon && profilePicture) {
                        loginIcon.style.display = 'none';
                        profileIcon.style.display = 'block';
                        
                        // Set profile picture if available
                        if (userData.profilePicture) {
                            profilePicture.src = userData.profilePicture;
                        } else {
                            // Use default avatar
                            profilePicture.src = 'img/user-default.png';
                        }
                    }
                }
            } catch (error) {
                console.error("Error parsing JWT token:", error);
                // Clear invalid token
                localStorage.removeItem('token');
                localStorage.removeItem('userData');
            }
        } else {
            console.log("User not authenticated");
            
            // Hide vendor-specific navigation
            if (addProductNav) addProductNav.style.display = 'none';
            if (vendorOrdersNav) addProductNav.style.display = 'none';
            
            // Show login icon, hide profile
            if (loginIcon && profileIcon) {
                loginIcon.style.display = 'block';
                profileIcon.style.display = 'none';
            }
        }
    }
    // Handle profile icon click to show/hide logout menu
    if (profilePicture && logoutMenu) {
        profilePicture.addEventListener('click', function(e) {
            e.preventDefault();
            logoutMenu.style.display = logoutMenu.style.display === 'block' ? 'none' : 'block';
        });
        
        // Close menu when clicking elsewhere
        document.addEventListener('click', function(e) {
            if (e.target !== profilePicture && logoutMenu.style.display === 'block') {
                logoutMenu.style.display = 'none';
            }
        });
    }
    // Handle logout action
    if (logoutButton) {
        logoutButton.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Clear authentication data
            localStorage.removeItem('token');
            localStorage.removeItem('userData');
            
            // Clear the shopping cart
            localStorage.removeItem('cart');
            
            // Show success message and reload page
            alert('You have been logged out.');
            window.location.href = 'index.html';
        });
    }
    
    // Make shopping cart icon link directly to cart page
    const cartIcon = document.querySelector('.ti-shopping-cart');
    if (cartIcon) {
        const cartLink = cartIcon.closest('a');
        if (cartLink) {
            cartLink.href = 'cart.html';
            
            // Add cart item count if available
            const cart = JSON.parse(localStorage.getItem('cart') || '[]');
            if (cart.length > 0) {
                const itemCount = cart.reduce((total, item) => total + (parseInt(item.quantity) || 1), 0);
                
                // Add visual count indicator
                const countBadge = document.createElement('span');
                countBadge.textContent = itemCount;
                countBadge.style.position = 'absolute';
                countBadge.style.top = '-10px';
                countBadge.style.right = '-10px';
                countBadge.style.background = '#f8b600';
                countBadge.style.color = 'white';
                countBadge.style.borderRadius = '50%';
                countBadge.style.width = '20px';
                countBadge.style.height = '20px';
                countBadge.style.textAlign = 'center';
                countBadge.style.lineHeight = '20px';
                countBadge.style.fontSize = '12px';
                
                cartLink.style.position = 'relative';
                cartLink.appendChild(countBadge);
            }
        }
    }
    checkAuthAndUpdateUI();
});