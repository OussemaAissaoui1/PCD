document.addEventListener('DOMContentLoaded', function() {
    console.log('Checkout page loaded');
    
    // Load cart items from localStorage
    loadCartItems();
    
    // Update order total when shipping option changes
    document.querySelectorAll('input[name="selector"]').forEach(radio => {
        if (radio) {
            radio.addEventListener('change', updateOrderTotal);
        }
    });
    
    // Handle MetaMask payment button
    const payWithMetamaskBtn = document.getElementById('pay-with-metamask');
    if (payWithMetamaskBtn) {
        payWithMetamaskBtn.addEventListener('click', handleMetaMaskPayment);
    }
    
    // Initialize Ganache toggle if it exists
    const ganacheToggle = document.getElementById('use-ganache');
    if (ganacheToggle) {
        ganacheToggle.addEventListener('change', function() {
            // Update payment button text based on selection
            if (payWithMetamaskBtn) {
                payWithMetamaskBtn.textContent = ganacheToggle.checked ? 
                    'Pay with Ganache' : 'Pay with MetaMask';
            }
        });
        
        // Create Ganache toggle if it doesn't exist
        if (!ganacheToggle && payWithMetamaskBtn) {
            const paymentBox = payWithMetamaskBtn.parentElement;
            if (paymentBox) {
                const toggleDiv = document.createElement('div');
                toggleDiv.className = 'custom-control custom-switch mt-3';
                toggleDiv.innerHTML = `
                    <input type="checkbox" class="custom-control-input" id="use-ganache">
                    <label class="custom-control-label" for="use-ganache">
                        Use Ganache (Local Blockchain)
                    </label>
                `;
                paymentBox.appendChild(toggleDiv);
                
                // Add event listener to new toggle
                document.getElementById('use-ganache').addEventListener('change', function() {
                    payWithMetamaskBtn.textContent = this.checked ? 
                        'Pay with Ganache' : 'Pay with MetaMask';
                });
            }
        }
    }
    
    // Handle form submission (for traditional checkout)
    const checkoutForm = document.querySelector('.billing_details form');
    if (checkoutForm) {
        checkoutForm.addEventListener('submit', processCheckout);
    }
    
    // Add payment status display under the payment button
    const orderBox = document.querySelector('.order_box');
    if (orderBox) {
        const statusDiv = document.createElement('div');
        statusDiv.id = 'payment-status';
        statusDiv.className = 'mt-4 text-center';
        orderBox.appendChild(statusDiv);
    }
});

// Function to load cart items into the checkout page
function loadCartItems() {
    console.log('Loading cart items into checkout page');

    // Get cart from localStorage
    let cart = [];
    try {
        cart = JSON.parse(localStorage.getItem('cart') || '[]');
        console.log('Cart data loaded:', cart);
    } catch (e) {
        console.error('Error loading cart data:', e);
        cart = [];
    }
    // Get checkout order list and summary elements
    const orderList = document.querySelector('.order_box .list');
    const orderSummary = document.querySelector('.order_box .list_2');
    
    if (!orderList || !orderSummary) {
        console.error('Order list or summary elements not found');
        return;
    }
    
    // Clear existing items, but keep the header
    orderList.innerHTML = `
        <li>
            <a href="#">Product
                <span>Total</span>
            </a>
        </li>
    `;
    
    if (cart.length === 0) {
        // Display empty cart message with styled empty state
        orderList.innerHTML += `
            <li>
                <a href="#" style="display: block; text-align: center; padding: 20px 0;">
                    <div class="empty-cart">
                        <i class="ti-shopping-cart" style="font-size: 40px; color: #ddd; display: block; margin-bottom: 15px;"></i>
                        <p>Your cart is empty</p>
                        <span class="middle"></span>
                        <span class="last">$0.00</span>
                    </div>
                </a>
            </li>
        `;
        
        // Update summary
        orderSummary.innerHTML = `
            <li>
                <a href="#">Subtotal
                    <span>$0.00</span>
                </a>
            </li>
            <li>
                <a href="#">Shipping
                    <span>$0.00</span>
                </a>
            </li>
            <li>
                <a href="#">Total
                    <span>$0.00</span>
                </a>
            </li>
        `;
        
        // Style the disabled button to match main_btn style but disabled
        const proceedButton = document.querySelector('.order_box .main_btn');
        if (proceedButton) {
            proceedButton.classList.add('disabled');
            proceedButton.setAttribute('disabled', 'disabled');
            proceedButton.textContent = 'Cart is Empty';
            proceedButton.style.backgroundColor = '#ccc';
            proceedButton.style.color = '#666';
            proceedButton.style.cursor = 'not-allowed';
            proceedButton.style.border = '1px solid #ccc';
            proceedButton.style.pointerEvents = 'none';
        }
        
        return;
    }
    
    // Calculate totals
    let subtotal = 0;
    
    // Add each item to the list with improved styling
    cart.forEach(item => {
        const price = parseFloat(item.price) || 0;
        const quantity = parseInt(item.quantity) || 1;
        const itemTotal = price * quantity;
        subtotal += itemTotal;
        
        const listItem = document.createElement('li');
        listItem.innerHTML = `
            <a href="#" style="display: flex; align-items: center; padding: 10px 0; border-bottom: 1px solid #eee;">
                <div style="flex-grow: 1; display: flex; align-items: center;">
                    <img src="${item.image}" alt="${item.name}" style="width: 40px; height: 40px; object-fit: cover; border-radius: 4px; margin-right: 10px;"
                         onerror="this.onerror=null; this.src='img/product/feature-product/f-p-1.jpg';">
                    <span style="font-weight: 500; color: #333;">${item.name}</span>
                </div>
                <span class="middle" style="margin: 0 15px; color: #777;">x ${quantity}</span>
                <span class="last" style="font-weight: 600; color: #384aeb;">$${itemTotal.toFixed(2)}</span>
            </a>
        `;
        
        orderList.appendChild(listItem);
        console.log(`Added item to checkout: ${item.name}, qty: ${quantity}, total: $${itemTotal.toFixed(2)}`);
    });
    
    // Update summary with styled elements
    const shipping = subtotal > 0 ? 10.00 : 0; // Default shipping cost
    const total = subtotal + shipping;
    
    orderSummary.innerHTML = `
        <li>
            <a href="#">
                <span style="font-weight: 500;">Subtotal</span>
                <span style="font-weight: 600;">$${subtotal.toFixed(2)}</span>
            </a>
        </li>
        <li>
            <a href="#">
                <span style="font-weight: 500;">Shipping</span>
                <span style="color: #777;">Flat rate: $${shipping.toFixed(2)}</span>
            </a>
        </li>
        <li>
            <a href="#">
                <span style="font-weight: 700; font-size: 18px;">Total</span>
                <span style="font-weight: 700; font-size: 18px; color: #384aeb;">$${total.toFixed(2)}</span>
            </a>
        </li>
    `;
    
    // Style the proceed button to match the main_btn style exactly
    const proceedButton = document.querySelector('.order_box .main_btn');
    if (proceedButton) {
        proceedButton.classList.remove('disabled');
        proceedButton.removeAttribute('disabled');
        proceedButton.textContent = 'Proceed to Payment';
        
        // Apply main_btn styles explicitly
        proceedButton.style.background = '#71cd14';
        proceedButton.style.padding = '0px 32px';
        proceedButton.style.letterSpacing = '0.25px';
        proceedButton.style.color = '#fff';
        proceedButton.style.fontFamily = '"Roboto", sans-serif';
        proceedButton.style.fontSize = '12px';
        proceedButton.style.fontWeight = '500';
        proceedButton.style.lineHeight = '44px';
        proceedButton.style.border = '1px solid #71cd14';
        proceedButton.style.textTransform = 'uppercase';
        proceedButton.style.borderRadius = '5px';
    }
    
    console.log('Checkout order summary updated');
}

// Function to update order total when shipping option changes
function updateOrderTotal() {
    // Get the current subtotal from the summary
    const subtotalElement = document.querySelector('.list_2 li:first-child span');
    if (!subtotalElement) return;
    
    const subtotal = parseFloat(subtotalElement.textContent.replace('$', '')) || 0;
    
    // Check which shipping option is selected
    const expressShipping = document.getElementById('f-option6');
    let shipping = 10.00; // Standard shipping
    
    if (expressShipping && expressShipping.checked) {
        shipping = 15.00; // Express shipping
    }
    
    const total = subtotal + shipping;
    
    // Update the shipping and total displays
    const shippingElement = document.querySelector('.list_2 li:nth-child(2) span');
    const totalElement = document.querySelector('.list_2 li:last-child span');
    
    if (shippingElement) {
        shippingElement.textContent = `Flat rate: $${shipping.toFixed(2)}`;
    }
    
    if (totalElement) {
        totalElement.textContent = `$${total.toFixed(2)}`;
    }
    
    console.log(`Order total updated - Subtotal: $${subtotal.toFixed(2)}, Shipping: $${shipping.toFixed(2)}, Total: $${total.toFixed(2)}`);
}

// Function to handle MetaMask/Ganache payment
async function handleMetaMaskPayment(e) {
    e.preventDefault();

    const paymentStatus = document.getElementById('payment-status');
    if (paymentStatus) {
        paymentStatus.innerHTML = `
            <div class="alert alert-info">
                <i class="fa fa-spinner fa-spin"></i> Connecting to wallet and processing payment...
            </div>
        `;
    }

    try {
        // Check if using Ganache or MetaMask
        const isUsingGanache = document.getElementById('use-ganache') &&
                               document.getElementById('use-ganache').checked;

        console.log(`Starting payment process using ${isUsingGanache ? 'Ganache' : 'MetaMask'}...`);

        // Initialize Web3 and connect (ensure initWeb3 handles Ganache/MetaMask)
        const connected = await initWeb3(); // Assumes this sets global web3 and currentAccount
        if (!connected || typeof web3 === 'undefined' || !currentAccount) {
             throw new Error(`Failed to connect to your Ethereum wallet (${isUsingGanache ? 'Ganache' : 'MetaMask'}). Please ensure it's running, unlocked, and connected to the correct network.`);
        }

        console.log(`Connected with account: ${currentAccount}`);

        // Get cart data
        const cart = JSON.parse(localStorage.getItem('cart') || '[]');
        if (!cart.length) {
            alert("Your cart is empty. Please add some items before checkout.");
            if (paymentStatus) paymentStatus.innerHTML = ''; // Clear status
            window.location.href = "category.html"; // Redirect if cart is empty
            return;
        }

        // --- Fetch Vendor Keys from Database --- 
        if (paymentStatus) {
            paymentStatus.innerHTML = `
                <div class="alert alert-info">
                    <i class="fa fa-spinner fa-spin"></i> Verifying vendor information...
                </div>
            `;
        }
        
        // 1. Extract unique vendor emails from the cart
        const vendorEmails = [...new Set(cart.map(item => item.vendorEmail).filter(email => email))];
        
        if (vendorEmails.length === 0) {
            throw new Error("Could not proceed: No vendor emails found in cart items.");
        }

        // 2. Call the API to get cryptoKeys for these emails
        let vendorKeyMap = {};
        try {
            console.log("Fetching vendor keys for emails:", vendorEmails);
            const response = await fetch('/api/user/vendor-keys', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    // Include Authorization header if your API requires it
                    // 'Authorization': `Bearer ${localStorage.getItem('token')}` 
                },
                body: JSON.stringify({ emails: vendorEmails })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`Failed to fetch vendor keys: ${errorData.error || response.statusText}`);
            }
            
            vendorKeyMap = await response.json(); // Expected format: { "email": "cryptoKey", ... }
            console.log("Received vendor keys:", vendorKeyMap);

        } catch (fetchError) {
            console.error("Error fetching vendor keys:", fetchError);
            throw new Error(`Could not verify vendor payment addresses. ${fetchError.message}`);
        }

        // --- Group items by vendor public key (fetched from DB) ---
        const paymentsByVendor = {};
        let totalUSD = 0;
        const exchangeRate = 0.0005; // Example rate - REPLACE WITH ORACLE
        let itemsWithoutValidVendorKey = [];

        for (const item of cart) {
            const vendorEmail = item.vendorEmail;
            const vendorKey = vendorEmail ? vendorKeyMap[vendorEmail] : null; // Get key from fetched map

            if (!vendorKey) {
                console.warn(`Item "${item.name}" (${item.id}) has missing or invalid vendor key for email "${vendorEmail || 'N/A'}". Skipping this item.`);
                itemsWithoutValidVendorKey.push(item.name);
                continue; // Skip this item if vendor key is missing or invalid
            }

            // Validate the fetched vendor's Ethereum address format
            if (!web3.utils.isAddress(vendorKey)) {
                 console.warn(`Invalid Ethereum address format ("${vendorKey}") fetched for vendor "${vendorEmail}" of item "${item.name}". Skipping.`);
                 itemsWithoutValidVendorKey.push(item.name);
                 continue;
            }
            // Ensure vendor address is not the zero address
            if (vendorKey === '0x0000000000000000000000000000000000000000') {
                console.warn(`Invalid vendor address (zero address) fetched for vendor "${vendorEmail}" of item "${item.name}". Skipping.`);
                itemsWithoutValidVendorKey.push(item.name);
                continue;
            }

            const price = parseFloat(item.price) || 0;
            const quantity = parseInt(item.quantity) || 1;
            const itemTotalUSD = price * quantity;
            const itemTotalETH = itemTotalUSD * exchangeRate;
            totalUSD += itemTotalUSD;

            // Use the fetched vendorKey (public address) as the key for grouping
            if (!paymentsByVendor[vendorKey]) {
                paymentsByVendor[vendorKey] = {
                    totalETH: 0,
                    items: [],
                    vendorEmail: vendorEmail // Keep email for reference
                };
            }
            paymentsByVendor[vendorKey].totalETH += itemTotalETH;
            paymentsByVendor[vendorKey].items.push({ id: item.id, name: item.name, quantity: quantity, price: price });
        }
        
        // Check if any items were skipped
        if (itemsWithoutValidVendorKey.length > 0) {
             // Decide how to handle this: alert the user, prevent checkout, etc.
             alert(`Warning: Some items could not be processed because vendor payment information is missing or invalid: ${itemsWithoutValidVendorKey.join(', ')}. These items will be skipped.`);
        }

        if (Object.keys(paymentsByVendor).length === 0) {
             throw new Error("Could not process payment. No valid vendor payment addresses found for items in the cart after verification.");
        }

        console.log("Grouped payments to process (using DB keys):", paymentsByVendor);
        const totalETHToPay = Object.values(paymentsByVendor).reduce((sum, p) => sum + p.totalETH, 0);
        console.log(`Total calculated ETH to be sent: ${totalETHToPay.toFixed(8)}`);

        // --- Process payment for each vendor ---
        const transactionResults = [];
        let allSuccessful = true;

        if (paymentStatus) {
            paymentStatus.innerHTML = `
                <div class="alert alert-info">
                    <i class="fa fa-spinner fa-spin"></i> Processing ${Object.keys(paymentsByVendor).length} payment(s)...
                    Please confirm each transaction in your wallet (${isUsingGanache ? 'Ganache' : 'MetaMask'}).
                </div>
            `;
        }


        for (const vendorKey in paymentsByVendor) {
            const paymentInfo = paymentsByVendor[vendorKey];
            const amountETH = paymentInfo.totalETH;
            // Ensure amount is not zero or negative before sending
            if (amountETH <= 0) {
                console.warn(`Skipping payment to ${vendorKey} due to zero or negative amount.`);
                continue;
            }

            const amountWei = web3.utils.toWei(amountETH.toString(), 'ether');

            console.log(`Attempting to send ${amountETH.toFixed(8)} ETH (${amountWei} wei) from ${currentAccount} to vendor ${vendorKey}`);

            try {
                // Use web3.eth.sendTransaction for direct ETH transfer
                const txReceipt = await web3.eth.sendTransaction({
                    from: currentAccount,
                    to: vendorKey,
                    value: amountWei
                    // Gas limit and price can be estimated by MetaMask/wallet,
                    // but you might set them explicitly for more control, especially with Ganache.
                    // gas: '21000', // Base gas for ETH transfer
                    // gasPrice: await web3.eth.getGasPrice()
                });

                console.log(`Successfully sent ${amountETH.toFixed(8)} ETH to ${vendorKey}. TxHash: ${txReceipt.transactionHash}`);
                transactionResults.push({
                    vendorKey: vendorKey,
                    vendorEmail: paymentInfo.vendorEmail,
                    amountETH: amountETH,
                    txHash: txReceipt.transactionHash,
                    blockHash: txReceipt.blockHash,
                    success: true,
                    items: paymentInfo.items // Include items paid for in this transaction
                 });

            } catch (txError) {
                console.error(`Error sending payment to ${vendorKey}: `, txError);
                allSuccessful = false;
                transactionResults.push({
                    vendorKey: vendorKey,
                    vendorEmail: paymentInfo.vendorEmail,
                    amountETH: amountETH,
                    error: txError.message || 'Transaction failed or was rejected.',
                    success: false,
                    items: paymentInfo.items
                });
                 // Stop processing further payments if one fails
                 throw new Error(`Payment to vendor (${vendorKey}) failed: ${txError.message || 'Transaction rejected'}. Aborting checkout.`);
            }
        }

        // --- Finalize Checkout ---
        if (allSuccessful) {
            console.log("All payments successful!");

            // Generate an order ID and store order details
            const orderId = 'ORD-' + Date.now();
            
            // --- Get Customer Email Reliably ---
            let userEmail = 'guest@example.com'; // Default for guests
            const userDataString = localStorage.getItem('userData');
            if (userDataString) {
                try {
                    const userData = JSON.parse(userDataString);
                    if (userData && userData.email) {
                        userEmail = userData.email;
                        console.log(`Retrieved customer email from userData: ${userEmail}`);
                    } else {
                        console.warn('userData found in localStorage, but email is missing.');
                    }
                } catch (e) {
                    console.error('Error parsing userData from localStorage:', e);
                }
            } else {
                 console.warn('userData not found in localStorage. Using default email.');
                 // Fallback: Check if 'userEmail' exists separately (less reliable)
                 const fallbackEmail = localStorage.getItem('userEmail');
                 if (fallbackEmail) {
                     userEmail = fallbackEmail;
                     console.log(`Using fallback customer email from localStorage: ${userEmail}`);
                 }
            }
            // -------------------------------------

            const order = { // Ensure this object matches the server's expected structure
                orderId,
                customerEmail: userEmail, // Use the reliably retrieved email
                customerWallet: currentAccount,
                items: cart, // Original full cart
                totalUSD: totalUSD,
                totalETHPaid: totalETHToPay,
                paymentBreakdown: transactionResults, // CRITICAL: Ensure this is included and correct
                status: 'Completed',
                paymentMethod: isUsingGanache ? 'Ganache' : 'MetaMask',
                createdAt: new Date().toISOString()
                // Add shippingAddress if collected from the form
                // shippingAddress: getShippingAddressFromForm() // Example function call
            };

            // Save order locally
            const orders = JSON.parse(localStorage.getItem('orders') || '[]');
            orders.push(order);
            localStorage.setItem('orders', JSON.stringify(orders));
            console.log('Order details saved to localStorage:', order);
            // Optionally save order to backend database
            try {
                // This function now calls POST /api/orders/create
                await saveOrderToDatabase(order);
                console.log('Order successfully saved to backend database (orders_DB).');
            } catch (dbError) {
                console.error("Failed to save order to database, but blockchain transactions succeeded:", dbError);
                alert("Warning: Payments succeeded, but there was an issue saving your order details to our system. Please keep your Order ID: " + orderId);
            }
            // Clear the cart
            localStorage.setItem('cart', '[]');
            console.log('Cart cleared.');
            // Update payment status
            if (paymentStatus) {
                paymentStatus.innerHTML = `
                    <div class="alert alert-success">
                        <strong>Payment successful!</strong> All transactions confirmed.
                        <p>Order ID: ${orderId}</p>
                        <p>Total Paid: ${totalETHToPay.toFixed(6)} ETH</p>
                        <p>You will be redirected shortly...</p>
                    </div>
                `;
            }
            // Redirect to confirmation/tracking page
            setTimeout(() => {
                window.location.href = "tracking.html?order=" + orderId;
            }, 4000); // Increased delay slightly
        } else {
             // This part might be redundant if errors are thrown and caught earlier, but good for safety
            console.error("One or more payments failed during processing.");
             if (paymentStatus) {
                 const failedTx = transactionResults.find(r => !r.success);
                 paymentStatus.innerHTML = `
                     <div class="alert alert-danger">
                         <strong>Payment Failed:</strong> Not all transactions could be completed.
                         <br>Error: ${failedTx ? failedTx.error : 'Unknown transaction failure.'}
                         <br>Please check your wallet (${isUsingGanache ? 'Ganache' : 'MetaMask'}) and try again.
                     </div>
                 `;
             }
             // No redirect, user stays on checkout page to retry or fix the issue.
        }

    } catch (error) {
        console.error("Error during checkout process:", error);
        if (paymentStatus) {
            paymentStatus.innerHTML = `
                <div class="alert alert-danger">
                    <strong>Checkout Error:</strong> ${error.message}
                </div>
            `;
        }
        // Show user-friendly error message
        alert("Checkout Error: " + error.message);
    }
} // <-- Added missing closing brace here

// Function to save order to database
async function saveOrderToDatabase(order) {
    let token = localStorage.getItem('token'); // Try direct token first
    try {
        if (!token) {
            // Attempt to get token from userData if direct token isn't stored
            const userDataString = localStorage.getItem('userData');
            const userData = userDataString ? JSON.parse(userDataString) : null;
            token = userData ? userData.token : null; // Assign token from userData
        }

        if (!token) {
             throw new Error('Authentication token not found. Cannot save order.');
        }

        console.log("Using token for saveOrderToDatabase:", token ? 'Token found' : 'Token missing');

        const response = await fetch('/api/orders/create', { // Correct endpoint
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` // Send the token
            },
            body: JSON.stringify(order)
        });

        if (!response.ok) {
            let errorMsg = `Server error saving order: ${response.statusText}`;
            try {
                 const errorData = await response.json();
                 errorMsg = `Server error saving order: ${errorData.error || response.statusText}`;
            } catch (e) { /* Ignore if response is not JSON */ }
            throw new Error(errorMsg);
        }

        const data = await response.json();
        console.log('Order saved response from server:', data);
        return data;
    } catch (error) {
        console.error('Error in saveOrderToDatabase:', error);
        // Re-throw the error so the calling function knows it failed
        throw error;
    }
}

// Function to dynamically load a script
function loadScript(src) {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
        document.head.appendChild(script);
    });
}

// Function to process traditional checkout (without blockchain)
function processCheckout(e) {
    e.preventDefault();
    
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    if (cart.length === 0) {
        alert('Your cart is empty. Please add some products before checking out.');
        return;
    }
    
    // Get form data
    const firstName = document.getElementById('first').value;
    const lastName = document.getElementById('last').value;
    const email = document.getElementById('email').value;
    const phone = document.getElementById('number').value;
    const address = document.getElementById('add1').value;
    
    if (!firstName || !lastName || !email || !phone || !address) {
        alert('Please fill in all required fields.');
        return;
    }
    
    // Generate order ID
    const orderId = 'ORD-' + Date.now();
    
    // Get the total from the page
    const totalElement = document.querySelector('.list_2 li:last-child span');
    const totalText = totalElement ? totalElement.textContent : '$0.00';
    const total = parseFloat(totalText.replace('$', '')) || 0;
    
    // Create order object
    const order = {
        orderId,
        customerDetails: {
            firstName,
            lastName,
            email,
            phone,
            address
        },
        items: cart,
        total: total,
        status: 'Pending',
        createdAt: new Date().toISOString()
    };
    
    // Save order to localStorage
    const orders = JSON.parse(localStorage.getItem('orders') || '[]');
    orders.push(order);
    localStorage.setItem('orders', JSON.stringify(orders));
    
    // Clear the cart
    localStorage.setItem('cart', '[]');
    
    // Show success message
    alert(`Thank you for your order! Your order ID is ${orderId}`);

}
