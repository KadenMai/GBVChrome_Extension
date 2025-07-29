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
    
    

    // Package info
    if (info.packageWeight) {
      const weightMatch = info.packageWeight.match(/(\d+)\s*lbs?\s*(\d+)?\s*oz?/i);
      if (weightMatch) {
        setValue('weightLbs', weightMatch[1] || '');
        setValue('weightOzs', weightMatch[2] || '');
      }
    }

    // Set package type to Custom Packaging, then fill dimensions
    const packageTypeDropdownDiv = document.getElementById('packageTypeDropdown');
    const packageTypeButton = packageTypeDropdownDiv ? packageTypeDropdownDiv.querySelector('button') : null;

    
    // Fill reference numbers
    if (info.orderNumber) setValue('referenceNumber', info.orderNumber);
    if (info.itemInfo) setValue('referenceNumber2', info.itemInfo);


    setValue('city', address[3] || '');
    setValue('state', address[4] || '');
    // Extract only the first 5 digits for the zip code
    const zipFull = address[5] || '';
    const zipCode = zipFull.match(/\d{5}/) ? zipFull.match(/\d{5}/)[0] : zipFull;
    setValue('zipCode', zipCode);

    // Fill street address (address[1])
    const streetInput = document.querySelector("#root > main > div > div.row > div:nth-child(1) > div:nth-child(4) > div > div:nth-child(7) > div.col-md-9.col-12 > div > div:nth-child(1) > input.rbt-input-main.form-control.rbt-input.undefined");
    
    if (packageTypeButton) {
      packageTypeButton.click();
      console.log('[GBV Extension] Clicked packageTypeDropdown button');

      // Wait for the menu to appear, then select "Custom Packaging"
      setTimeout(() => {
        const dropdownMenu = packageTypeDropdownDiv.querySelector('div');
        if (dropdownMenu) {
          // Log the entire dropdown HTML for debugging
          console.log('[GBV Extension] Dropdown innerHTML:', dropdownMenu.innerHTML);
          // Log all dropdown items for debugging
          const items = Array.from(dropdownMenu.querySelectorAll('a.dropdown-item'));
          items.forEach((a, i) => {
            console.log(`[GBV Extension] Item ${i}:`, JSON.stringify(a.textContent.trim()));
          });
          // Use a more flexible match for "Custom Packaging"
          const customOption = items.find(a =>
            a.textContent.replace(/\s+/g, ' ').toLowerCase().includes('custom packaging')
          );
          if (customOption) {
            customOption.click();
            console.log('[GBV Extension] Clicked Custom Packaging option');

            // Wait a bit, then fill the package dimensions
            setTimeout(() => {
              if (info.packageDimensions) {
                const dimMatch = info.packageDimensions.match(/([\d.]+)\s*x\s*([\d.]+)\s*x\s*([\d.]+)/i);
                if (dimMatch) {
                  setValue('length', Math.floor(Number(dimMatch[1])) || '');
                  setValue('width', Math.floor(Number(dimMatch[2])) || '');
                  setValue('height', Math.floor(Number(dimMatch[3])) || '');
                  console.log('[GBV Extension] Filled package dimensions');
                }
              }
            }, 300);
          } else {
            console.log('[GBV Extension] Custom Packaging option not found');
          }
        } else {
          console.log('[GBV Extension] Dropdown menu not found');
        }

        // Fill street address (address[1])
        if (streetInput) {
          streetInput.value = address[1] || '';
          streetInput.dispatchEvent(new Event('input', { bubbles: true }));      
          // Wait 1000ms after filling street, then click packageTypeDropdown button
          setTimeout(() => {       
            // After filling street, pick the address suggestion that matches the 5-digit zip code
            const suggestionMenu = document.querySelector('#address-suggestion');
            if (suggestionMenu && zipCode) {
              const items = suggestionMenu.querySelectorAll('a.dropdown-item');
              let found = false;
              items.forEach(item => {
                if (item.textContent.includes(zipCode)) {
                  item.click();
                  found = true;
                  console.log('[GBV Extension] Picked address suggestion:', item.textContent.trim());
                }
              });
              if (!found) {
                console.log('[GBV Extension] No address suggestion matches zip code:', zipCode);
              }
            }
    
            // Wait 500ms after picking suggestion, then fill apartment/unit field if available (address[2])
            setTimeout(() => {
              if (address[2]) {
                const apartmentInput = document.querySelector('#streetAddress2') || document.querySelector('input[name="recipient.addressLine2"]');
                if (apartmentInput) {
                  apartmentInput.value = address[2];
                  apartmentInput.dispatchEvent(new Event('input', { bubbles: true }));
                  console.log('[GBV Extension] Filled apartment field:', address[2]);
                } else {
                  console.log('[GBV Extension] Apartment field not found, apartment info:', address[2]);
                }
              }
            }, 500);
          }, 1000);
        }      
      }, 300);
    }
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
  });
}, 3000); 