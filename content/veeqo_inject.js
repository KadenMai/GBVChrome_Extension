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
        btn.onclick = () => handleOrderAction(row);
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