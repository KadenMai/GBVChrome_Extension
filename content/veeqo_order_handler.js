// Order handling functionality for Veeqo extension

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

  if (orderBtn) {
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

      const shippingInfo = {
        orderNumber,
        itemInfo: sku_info,
        orderId,
        shippingAddress,
        packageWeight: pkgWeight,
        packageDimensions: pkgDimensionsFromRow,
      };

      // Show alert with all info, including sku_info
      alert(
        `Order Number: ${orderNumber}\n` +
        `Order Id: ${orderId}\n` +
        `Shipping Address: ${shippingAddress ? shippingAddress.join(', ') : ''}\n` +
        `Package Weight: ${pkgWeight}\n` +
        `Package Dimensions: ${pkgDimensionsFromRow}\n` +
        `SKU Info: ${sku_info}`
      );

      // Open USPS label manager in a new tab and send shipping info
      chrome.runtime.sendMessage({ action: 'open_usps_label_tab', shippingInfo });
    }, 1000); // Adjust timeout as needed for page load
  } else {
    alert('Order number button not found in this row or any previous rows.');
  }
}

// Export the function for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { handleOrderAction, parseStreetAddress };
} 