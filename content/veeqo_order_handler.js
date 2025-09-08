// Order handling functionality for Veeqo extension

// Tab-Separated File Reading functionality
function addCSVReaderButton() {
  // Check if we're on the Veeqo orders list page (including filtered pages)
  if (!window.location.href.includes('app.veeqo.com/orders') || 
      window.location.href.match(/\/orders\/\d+/)) {
    return; // Only add to orders list page, not individual order pages
  }
  
  // Check if button already exists
  if (document.querySelector('.csv-reader-btn')) return;
  
  // Find the bulk actions button to place CSV button next to it
  const bulkActionsButton = document.querySelector('#bulk-actions-cta');
  
  if (!bulkActionsButton) {
    console.log('[GBV Extension] Bulk actions button not found');
    return;
  }
  
  // Get the parent container of the bulk actions button
  const buttonContainer = bulkActionsButton.parentNode;
  
  if (!buttonContainer) {
    console.log('[GBV Extension] Could not find parent container for bulk actions button');
    return;
  }
  
  // Create tab-separated file reader button
  const csvButton = document.createElement('button');
  csvButton.textContent = '📄 Read Tab File';
  csvButton.className = 'csv-reader-btn btn btn-info btn-sm';
  csvButton.style.cssText = 'margin-left: 10px; padding: 8px 16px; font-size: 14px;background: green;color: white;';
  
  // Make it look consistent with the bulk actions button
  if (bulkActionsButton.classList.contains('btn-primary')) {
    csvButton.className = 'csv-reader-btn btn btn-primary btn-sm';
  }
  
  // Create hidden file input
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = '.txt';
  fileInput.style.display = 'none';
  
  csvButton.addEventListener('click', () => {
    fileInput.click();
  });
  
  fileInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file) {
      readTabSeparatedFile(file);
    }
  });
  
  // Add button next to the bulk actions button
  buttonContainer.insertAdjacentElement('afterend', csvButton);
  document.body.appendChild(fileInput);
  
  console.log('[GBV Extension] Tab file reader button added');
}

function readTabSeparatedFile(file) {
  console.log('[GBV Extension] Reading tab-separated file:', file.name);
  
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const fileContent = e.target.result;
      const tabData = parseTabSeparatedFile(fileContent);
      
      console.log('[GBV Extension] Tab-separated file parsed successfully:', tabData);
      
      // Display data in an alert or process it
      displayTabData(tabData);
      
    } catch (error) {
      console.error('[GBV Extension] Error reading tab-separated file:', error);
      alert('Error reading tab-separated file: ' + error.message);
    }
  };
  
  reader.onerror = () => {
    console.error('[GBV Extension] Error reading file');
    alert('Error reading the tab-separated file');
  };
  
  reader.readAsText(file);
}

function parseTabSeparatedFile(fileContent) {
  const lines = fileContent.split('\n');
  const data = [];
  
  console.log('[GBV Extension] Parsing tab-separated file with', lines.length, 'lines');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line) {
      // Parse tab-separated values
      const row = line.split('\t');
      if (row.length > 0) {
        data.push(row);
        if (i < 3) { // Debug first few lines
          console.log(`[GBV Extension] Line ${i} has`, row.length, 'columns');
          console.log(`[GBV Extension] First few columns:`, row.slice(0, 5));
        }
      }
    }
  }
  
  console.log('[GBV Extension] Total parsed rows:', data.length);
  return data;
}

function displayTabData(tabData) {
  if (tabData.length === 0) {
    alert('Tab-separated file is empty');
    return;
  }
  
  // Check if this looks like Amazon order data
  const isAmazonFormat = tabData[0] && tabData[0].includes('order-id');
  
  if (isAmazonFormat) {
    // Process Amazon order format
    processAmazonOrders(tabData);
  } else {
    // Generic tab-separated display
    let displayText = `Tab-Separated File Contents (${tabData.length} rows):\n\n`;
    
    // Show first few rows as preview
    const previewRows = Math.min(5, tabData.length);
    for (let i = 0; i < previewRows; i++) {
      displayText += `Row ${i + 1}: ${tabData[i].join(' | ')}\n`;
    }
    
    if (tabData.length > previewRows) {
      displayText += `\n... and ${tabData.length - previewRows} more rows`;
    }
    
    alert(displayText);
  }
  
  // Store tab data for potential use
  chrome.storage.local.set({ 
    tabData: tabData,
    tabTimestamp: Date.now()
  }, () => {
    console.log('[GBV Extension] Tab-separated data stored in chrome.storage.local');
  });
}

function processAmazonOrders(tabData) {
  console.log('[GBV Extension] Processing Amazon order tab-separated data');
  
  if (tabData.length < 2) {
    alert('Amazon tab-separated file appears to be empty or invalid');
    return;
  }
  
  // Get header row
  const headers = tabData[0];
  const orderRows = tabData.slice(1); // Skip header row
  
  // Find important column indices
  const orderIdIndex = headers.findIndex(h => h === 'order-id');
  const recipientNameIndex = headers.findIndex(h => h === 'recipient-name');
  const address1Index = headers.findIndex(h => h === 'ship-address-1');
  const address2Index = headers.findIndex(h => h === 'ship-address-2');
  const cityIndex = headers.findIndex(h => h === 'ship-city');
  const stateIndex = headers.findIndex(h => h === 'ship-state');
  const zipIndex = headers.findIndex(h => h === 'ship-postal-code');
  const skuIndex = headers.findIndex(h => h === 'sku');
  const quantityIndex = headers.findIndex(h => h === 'quantity-purchased');
  const deliveryInstructionsIndex = headers.findIndex(h => h === 'delivery-Instructions');
  const buyerEmailIndex = headers.findIndex(h => h === 'buyer-email');
  const phoneIndex = headers.findIndex(h => h === 'ship-phone-number');
  
  console.log('[GBV Extension] Found columns:', {
    orderId: orderIdIndex,
    recipient: recipientNameIndex,
    address1: address1Index,
    address2: address2Index,
    city: cityIndex,
    state: stateIndex,
    zip: zipIndex,
    sku: skuIndex,
    quantity: quantityIndex,
    deliveryInstructions: deliveryInstructionsIndex,
    buyerEmail: buyerEmailIndex
  });
  
  // Debug: Show the header row and first data row
  console.log('[GBV Extension] Header row:', headers);
  console.log('[GBV Extension] First data row:', orderRows[0]);
  console.log('[GBV Extension] Order ID from first row (index', orderIdIndex, '):', orderRows[0][orderIdIndex]);
  
  // Count orders with delivery instructions
  const ordersWithInstructions = orderRows.filter(order => 
    order[deliveryInstructionsIndex] && order[deliveryInstructionsIndex].trim()
  );
  
  console.log('[GBV Extension] Orders with delivery instructions:', ordersWithInstructions.length);
  ordersWithInstructions.slice(0, 3).forEach((order, index) => {
    console.log(`[GBV Extension] Order ${index + 1} with instructions:`, {
      orderId: order[orderIdIndex],
      instructions: order[deliveryInstructionsIndex]
    });
  });
  
  // Process first few orders as example
  const sampleOrders = orderRows.slice(0, 3);
  let displayText = `Amazon Orders CSV Loaded!\n\n`;
  displayText += `Total Orders: ${orderRows.length}\n`;
  displayText += `Orders with Delivery Instructions: ${ordersWithInstructions.length}\n\n`;
  displayText += `Sample Orders:\n\n`;
  
  sampleOrders.forEach((order, index) => {
    const orderId = order[orderIdIndex] || 'N/A';
    const recipient = order[recipientNameIndex] || 'N/A';
    const address1 = order[address1Index] || 'N/A';
    const city = order[cityIndex] || 'N/A';
    const state = order[stateIndex] || 'N/A';
    const zip = order[zipIndex] || 'N/A';
    const sku = order[skuIndex] || 'N/A';
    const quantity = order[quantityIndex] || 'N/A';
    
    displayText += `Order ${index + 1}:\n`;
    displayText += `  Order ID: ${orderId}\n`;
    displayText += `  Recipient: ${recipient}\n`;
    displayText += `  Address: ${address1}, ${city}, ${state} ${zip}\n`;
    displayText += `  SKU: ${sku} (Qty: ${quantity})\n\n`;
  });
  
  if (orderRows.length > 3) {
    displayText += `... and ${orderRows.length - 3} more orders`;
  }
  
  alert(displayText);
  
  // Store processed order data for potential use
  const processedOrders = orderRows.map(order => ({
    orderId: order[orderIdIndex],
    recipient: order[recipientNameIndex],
    address1: order[address1Index],
    address2: order[address2Index],
    city: order[cityIndex],
    state: order[stateIndex],
    zip: order[zipIndex],
    sku: order[skuIndex],
    quantity: order[quantityIndex],
    deliveryInstructions: order[deliveryInstructionsIndex],
    buyerEmail: order[buyerEmailIndex],
    buyerPhone: order[phoneIndex]
  }));
  
  // Debug: Check if our target order is in the processed data
  const targetOrder = processedOrders.find(o => o.orderId === '113-2591563-2056216');
  console.log('[GBV Extension] Target order 113-2591563-2056216 found in processed data:', !!targetOrder);
  if (targetOrder) {
    console.log('[GBV Extension] Target order details:', targetOrder);
  }
  
  // Debug: Show first few processed order IDs
  console.log('[GBV Extension] First 5 processed order IDs:', processedOrders.slice(0, 5).map(o => o.orderId));
  
  chrome.storage.local.set({ 
    amazonOrders: processedOrders,
    amazonOrdersTimestamp: Date.now()
  }, () => {
    console.log('[GBV Extension] Amazon orders stored in chrome.storage.local');
    
    // Debug: Verify what was actually stored
    chrome.storage.local.get(['amazonOrders'], (result) => {
      if (result.amazonOrders) {
        console.log('[GBV Extension] Verification - Stored orders count:', result.amazonOrders.length);
        console.log('[GBV Extension] Verification - First 5 order IDs:', result.amazonOrders.slice(0, 5).map(o => o.orderId));
        
        // Check for our target order
        const targetOrder = result.amazonOrders.find(o => o.orderId === '113-2591563-2056216');
        console.log('[GBV Extension] Verification - Target order 113-2591563-2056216 found:', !!targetOrder);
        if (targetOrder) {
          console.log('[GBV Extension] Verification - Target order details:', targetOrder);
        }
      }
    });
    
    // After storing, add instruction buttons to the orders table
    addInstructionButtonsToOrders();
  });
}

function addInstructionButtonsToOrders() {
  console.log('[GBV Extension] Adding instruction buttons to orders table');
  
  // Get stored Amazon orders
  chrome.storage.local.get(['amazonOrders'], (result) => {
    if (!result.amazonOrders) {
      console.log('[GBV Extension] No Amazon orders found in storage');
      return;
    }
    
    const amazonOrders = result.amazonOrders;
    console.log('[GBV Extension] Found', amazonOrders.length, 'Amazon orders in storage');
    
    // Debug: Show first few order IDs
    console.log('[GBV Extension] First 5 order IDs in storage:', amazonOrders.slice(0, 5).map(o => o.orderId));
    
    // Find the orders table
    const table = document.querySelector('table');
    if (!table) {
      console.log('[GBV Extension] Orders table not found');
      return;
    }
    
    // Find all rows in the table
    const rows = table.querySelectorAll('tbody tr');
    console.log('[GBV Extension] Found', rows.length, 'rows in orders table');
    
    rows.forEach((row, index) => {
      // Check if instruction button already exists
      if (row.querySelector('.instruction-btn')) return;
      
      // Try to find order number in the row
      const orderNumberElement = row.querySelector('button[class*="act-react-listing-row-item-name"]');
      if (!orderNumberElement) return;
      
      const orderNumber = orderNumberElement.textContent.trim();
      console.log('[GBV Extension] Checking row', index, 'for order:', orderNumber);
      
      // Debug: Check if this order ID exists in our stored data
      const orderExists = amazonOrders.some(order => order.orderId === orderNumber);
      console.log('[GBV Extension] Order', orderNumber, 'exists in stored data:', orderExists);
      
      // Find matching Amazon order - try multiple matching strategies
      const matchingOrder = amazonOrders.find(order => {
        if (!order.orderId) return false;
        
        // Strategy 1: Direct order ID match
        if (order.orderId === orderNumber) return true;
        
        // Strategy 2: Extract numbers from both and compare
        const csvOrderNumbers = order.orderId.replace(/\D/g, '');
        const veeqoOrderNumbers = orderNumber.replace(/\D/g, '');
        if (csvOrderNumbers === veeqoOrderNumbers) return true;
        
        // Strategy 3: Check if Veeqo order number is contained in CSV order ID
        if (order.orderId.includes(veeqoOrderNumbers)) return true;
        
        return false;
      });
      
      if (matchingOrder) {
        console.log('[GBV Extension] Found matching order:', matchingOrder.orderId, 'for Veeqo order:', orderNumber);
        console.log('[GBV Extension] Delivery instructions:', matchingOrder.deliveryInstructions);
        
        if (matchingOrder.deliveryInstructions && matchingOrder.deliveryInstructions.trim()) {
          console.log('[GBV Extension] Order has delivery instructions, adding button for:', orderNumber);
        
        // Find the spacer column (same as GBV Action button)
        const spacerIndex = Array.from(table.querySelector('thead tr').children)
          .findIndex(th => th.id === 'datatable-header-spacer');
        
        if (spacerIndex !== -1) {
          const cells = row.children;
          if (cells.length > spacerIndex) {
            const cell = cells[spacerIndex];
            
            // Create instruction button
            const instructionBtn = document.createElement('button');
            instructionBtn.textContent = 'Instruction';
            instructionBtn.className = 'instruction-btn btn btn-warning btn-sm';
            instructionBtn.style.cssText = 'margin-left: 5px; padding: 4px 8px; font-size: 12px; background: orange; color: white; border: none; border-radius: 3px;';
            
            instructionBtn.addEventListener('click', () => {
              printDeliveryInstructions(matchingOrder);
            });
            
            cell.appendChild(instructionBtn);
            console.log('[GBV Extension] Added instruction button for order:', orderNumber);
          }
        }
        } else {
          console.log('[GBV Extension] Order has no delivery instructions:', orderNumber);
        }
      } else {
        console.log('[GBV Extension] No matching order found for:', orderNumber);
      }
    });
  });
}

function printDeliveryInstructions(order) {
  console.log('[GBV Extension] Printing delivery instructions for order:', order.orderId);
  
  // Create a new window for printing
  const printWindow = window.open('', '_blank', 'width=600,height=400');
  
  // Create print content
  const printContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Delivery Instructions - Order ${order.orderId}</title>
      <style>
        @page {
          size: 4in 6in;
          margin: 0.25in;
        }
        body {
          font-family: Arial, sans-serif;
          font-size: 12px;
          line-height: 1.4;
          margin: 0;
          padding: 10px;
        }
        .header {
          font-weight: bold;
          font-size: 14px;
          margin-bottom: 10px;
          border-bottom: 2px solid #000;
          padding-bottom: 5px;
        }
        .field {
          margin-bottom: 8px;
        }
        .label {
          font-weight: bold;
          display: inline-block;
          width: 120px;
        }
        .value {
          display: inline-block;
        }
        .instructions {
          margin-top: 15px;
          padding: 10px;
          border: 1px solid #000;
          background-color: #f9f9f9;
          font-weight: bold;
        }
        .footer {
            position: fixed;
            bottom: 0;
            width: 100%;
            border-top: 2px solid #000;
            padding-top: 5px;
            text-align: center;
        }
        @media print {
          body { margin: 0; padding: 5px; }
          .no-print { display: none; }
        }
      </style>
    </head>
    <body>      
      <div class="header">DELIVERY INSTRUCTIONS</div>
      
      <div class="field">
        <span class="label">Order Number:</span>
        <span class="value">${order.orderId || 'N/A'}</span>
      </div>
      
      <div class="field">
        <span class="label">Customer Name:</span>
        <span class="value">${order.recipient || 'N/A'}</span>
      </div>

      <div class="field">
        <span class="label">Customer Phone:</span>
        <span class="value">${order.buyerPhone || 'N/A'}</span>
      </div>
      
      <div class="field">
        <span class="label">Item Info:</span>
        <span class="value"> ${order.quantity || 'N/A'} x ${order.sku || 'N/A'}</span>
      </div>
      
      <div class="instructions">
        <div class="label">Delivery Instructions:</div>
        <div class="value" style="font-size: large;">${order.deliveryInstructions || 'No special instructions'}</div>
      </div>
      
      <div class="no-print" style="margin-top: 20px; text-align: center;">
        <button onclick="window.print()" style="padding: 10px 20px; font-size: 14px; background: #007bff; color: white; border: none; border-radius: 5px; cursor: pointer;">Print 4x6 Label</button>
        <button onclick="window.close()" style="padding: 10px 20px; font-size: 14px; background: #6c757d; color: white; border: none; border-radius: 5px; cursor: pointer; margin-left: 10px;">Close</button>
      </div>

      <div class="footer">
        <div class="value">Thanks for shopping with GocBepViet</div><br
        <div class="value">https://gocbepviet.com/</div>
      </div>
    </body>
    </html>
  `;
  
  printWindow.document.write(printContent);
  printWindow.document.close();
  
  // Auto-print after a short delay
  setTimeout(() => {
    printWindow.print();
  }, 500);
}

function processCSVWithOrder(csvData) {
  console.log('[GBV Extension] Processing CSV data on orders list page');
  
  // For orders list page, we'll just show the CSV data
  // You can add specific processing logic here based on your needs
  console.log('[GBV Extension] CSV data ready for processing:', csvData);
  
  // Example: You could extract order numbers from the CSV and match them with visible orders
  const orderNumbers = csvData.flat().filter(cell => 
    cell && typeof cell === 'string' && cell.match(/^\d+$/)
  );
  
  if (orderNumbers.length > 0) {
    console.log('[GBV Extension] Found potential order numbers in CSV:', orderNumbers);
  }
}

// Parse street address to separate street and apartment/unit
function parseStreetAddress(fullAddress) {
  if (!fullAddress) return { street: '', apartment: '' };
  
  // Common apartment/unit indicators
  const aptPatterns = [
    /(.*?)\s+(Apt|Apartment|Unit|Suite|Ste|#|No|Number)\s*\.?\s*(.+)/i,
    /(.*?)\s+(Floor|Fl|Level|Lvl)\s*\.?\s*(.+)/i,
    /(.*?)\s+(Building|Bldg)\s*\.?\s*(.+)/i,
    /(.*?)\s+(Room|Rm)\s*\.?\s*(.+)/i
  ];
  
  // Try each pattern
  for (const pattern of aptPatterns) {
    const match = fullAddress.match(pattern);
    if (match) {
      return {
        street: match[1].trim(),
        apartment: `${match[2]} ${match[3]}`.trim()
      };
    }
  }
  
  // If no pattern matches, return the full address as street
  return {
    street: fullAddress.trim(),
    apartment: ''
  };
}

function handleOrderAction(row) {
  
  // ========Work on each row========
  // Try to find the <button> with class containing 'act-react-listing-row-item-name' in the row
  let orderBtn = row.querySelector('button[class*="act-react-listing-row-item-name"]');
  let searchRow = row;
  let found = !!orderBtn;
  // If not found, search previous rows
  while (!found && searchRow && searchRow.previousElementSibling) {
    searchRow = searchRow.previousElementSibling;
    orderBtn = searchRow.querySelector('button[class*="act-react-listing-row-item-name"]');
    found = !!orderBtn;
  }

  // Extract QTY from the order list row
  let qty = '';
  const qtyBtn = row.querySelector('button[aria-controls="line-items-popover"]');
  if (qtyBtn) {
    const qtyDiv = qtyBtn.querySelector('div[role="status"]');
    if (qtyDiv) {
      qty = qtyDiv.textContent.trim();
    }
  }

  // Extract Current Service Price from span with act-current-service-price class
  let currentServicePrice = '';
  const servicePriceSpan = row.querySelector('span[class*="act-current-service-price"]');
  if (servicePriceSpan) {
    currentServicePrice = servicePriceSpan.textContent.trim();
  }

  // Extract package weight from the correct class
  let pkgWeight = '';
  const weightSpan = row.querySelector('span.productDimensions.package__weight');
  if (weightSpan) {
    pkgWeight = weightSpan.textContent.trim();
  }
  // Extract package dimensions from the correct class
  let pkgDimensionsFromRow = '';
  const dimSpan = row.querySelector('span.productDimensions.package__dimensions');
  if (dimSpan) {
    pkgDimensionsFromRow = dimSpan.textContent.trim();
  }

  // ========Work on each order========
  if (
    orderBtn &&
    pkgWeight &&
    pkgDimensionsFromRow
  ) {
    orderBtn.click();
    setTimeout(() => {
      // Extract Order Number from <h1> title attribute inside <div class="container-name span6">
      let orderNumber = '';
      const containerName = document.querySelector('div.container-name.span6 h1.nobold');
      if (containerName && containerName.hasAttribute('title')) {
        orderNumber = containerName.getAttribute('title').trim();
      } else {
        orderNumber = orderBtn ? orderBtn.textContent.trim() : '';
      }

      // Extract SKU from the vq2-table
      let sku = '';
      const orderTable = document.querySelector('table.vq2-table');
      if (orderTable) {
        const skuIndex = 1;
        const firstRow = orderTable.querySelector('tbody tr');
        if (firstRow) {
          const cells = firstRow.querySelectorAll('td');
          if (skuIndex >= 0 && cells[skuIndex]) {
            const span = cells[skuIndex].querySelector('span');
            sku = span ? span.textContent.trim() : cells[skuIndex].textContent.trim();
          }
        }
      }
      let sku_info = '';
      if (sku && qty) {
        sku_info = `${qty} x ${sku}`;
      }

      // Extract Order Id
      const orderRow = document.querySelector('tr[class*="order_"]');
      let orderId = null;
      if (orderRow) {
        const match = orderRow.className.match(/order_(\d+)/);
        if (match) orderId = match[1];
      }

      // Extract Shipping Address from order-details-table
      const addressTable = document.querySelector('table.order-details-table');
      let shippingAddress = [];
      if (addressTable) {
        const addressTd = addressTable.querySelector('td.order-summary-address-details');
        if (addressTd) {
          // Collect all address lines
          let addressLines = [];
          addressTd.querySelectorAll('.fs-exclude').forEach(div => {
            const a = div.querySelector('a');
            const text = a ? a.textContent.trim() : div.textContent.trim();
            if (text) addressLines.push(text);
          });
          // addressLines[0] is usually the recipient name
          // addressLines[1] is the full street address (may include apt/unit)
          // addressLines[2] is city, [3] is state, [4] is zip, etc.
          shippingAddress.push(addressLines[0] || ''); // recipient
          // Parse street/apartment
          const parsed = parseStreetAddress(addressLines[1] || '');
          shippingAddress.push(parsed.street || ''); // address1
          shippingAddress.push(parsed.apartment || ''); // address2
          // Add the rest (city, state, zip, etc.)
          for (let i = 2; i < addressLines.length; ++i) {
            shippingAddress.push(addressLines[i]);
          }
        }
      }

      // Extract Package Weight and Dimensions
      let pkgDimensions = '';
      const pkgBtn = document.querySelector('button.packages_options_button');
      if (pkgBtn) {
        pkgDimensions = pkgBtn.querySelector('.package__dimensions')?.textContent.trim() || '';
      }      

      // Extract Expected delivery from order-header__sub-title
      let expectedDelivery = '';
      const subTitleDiv = document.querySelector('div.order-header__sub-title');
      if (subTitleDiv) {
        const text = subTitleDiv.textContent;
        const deliveryMatch = text.match(/Expected delivery on ([^&\s]+(?:\s+[^&\s]+)*)/);
        if (deliveryMatch) {
          expectedDelivery = deliveryMatch[1].trim();
        }
      }

      
      const shippingInfo = {
        orderNumber,
        itemInfo: sku_info,
        orderId,
        shippingAddress,
        packageWeight: pkgWeight,
        packageDimensions: pkgDimensionsFromRow,
        expectedDelivery,
        currentServicePrice,
      };

      // Show alert with all info, including sku_info, expected delivery, and service price
      alert(
        `Order Number: ${orderNumber}\n` +
        `Order Id: ${orderId}\n` +
        `Shipping Address: ${shippingAddress ? shippingAddress.join(', ') : ''}\n` +
        `Package Weight: ${pkgWeight}\n` +
        `Package Dimensions: ${pkgDimensionsFromRow}\n` +
        `Expected Delivery: ${expectedDelivery}\n` +
        `Current Service Price: ${currentServicePrice}\n` +
        `SKU Info: ${sku_info}`
      );

      // Open USPS label manager in a new tab and send shipping info
      chrome.runtime.sendMessage({ action: 'open_usps_label_tab', shippingInfo });
    }, 1000); // Adjust timeout as needed for page load
  } else {
    alert('Order number button not found in this row or any previous rows.');
  }
}

// Initialize tab file reader button when page loads
function initializeCSVReader() {
  // Wait for page to load
  setTimeout(() => {
    addCSVReaderButton();
  }, 1000);
  
  // Also use MutationObserver to watch for page changes
  const observer = new MutationObserver(() => {
    if (!document.querySelector('.csv-reader-btn')) {
      addCSVReaderButton();
    }
  });
  
  observer.observe(document.body, { childList: true, subtree: true });
  
  // Fallback timeout
  setTimeout(() => {
    if (!document.querySelector('.csv-reader-btn')) {
      addCSVReaderButton();
    }
  }, 3000);
}

// Auto-initialize if on Veeqo orders list page (including filtered pages)
if (window.location.href.includes('app.veeqo.com/orders') && 
    !window.location.href.match(/\/orders\/\d+/)) {
  initializeCSVReader();
}

// Add manual trigger function for testing
window.addInstructionButtons = addInstructionButtonsToOrders;

// Add function to check stored data
window.checkStoredData = function() {
  chrome.storage.local.get(['amazonOrders'], (result) => {
    if (result.amazonOrders) {
      console.log('[GBV Extension] Stored orders count:', result.amazonOrders.length);
      console.log('[GBV Extension] First 10 order IDs:', result.amazonOrders.slice(0, 10).map(o => o.orderId));
      
      // Check for our target order
      const targetOrder = result.amazonOrders.find(o => o.orderId === '113-2591563-2056216');
      console.log('[GBV Extension] Target order found:', !!targetOrder);
      if (targetOrder) {
        console.log('[GBV Extension] Target order details:', targetOrder);
      }
      
      // Check for any order containing 113-2591563-2056216
      const similarOrders = result.amazonOrders.filter(o => o.orderId && o.orderId.includes('113-2591563-2056216'));
      console.log('[GBV Extension] Similar orders found:', similarOrders.length);
      if (similarOrders.length > 0) {
        console.log('[GBV Extension] Similar orders:', similarOrders);
      }
    } else {
      console.log('[GBV Extension] No stored data found');
    }
  });
};

// Export the function for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { handleOrderAction, parseStreetAddress, addCSVReaderButton };
} 