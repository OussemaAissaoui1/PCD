document.addEventListener('DOMContentLoaded', function() {
    // Check for order ID in URL parameters (for redirects from checkout)
    const urlParams = new URLSearchParams(window.location.search);
    const orderIdFromUrl = urlParams.get('order');
    if (orderIdFromUrl) {
        document.getElementById('order').value = orderIdFromUrl;
    }

    const trackingForm = document.querySelector('.tracking_form');
    const trackingBoxInner = document.querySelector('.tracking_box_inner');

    trackingForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const orderId = document.getElementById('order').value;
        const email = document.getElementById('email').value;

        if (!orderId) {
            alert('Please enter an Order ID');
            return;
        }

        try {
            // Show loading state
            trackingForm.style.opacity = '0.5';
            const loadingDiv = document.createElement('div');
            loadingDiv.className = 'text-center mt-4';
            loadingDiv.innerHTML = `
                <div class="spinner-border text-primary" role="status">
                    <span class="sr-only">Loading...</span>
                </div>
                <p class="mt-2">Fetching order status...</p>
            `;
            trackingBoxInner.appendChild(loadingDiv);

            const response = await fetch(`/api/orders/status/${orderId}`);
            const data = await response.json();

            // Remove loading state
            trackingForm.style.opacity = '1';
            loadingDiv.remove();

            if (response.ok) {
                // Create status display section
                const statusDisplay = document.createElement('div');
                statusDisplay.className = 'order-status-display mt-5';
                
                // Format the order date
                const orderDate = new Date(data.orderDate).toLocaleDateString();
                
                // Generate status HTML
                let statusHtml = `
                    <div class="card">
                        <div class="card-header bg-primary text-white">
                            <h4 class="mb-0">Order Status - ${data.orderId}</h4>
                        </div>
                        <div class="card-body">
                            <div class="row mb-4">
                                <div class="col-md-6">
                                    <h5>Order Details</h5>
                                    <p><strong>Order Date:</strong> ${orderDate}</p>
                                </div>
                                <div class="col-md-6">
                                    <h5>Shipping Address</h5>
                                    <p>${data.shippingAddress ? `
                                        ${data.shippingAddress.firstName} ${data.shippingAddress.lastName}<br>
                                        ${data.shippingAddress.address}
                                    ` : 'Address not available'}</p>
                                </div>
                            </div>
                            <h5>Items Status</h5>
                            <div class="table-responsive">
                                <table class="table">
                                    <thead>
                                        <tr>
                                            <th>Item</th>
                                            <th>Quantity</th>
                                            <th>Status</th>
                                            <th>Vendor</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                `;

                // Add each item's status
                data.items.forEach(item => {
                    const statusClass = {
                        'Pending': 'badge-warning',
                        'Shipped': 'badge-info',
                        'Delivered': 'badge-success'
                    }[item.status] || 'badge-secondary';

                    statusHtml += `
                        <tr>
                            <td>${item.name}</td>
                            <td>${item.quantity}</td>
                            <td><span class="badge ${statusClass}">${item.status}</span></td>
                            <td>${item.vendorEmail}</td>
                        </tr>
                    `;
                });

                statusHtml += `
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                `;

                // Remove any existing status display
                const existingStatus = document.querySelector('.order-status-display');
                if (existingStatus) {
                    existingStatus.remove();
                }

                statusDisplay.innerHTML = statusHtml;
                trackingBoxInner.appendChild(statusDisplay);

            } else {
                // Show error message
                alert(data.error || 'Could not find order information');
            }

        } catch (error) {
            console.error('Error fetching order status:', error);
            alert('An error occurred while tracking the order. Please try again.');
            trackingForm.style.opacity = '1';
            const loadingDiv = document.querySelector('.text-center.mt-4');
            if (loadingDiv) loadingDiv.remove();
        }
    });
});