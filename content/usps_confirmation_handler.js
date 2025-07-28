// USPS Confirmation Page Handler
// Adds "Update Shipment" buttons to the Label Number column

function addUpdateShipmentButtons() {
  // Find the table containing shipping labels
  const table = document.querySelector('table.sc-fnxfcy.gIyzvi.table');
  if (!table) return;

  // Find all rows in the table body
  const rows = table.querySelectorAll('tbody tr');
  
  rows.forEach((row, index) => {
    // Find the Label Number column (last column)
    const labelNumberCell = row.querySelector('td:last-child');
    if (!labelNumberCell) return;

    // Check if button already exists to avoid duplicates
    if (labelNumberCell.querySelector('.update-shipment-btn')) return;

    // Get the label number
    const labelNumberElement = labelNumberCell.querySelector('p.text-muted');
    if (!labelNumberElement) {
      console.log('[GBV Extension] Label number element not found in row', index);
      return;
    }
    
    const labelNumber = labelNumberElement.textContent.trim();
    console.log('[GBV Extension] Row', index, 'Label Number:', labelNumber);
    
    // Get the order ID from the recipient column
    const recipientCell = row.querySelector('td:nth-child(4)');
    if (!recipientCell) {
      console.log('[GBV Extension] Recipient cell not found in row', index);
      return;
    }
    
    const orderIdElement = recipientCell.querySelector('span.d-block');
    if (!orderIdElement) {
      console.log('[GBV Extension] Order ID element not found in row', index);
      return;
    }
    
    const orderId = orderIdElement.textContent.trim();
    console.log('[GBV Extension] Row', index, 'Order ID:', orderId);
    
    // Create the Update Shipment button
    const updateButton = document.createElement('button');
    updateButton.textContent = 'Update Shipment';
    updateButton.className = 'update-shipment-btn btn btn-sm btn-primary mt-2';
    updateButton.style.cssText = 'margin-top: 8px; font-size: 12px; padding: 4px 8px;';
    
    // Add click event handler
    updateButton.addEventListener('click', () => {
      console.log('[GBV Extension] Update Shipment button clicked');
      console.log('[GBV Extension] Order ID:', orderId);
      console.log('[GBV Extension] Label Number:', labelNumber);
      
      // Construct the Amazon Seller Central URL
      const amazonUrl = `https://sellercentral.amazon.com/orders-v3/order/${orderId}/confirm-shipment`;
      console.log('[GBV Extension] Amazon URL:', amazonUrl);
      
      // Store the tracking ID with the order ID as key
      const trackingKey = `tracking_${orderId}`;
      console.log('[GBV Extension] Storing tracking ID with key:', trackingKey, 'value:', labelNumber);
      
      chrome.storage.local.set({ [trackingKey]: labelNumber }, () => {
        console.log('[GBV Extension] Tracking ID stored successfully');
        // Verify storage
        chrome.storage.local.get([trackingKey], (result) => {
          console.log('[GBV Extension] Verification - Retrieved from storage:', result[trackingKey]);
        });
      });
      
      // Open new tab with the Amazon URL
      chrome.runtime.sendMessage({
        action: 'open_amazon_tab',
        url: amazonUrl
      });
    });
    
    // Add the button to the label number cell
    labelNumberCell.appendChild(updateButton);
  });
}

// Function to fill tracking ID on Amazon page
function fillTrackingIdOnAmazon() {
  console.log('[GBV Extension] fillTrackingIdOnAmazon called');
  
  // Check if we're on the Amazon confirm shipment page
  if (!window.location.href.includes('sellercentral.amazon.com/orders-v3/order/')) {
    console.log('[GBV Extension] Not on Amazon confirm shipment page');
    return;
  }
  
  // Extract order ID from URL
  const urlMatch = window.location.href.match(/\/order\/([^\/]+)\/confirm-shipment/);
  if (!urlMatch) {
    console.log('[GBV Extension] Could not extract order ID from URL:', window.location.href);
    return;
  }
  
  const orderId = urlMatch[1];
  const trackingKey = `tracking_${orderId}`;
  console.log('[GBV Extension] Order ID:', orderId, 'Tracking Key:', trackingKey);
  
  // Get the tracking ID from storage
  chrome.storage.local.get([trackingKey], (result) => {
    const trackingId = result[trackingKey];
    console.log('[GBV Extension] Retrieved tracking ID from storage:', trackingId);
    
    if (!trackingId) {
      console.log('[GBV Extension] No tracking ID found in storage for key:', trackingKey);
      return;
    }
    
    // Find the tracking input field
    const trackingInput = document.querySelector('input[data-test-id="text-input-tracking-id"]');
    console.log('[GBV Extension] Tracking input element found:', trackingInput);
    
    if (trackingInput) {
      console.log('[GBV Extension] Filling tracking input with:', trackingId);
      trackingInput.value = trackingId;
      trackingInput.dispatchEvent(new Event('input', { bubbles: true }));
      trackingInput.dispatchEvent(new Event('change', { bubbles: true }));
      
      // Clean up the storage
      chrome.storage.local.remove(trackingKey);
      console.log('[GBV Extension] Tracking ID filled successfully and storage cleaned up');
    } else {
      console.log('[GBV Extension] Tracking input element NOT found on page');
      console.log('[GBV Extension] Available input elements:', document.querySelectorAll('input'));
    }
  });
}

// Function to wait for the tracking input field to appear
function waitForTrackingInput() {
  console.log('[GBV Extension] waitForTrackingInput called');
  const trackingInput = document.querySelector('input[data-test-id="text-input-tracking-id"]');
  console.log('[GBV Extension] Tracking input found on first try:', !!trackingInput);
  
  if (trackingInput) {
    console.log('[GBV Extension] Calling fillTrackingIdOnAmazon');
    fillTrackingIdOnAmazon();
  } else {
    console.log('[GBV Extension] Tracking input not found, retrying in 1 second...');
    // If not found, wait and try again
    setTimeout(waitForTrackingInput, 1000);
  }
}

// Initialize based on current page
if (window.location.href.includes('cnsb.usps.com/confirmation-page')) {
  // USPS confirmation page
  // Wait for the table to load
  const observer = new MutationObserver(() => {
    const table = document.querySelector('table.sc-fnxfcy.gIyzvi.table');
    if (table) {
      addUpdateShipmentButtons();
      observer.disconnect();
    }
  });
  
  observer.observe(document.body, { childList: true, subtree: true });
  
  // Also try immediately in case table is already present
  addUpdateShipmentButtons();
  
} else if (window.location.href.includes('sellercentral.amazon.com/orders-v3/order/')) {
  // Amazon confirm shipment page
  // Wait for the page to load and then try to fill tracking ID
  setTimeout(() => {
    waitForTrackingInput();
  }, 1000);
} 