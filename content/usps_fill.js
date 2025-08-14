// Set the timeout values for easier management
const addressSuggestion_WaitTime = 2000;
const apartmentFill_WaitTime = 500;
const packageType_WaitTime = 500;
const packageDimensions_WaitTime = 300;
const mainScript_WaitTime = 5000;

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
    let firstName = address[0]?.split(' ')[0] || '';
    let lastName = address[0]?.split(' ').slice(1).join(' ') || '';
    setValue('firstName', address[0]?.split(' ')[0] || '');
    if (lastName) {
      setValue('lastName', lastName);
    }
    else {
      setValue('lastName', '.');
    }
    
    // Get expected delivery and service price information
    const expectedDelivery = info.expectedDelivery;
    const currentServicePrice = info.currentServicePrice;

    let divInfo = document.querySelector('svg[title="Info Icon"]').parentNode.children[1];
    console.log('[GBV Extension] Get divInfo:', divInfo.innerHTML);
    //document.getElementById('addToCartButton').parentNode.parentNode.children[2];
    // Add expected delivery and service price to the divInfo
    divInfo.innerHTML += `<p>Address: ${address.join(', ')}</p><p>Expected Delivery: ${expectedDelivery}</p><p>Current Service Price: ${currentServicePrice}</p>`;

    // Package info
    console.log('[GBV Extension] Getting packageWeight:', info.packageWeight);
    if (info.packageWeight) {
      const weightMatch = info.packageWeight.match(/(\d+)\s*lbs?\s*(\d+(?:\.\d+)?)?\s*oz?/i);
      if (weightMatch) {
        console.log('[GBV Extension] Fill packageWeight:', info.packageWeight);
        setValue('weightLbs', Math.floor(Number(weightMatch[1])) || '');
        // If ozs is null/empty, fill 0
        let ozs = weightMatch[2];
        if (ozs === undefined || ozs === null || ozs === '' || isNaN(Number(ozs))) {
          ozs = 0;
        }
        setValue('weightOzs', Math.floor(Number(ozs)));
      }
    }

    // Set package type to Custom Packaging, then fill dimensions
    const packageTypeDropdownDiv = document.getElementById('packageTypeDropdown');
    const packageTypeButton = packageTypeDropdownDiv ? packageTypeDropdownDiv.querySelector('button') : null;

    
    // Fill reference numbers
    if (info.orderNumber) setValue('referenceNumber', info.orderNumber);
    if (info.itemInfo) setValue('referenceNumber2', info.itemInfo);

    // Log and display expected delivery and service price information
    if (info.expectedDelivery) {
      console.log('[GBV Extension] Expected Delivery:', info.expectedDelivery);
    }
    if (info.currentServicePrice) {
      console.log('[GBV Extension] Current Service Price:', info.currentServicePrice);
    }


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
            }, packageDimensions_WaitTime);
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
              console.log('[GBV Extension] List of suggestions:', items);
              let found = false;
              items.forEach(item => {
                if (item.textContent.includes(zipCode)) {
                  item.click();
                  found = true;
                  console.log('[GBV Extension] Picked address suggestion:', item.textContent.trim());
                }
              });
              if (!found) { // If no address suggestion matches zip code, pick the correct State element
                console.log('[GBV Extension] No address suggestion matches zip code:', zipCode);

                // Pick the correct State element
                const stateInput = document.querySelector('#state');
                if (stateInput && address[4]) {
                  const stateValue = address[4].trim();
                  console.log('[GBV Extension] Looking for state:', stateValue);
                  
                  // Get all options in the state combobox
                  const options = Array.from(stateInput.querySelectorAll('option'));
                  let selectedOption = null;
                  
                  // Try to find matching option by comparing with both state code and state name
                  for (const option of options) {
                    const optionText = option.textContent.trim();
                    console.log('[GBV Extension] Checking option:', optionText);
                    
                    // Check if the option text contains the state value (case insensitive)
                    if (optionText.toLowerCase().includes(stateValue.toLowerCase())) {
                      selectedOption = option;
                      console.log('[GBV Extension] Found matching state option:', optionText);
                      break;
                    }
                    
                    // Also check if the state value contains any part of the option text
                    const optionParts = optionText.split(' - ');
                    if (optionParts.length >= 2) {
                      const stateCode = optionParts[0].trim();
                      const stateName = optionParts[1].trim();
                      
                      if (stateValue.toLowerCase() === stateCode.toLowerCase() || 
                          stateValue.toLowerCase() === stateName.toLowerCase()) {
                        selectedOption = option;
                        console.log('[GBV Extension] Found matching state option:', optionText);
                        break;
                      }
                    }
                  }
                  
                  if (selectedOption) {
                    stateInput.value = selectedOption.value;
                    stateInput.dispatchEvent(new Event('change', { bubbles: true }));
                    console.log('[GBV Extension] Selected state:', selectedOption.textContent);
                  } else {
                    console.log('[GBV Extension] No matching state found for:', stateValue);
                  }
                }
                
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
            }, apartmentFill_WaitTime);
            // After all data is filled, click the getRatesButton
            setTimeout(() => {
              const getRatesBtn = document.getElementById('getRatesButton');
              if (getRatesBtn) {
                getRatesBtn.click();
                console.log('[GBV Extension] Clicked getRatesButton');
              } else {
                console.log('[GBV Extension] getRatesButton not found');
              }
            }, apartmentFill_WaitTime + 200); // Wait a bit after filling apartment/unit
          }, addressSuggestion_WaitTime);
        }      
      }, packageType_WaitTime);
    }
  });
}, mainScript_WaitTime); 