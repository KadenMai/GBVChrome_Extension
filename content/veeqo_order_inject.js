// Content script for Veeqo order details page (Veeqo-order.mhtml)
(function() {
  // Helper: Run callback on URL change (SPA navigation)
  function onUrlChange(callback) {
    let lastUrl = location.href;
    new MutationObserver(() => {
      const url = location.href;
      if (url !== lastUrl) {
        lastUrl = url;
        callback(url);
      }
    }).observe(document, {subtree: true, childList: true});
  }

  // Wait for the tables to be present before running extraction
  function waitForTablesAndProcess() {
    const observer = new MutationObserver(() => {
      const orderTable = document.querySelector('table.vq2-table');
      const addressTable = document.querySelector('table.order-details-table');
      if (orderTable && addressTable) {
        console.log('[GBV] Both tables found, running processOrderDetails');
        observer.disconnect();
        processOrderDetails();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    // Initial check in case tables are already present
    if (document.querySelector('table.vq2-table') && document.querySelector('table.order-details-table')) {
      console.log('[GBV] Both tables already present, running processOrderDetails');
      processOrderDetails();
    }
  }

  // Main extraction logic
  function processOrderDetails() {
    console.log('[GBV] processOrderDetails called');
    // Extract Order Number (button text)
    const orderBtn = document.querySelector('button[class*="act-react-listing-row-item-name"]');
    const orderNumber = orderBtn ? orderBtn.textContent.trim() : '';
    console.log('[GBV] orderNumber:', orderNumber);

    // Extract SKU and QTY from the vq2-table
    let sku_info = '';
    const orderTable = document.querySelector('table.vq2-table');
    if (orderTable) {
      console.log('[GBV] Found vq2-table');
      // Use fixed indices if known, or find dynamically
      const skuIndex = 1;
      const qtyIndex = 2;
      const firstRow = orderTable.querySelector('tbody tr');
      if (firstRow) {
        const cells = firstRow.querySelectorAll('td');
        let sku = '', qty = '';
        if (skuIndex >= 0 && cells[skuIndex]) {
          const span = cells[skuIndex].querySelector('span');
          sku = span ? span.textContent.trim() : cells[skuIndex].textContent.trim();
        }
        if (qtyIndex >= 0 && cells[qtyIndex]) {
          qty = cells[qtyIndex].textContent.trim();
        }
        if (sku && qty) {
          sku_info = `${qty} x ${sku}`;
        }
        console.log('[GBV] sku:', sku, 'qty:', qty, 'sku_info:', sku_info);
      } else {
        console.log('[GBV] No first row in vq2-table');
      }
    } else {
      console.log('[GBV] vq2-table not found');
    }

    // Extract Order Id
    const orderRow = document.querySelector('tr[class*="order_"]');
    let orderId = null;
    if (orderRow) {
      const match = orderRow.className.match(/order_(\d+)/);
      if (match) orderId = match[1];
    }
    console.log('[GBV] orderId:', orderId);

    // Extract Shipping Address from order-details-table
    const addressTable = document.querySelector('table.order-details-table');
    let shippingAddress = [];
    if (addressTable) {
      console.log('[GBV] Found order-details-table');
      const addressTd = addressTable.querySelector('td.order-summary-address-details');
      if (addressTd) {
        addressTd.querySelectorAll('.fs-exclude').forEach(div => {
          const a = div.querySelector('a');
          const text = a ? a.textContent.trim() : div.textContent.trim();
          if (text) shippingAddress.push(text);
        });
      }
      console.log('[GBV] shippingAddress:', shippingAddress);
    } else {
      console.log('[GBV] order-details-table not found');
    }

    // Extract Package Weight and Dimensions
    let pkgDimensions = '';
    const pkgBtn = document.querySelector('button.packages_options_button');
    if (pkgBtn) {
      pkgDimensions = pkgBtn.querySelector('.package__dimensions')?.textContent.trim() || '';
    }

    // Extract package weight from the correct class
    let pkgWeight = '';
    const weightSpan = document.querySelector('span.productDimensions.package__weight');
    if (weightSpan) {
      pkgWeight = weightSpan.textContent.trim();
    }
    // Extract package dimensions from the correct class
    let pkgDimensionsFromRow = '';
    const dimSpan = document.querySelector('span.productDimensions.package__dimensions');
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
    console.log('[GBV] shippingInfo:', shippingInfo);

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
  }

  // Initial run if already on an order details page
  if (/\/orders\//.test(location.pathname)) {
    waitForTablesAndProcess();
  }

  // Listen for SPA navigation
  onUrlChange((url) => {
    if (/\/orders\//.test(url)) {
      waitForTablesAndProcess();
    }
  });
})(); 