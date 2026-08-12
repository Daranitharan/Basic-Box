// sell.js

document.addEventListener('DOMContentLoaded', () => {
    const productSelect = document.getElementById('productSelect');
    const stockHint = document.getElementById('stockHint');
    const quantityInput = document.getElementById('quantity');
    const priceInput = document.getElementById('sellingPrice');
    const totalAmountInput = document.getElementById('totalAmount');
    const estimatedProfitInput = document.getElementById('estimatedProfit');
    const sellForm = document.getElementById('sellForm');
    const recentSalesDiv = document.getElementById('recentSales');

    let selectedProduct = null;

    // Load products into dropdown
    loadProductsDropdown();
    loadRecentSales();

    // Get the latest purchase price for a product (buy records are stored newest-first)
    function getLatestPurchasePrice(productId) {
        const purchases = Storage.get('purchases') || [];
        const productPurchases = purchases.filter(p => p.productId === productId);
        return productPurchases.length > 0 ? productPurchases[0].purchasePrice : 0;
    }

    // Recalculate totals whenever inputs change
    function calculateTotals() {
        const qty = Number(quantityInput.value) || 0;
        const price = Number(priceInput.value) || 0;

        totalAmountInput.value = '₹' + (qty * price).toFixed(2);

        if (selectedProduct) {
            const costPrice = getLatestPurchasePrice(selectedProduct.id);
            const profit = (price - costPrice) * qty;
            estimatedProfitInput.value = '₹' + profit.toFixed(2);
        }
    }

    quantityInput.addEventListener('input', calculateTotals);
    priceInput.addEventListener('input', calculateTotals);

    // Show stock info when a product is selected
    productSelect.addEventListener('change', () => {
        const productId = productSelect.value;
        const products = Storage.get('products') || [];
        selectedProduct = products.find(p => p.id === productId) || null;

        if (selectedProduct) {
            const displayStock = selectedProduct.currentStock ?? selectedProduct.stock ?? 0;
            stockHint.textContent = `Available stock: ${displayStock} ${selectedProduct.unit}`;
            const costPrice = getLatestPurchasePrice(selectedProduct.id);
            if (costPrice > 0) {
                stockHint.textContent += ` | Cost price: ₹${costPrice.toFixed(2)}`;
            }
            const price = Number(priceInput.value) || 0;
            const qty = Number(quantityInput.value) || 0;
            estimatedProfitInput.value = '₹' + ((price - costPrice) * qty).toFixed(2);
        } else {
            stockHint.textContent = '';
            estimatedProfitInput.value = '';
        }

        calculateTotals();
    });

    // Handle form submit
    sellForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const productId = productSelect.value;
        const quantity = Number(quantityInput.value);
        const sellingPrice = Number(priceInput.value);
        const customer = document.getElementById('customer').value.trim();
        const notes = document.getElementById('notes').value.trim();

        if (!productId || !selectedProduct) {
            showToast('Please select a product', 'error');
            return;
        }

        if (!quantity || quantity <= 0) {
            showToast('Please enter a valid quantity', 'error');
            return;
        }

        const availableSaleStock = selectedProduct.currentStock ?? selectedProduct.stock ?? 0;
        if (quantity > availableSaleStock) {
            showToast(`Insufficient stock! Only ${availableSaleStock} ${selectedProduct.unit} available.`, 'error');
            return;
        }

        const costPrice = getLatestPurchasePrice(productId);
        const totalAmount = quantity * sellingPrice;
        const profit = (sellingPrice - costPrice) * quantity;

        // Decrement stock
        let products = Storage.get('products') || [];
        const productIndex = products.findIndex(p => p.id === productId);
        if (productIndex !== -1) {
            const currentStockValue = (products[productIndex].currentStock ?? products[productIndex].stock ?? 0) - quantity;
            products[productIndex].currentStock = currentStockValue;
            products[productIndex].stock = currentStockValue;
            Storage.set('products', products);
        }

        // Save sale record
        const sale = {
            id: Date.now().toString(),
            productId: productId,
            productName: selectedProduct.name,
            sku: selectedProduct.sku,
            quantity: quantity,
            sellingPrice: sellingPrice,
            totalAmount: totalAmount,
            costPrice: costPrice,
            profit: profit,
            customer: customer,
            notes: notes,
            date: new Date().toISOString()
        };

        let sales = Storage.get('sales') || [];
        sales.unshift(sale); // add to beginning
        Storage.set('sales', sales);

        // Reset form
        sellForm.reset();
        totalAmountInput.value = '';
        estimatedProfitInput.value = '';
        stockHint.textContent = '';
        selectedProduct = null;
        loadProductsDropdown();
        loadRecentSales();

        const profitText = profit >= 0 ? `₹${profit.toFixed(2)} profit` : `₹${Math.abs(profit).toFixed(2)} loss`;
        showToast(`Sale saved successfully! ${profitText}.`, 'success');
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

        stockHint.textContent = '';
    }

    // Show recent sales
    function loadRecentSales() {
        const sales = Storage.get('sales') || [];

        if (sales.length === 0) {
            recentSalesDiv.innerHTML = '<p class="empty-text">No sales recorded yet.</p>';
            return;
        }

        recentSalesDiv.innerHTML = '';

        sales.slice(0, 8).forEach(s => {
            const div = document.createElement('div');
            div.className = 'purchase-item';

            const profit = s.profit || 0;
            const profitClass = profit >= 0 ? 'profit-positive' : 'profit-negative';
            const profitLabel = profit >= 0 ? 'Profit' : 'Loss';

            div.innerHTML = `
                <div class="title">${s.productName}</div>
                <div class="meta">
                    Qty: ${s.quantity} × ₹${s.sellingPrice.toFixed(2)} = ₹${s.totalAmount.toFixed(2)}
                    <span class="${profitClass}"> ${profitLabel}: ₹${Math.abs(profit).toFixed(2)}</span>
                    <br>
                    ${new Date(s.date).toLocaleString()}
                </div>
            `;
            recentSalesDiv.appendChild(div);
        });
    }
});
