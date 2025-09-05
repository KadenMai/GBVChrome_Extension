// USPS History Page Handler
// Handles the history/orders page functionality

// Function to set page size to 40 for history page
function setPageSizeTo40() {
  const pageSizeSelect = document.querySelector('#page-size-select');
  if (pageSizeSelect) {
    pageSizeSelect.value = '40';
    pageSizeSelect.dispatchEvent(new Event('change', { bubbles: true }));
    console.log('[GBV Extension] Set page size to 40');
  } else {
    console.log('[GBV Extension] Page size select not found');
  }
}

// Function to add Update All Shipments button
function addUpdateAllShipmentsButton() {
  // Check if button already exists
  if (document.querySelector('.update-all-shipments-btn')) return;
  
  // Find the button with id="order-details-export"
  const exportButton = document.querySelector('#order-details-export');
  if (!exportButton) {
    console.log('[GBV Extension] Export button not found');
    return;
  }
  
  // Get the parent div of the export button
  const parentDiv = exportButton.parentNode;
  if (!parentDiv) {
    console.log('[GBV Extension] Parent div of export button not found');
    return;
  }
  
  const updateAllButton = document.createElement('button');
  updateAllButton.textContent = 'Update All Shipments';
  updateAllButton.className = 'update-all-shipments-btn btn btn-warning btn-sm';
  
  updateAllButton.addEventListener('click', () => {
    console.log('[GBV Extension] Update All Shipments button clicked');
 
    const table = document.querySelector('table[aria-label="History Table"]');
    console.log('[GBV Extension] Found History table:', table);
    if (!table) 
      {
        console.log('[GBV Extension] History table not found');
        return;
      }
    // Get all rows with label numbers and order IDs
    const rows = table.querySelectorAll('tbody tr');
    const shipments = [];
    
    rows.forEach((row, index) => {
      // Get order ID from the span with d-block class
      const orderIdElement = row.querySelector('span.d-block');
      if (!orderIdElement) return;
      
      const orderId = orderIdElement.textContent.trim();
      if (!orderId || !orderId.match(/^\d{3}-\d{7}-\d{7}$/)) return; // Amazon order ID format
      
      // Get label number from the link
      const labelLink = row.querySelector('a.core-link');
      if (!labelLink) return;
      
      const labelNumber = labelLink.textContent.trim();
      
      shipments.push({ orderId, labelNumber });
      console.log(`[GBV Extension] Shipment ${index + 1}: Order ${orderId}, Label ${labelNumber}`);
    });
    
    console.log(`[GBV Extension] Found ${shipments.length} shipments to update`);
    
    // Open Amazon tabs for each shipment with a small delay between each
    shipments.forEach((shipment, index) => {
      setTimeout(() => {
        const amazonUrl = `https://sellercentral.amazon.com/orders-v3/order/${shipment.orderId}/confirm-shipment`;
        
        // Store tracking ID
        const trackingKey = `tracking_${shipment.orderId}`;
        chrome.storage.local.set({ [trackingKey]: shipment.labelNumber });
        
        // Open tab
        chrome.runtime.sendMessage({
          action: 'open_amazon_tab',
          url: amazonUrl
        });
        
        console.log(`[GBV Extension] Opened tab ${index + 1}/${shipments.length} for order ${shipment.orderId}`);
      }, index * 1000); // 1 second delay between each tab
    });
  });
  
  // Insert the button into the parent div of the export button
  parentDiv.appendChild(updateAllButton);
  console.log('[GBV Extension] Update All Shipments button added to parent div');
}

// Function to add Update Shipment buttons to History Table
function addUpdateShipmentButtonsToHistory() {
  // Find the History Table
  const table = document.querySelector('table[aria-label="History Table"]');
  console.log('[GBV Extension] Found History table:', table);
  if (!table) {
    console.log('[GBV Extension] History table not found');
    return;
  }

  // Find all rows in the table body
  const rows = table.querySelectorAll('tbody tr');
  
  rows.forEach((row, index) => {
    // Check if button already exists to avoid duplicates
    if (row.querySelector('.update-shipment-btn')) return;

    // Get order ID from the span with d-block class
    const orderIdElement = row.querySelector('span.d-block');
    if (!orderIdElement) {
      console.log('[GBV Extension] Order ID element not found in row', index);
      return;
    }
    
    const orderId = orderIdElement.textContent.trim();
    console.log('[GBV Extension] Row', index, 'Order ID:', orderId);
    
    // Get the label number from the link
    const labelLink = row.querySelector('a.core-link');
    if (!labelLink) {
      console.log('[GBV Extension] Label link not found in row', index);
      return;
    }
    
    const labelNumber = labelLink.textContent.trim();
    console.log('[GBV Extension] Row', index, 'Label Number:', labelNumber);
    
    // Find the last column (actions column) to add the button
    const actionsCell = row.querySelector('td:last-child');
    if (!actionsCell) {
      console.log('[GBV Extension] Actions cell not found in row', index);
      return;
    }
    
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
    
    // Add the button to the actions cell
    actionsCell.appendChild(updateButton);
  });
}

// Initialize USPS History Page
function initializeHistoryPage() {
  console.log('[GBV Extension] USPS history/orders page detected');
  
  // First, set page size to 40
  setTimeout(() => {
    setPageSizeTo40();
    
    // Wait for page to reload with new size, then add buttons
    setTimeout(() => {
      addUpdateShipmentButtonsToHistory();
      addUpdateAllShipmentsButton();
    }, 2000);
  }, 1000);
  
  // Also use MutationObserver to watch for table changes
  const observer = new MutationObserver(() => {
    const table = document.querySelector('table[aria-label="History Table"]');
    if (table) {
      console.log('[GBV Extension] History table found via MutationObserver');
      addUpdateShipmentButtonsToHistory();
      addUpdateAllShipmentsButton();
    }
  });
  
  observer.observe(document.body, { childList: true, subtree: true });
  
  // Fallback timeouts
  setTimeout(() => {
    addUpdateShipmentButtonsToHistory();
    addUpdateAllShipmentsButton();
  }, 3000);
  
  setTimeout(() => {
    addUpdateShipmentButtonsToHistory();
    addUpdateAllShipmentsButton();
  }, 6000);
}

// Auto-initialize if on history page
if (window.location.href.includes('cnsb.usps.com/history/orders/')) {
  initializeHistoryPage();
}
