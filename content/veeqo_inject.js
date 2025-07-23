// Wait for the table to be present in the DOM
function addButtonsToSpacerColumn() {
  // Try to find the main orders table
  const table = document.querySelector('table');
  if (!table) return;

  // Find the index of the column with id 'datatable-header-spacer'
  const headerRow = table.querySelector('thead tr');
  if (!headerRow) return;
  const ths = Array.from(headerRow.children);
  const spacerIndex = ths.findIndex(th => th.id === 'datatable-header-spacer');
  if (spacerIndex === -1) return;

  // Add a button to each row in the spacer column
  const rows = table.querySelectorAll('tbody tr');
  rows.forEach(row => {
    const cells = row.children;
    if (cells.length > spacerIndex) {
      const cell = cells[spacerIndex];
      if (cell && !cell.querySelector('.gbv-extension-btn')) {
        const btn = document.createElement('button');
        btn.textContent = 'GBV Action';
        btn.className = 'gbv-extension-btn';
        btn.onclick = () => {
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
                  addressTd.querySelectorAll('.fs-exclude').forEach(div => {
                    const a = div.querySelector('a');
                    const text = a ? a.textContent.trim() : div.textContent.trim();
                    if (text) shippingAddress.push(text);
                  });
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
        };
        cell.appendChild(btn);
      }
    }
  });
}

// Observe for table changes (in case of dynamic loading)
const observer = new MutationObserver(() => {
  addButtonsToSpacerColumn();
});

observer.observe(document.body, { childList: true, subtree: true });

// Initial run in case table is already present
addButtonsToSpacerColumn(); 