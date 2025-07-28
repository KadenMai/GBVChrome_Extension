let lastShippingInfo = null;

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'open_usps_label_tab') {
    // Store the shipping info if present
    if (request.shippingInfo) {
      lastShippingInfo = request.shippingInfo;
    }
    chrome.tabs.create({ url: 'https://cnsb.usps.com/label-manager/new-label/quick' });
  }
  if (request.action === 'get_shipping_info') {
    sendResponse({ shippingInfo: lastShippingInfo });
  }
  if (request.action === 'open_amazon_tab') {
    // Open Amazon tab with the provided URL
    chrome.tabs.create({ url: request.url });
  }
}); 