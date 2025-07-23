// Request shipping info from the background script
setTimeout(() => {
  chrome.runtime.sendMessage({ action: 'get_shipping_info' }, (response) => {
    if (!response || !response.shippingInfo) return;
    const info = response.shippingInfo;
    if (!info.shippingAddress || info.shippingAddress.length === 0) return;

    // Helper to set value by id if exists
    function setValue(id, value) {
      const el = document.getElementById(id);
      if (el) {
        el.value = value;
        el.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }

    // Parse address fields
    const address = info.shippingAddress;
    setValue('firstName', address[0]?.split(' ')[0] || '');
    setValue('lastName', address[0]?.split(' ').slice(1).join(' ') || '');
    const streetInput = document.querySelector("#root > main > div > div.row > div:nth-child(1) > div:nth-child(4) > div > div:nth-child(7) > div.col-md-9.col-12 > div > div:nth-child(1) > input.rbt-input-main.form-control.rbt-input.undefined");
    if (streetInput) {
      streetInput.value = address[1] || '';
      streetInput.dispatchEvent(new Event('input', { bubbles: true }));
    }
    setValue('city', address[2] || '');
    setValue('state', address[3] || '');
    setValue('zipCode', address[4] || '');

    // Package info
    if (info.packageWeight) {
      const weightMatch = info.packageWeight.match(/(\d+)\s*lbs?\s*(\d+)?\s*oz?/i);
      if (weightMatch) {
        setValue('weightLbs', weightMatch[1] || '');
        setValue('weightOzs', weightMatch[2] || '');
      }
    }
    if (info.packageDimensions) {
      // Parse and round down dimensions: e.g., '17.5 x 14 x 10 in'
      const dimMatch = info.packageDimensions.match(/([\d.]+)\s*x\s*([\d.]+)\s*x\s*([\d.]+)/i);
      if (dimMatch) {
        setValue('length', Math.floor(Number(dimMatch[1])) || '');
        setValue('width', Math.floor(Number(dimMatch[2])) || '');
        setValue('height', Math.floor(Number(dimMatch[3])) || '');
      }
    }

    // Fill reference numbers
    if (info.orderNumber) setValue('referenceNumber', info.orderNumber);
    if (info.itemInfo) setValue('referenceNumber2', info.itemInfo);
  });
}, 10000); 