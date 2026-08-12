// buy.js

document.addEventListener('DOMContentLoaded', () => {
    const productSelect = document.getElementById('productSelect');
    const quantityInput = document.getElementById('quantity');
    const priceInput = document.getElementById('purchasePrice');
    const totalCostInput = document.getElementById('totalCost');
    const buyForm = document.getElementById('buyForm');
    const recentPurchasesDiv = document.getElementById('recentPurchases');

    // Load products into dropdown
    loadProductsDropdown();
    loadRecentPurchases();

    // Calculate total cost automatically
    function calculateTotal() {
        const qty = Number(quantityInput.value) || 0;
        const price = Number(priceInput.value) || 0;
        totalCostInput.value = '₹' + (qty * price).toFixed(2);
    }

    quantityInput.addEventListener('input', calculateTotal);
    priceInput.addEventListener('input', calculateTotal);

    // Handle form submit
    buyForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const productId = productSelect.value;
        const quantity = Number(quantityInput.value);
        const purchasePrice = Number(priceInput.value);
        const supplier = document.getElementById('supplier').value.trim();
        const notes = document.getElementById('notes').value.trim();

        if (!productId || quantity <= 0 || purchasePrice < 0) {
            showToast('Please fill all required fields correctly', 'error');
            return;
        }

        // Get products
        let products = Storage.get('products') || [];
        const productIndex = products.findIndex(p => p.id === productId);

        if (productIndex === -1) {
            showToast('Product not found', 'error');
            return;
        }

        // Update stock
        const currentStockValue = (products[productIndex].currentStock ?? products[productIndex].stock ?? 0) + quantity;
        products[productIndex].currentStock = currentStockValue;
        products[productIndex].stock = currentStockValue;
        Storage.set('products', products);

        // Save purchase record
        const purchase = {
            id: Date.now().toString(),
            productId: productId,
            productName: products[productIndex].name,
            sku: products[productIndex].sku,
            quantity: quantity,
            purchasePrice: purchasePrice,
            totalCost: quantity * purchasePrice,
            supplier: supplier,
            notes: notes,
            date: new Date().toISOString()
        };

        let purchases = Storage.get('purchases') || [];
        purchases.unshift(purchase); // add to beginning
        Storage.set('purchases', purchases);

        // Reset form
        buyForm.reset();
        totalCostInput.value = '';
        loadRecentPurchases();

        showToast('Purchase saved successfully! Stock updated.', 'success');
    });

    // Load products into select dropdown
    function loadProductsDropdown() {
        const products = Storage.get('products') || [];
        productSelect.innerHTML = '<option value="">-- Select Product --</option>';

        products.forEach(product => {
            const option = document.createElement('option');
            option.value = product.id;
            const displayStock = product.currentStock ?? product.stock ?? 0;
            option.textContent = `${product.name} (${product.sku}) - Stock: ${displayStock}`;
            productSelect.appendChild(option);
        });
    }

    // Show recent purchases
    function loadRecentPurchases() {
        const purchases = Storage.get('purchases') || [];

        if (purchases.length === 0) {
            recentPurchasesDiv.innerHTML = '<p class="empty-text">No purchases recorded yet.</p>';
            return;
        }

        recentPurchasesDiv.innerHTML = '';

        purchases.slice(0, 8).forEach(p => {
            const div = document.createElement('div');
            div.className = 'purchase-item';
            div.innerHTML = `
                <div class="title">${p.productName}</div>
                <div class="meta">
                    Qty: ${p.quantity} × ₹${p.purchasePrice.toFixed(2)} = ₹${p.totalCost.toFixed(2)}
                    <br>
                    ${new Date(p.date).toLocaleString()}
                </div>
            `;
            recentPurchasesDiv.appendChild(div);
        });
    }
});
