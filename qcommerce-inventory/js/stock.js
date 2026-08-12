// stock.js

document.addEventListener('DOMContentLoaded', () => {
    const purchaseProductSelect = document.getElementById('purchaseProductSelect');
    const purchaseQuantity = document.getElementById('purchaseQuantity');
    const purchasePrice = document.getElementById('purchasePrice');
    const purchaseTotalCost = document.getElementById('purchaseTotalCost');
    const purchaseForm = document.getElementById('purchaseForm');
    const purchasePreview = document.getElementById('purchasePreview');

    const saleProductSelect = document.getElementById('saleProductSelect');
    const saleQuantity = document.getElementById('saleQuantity');
    const salePrice = document.getElementById('salePrice');
    const saleTotalAmount = document.getElementById('saleTotalAmount');
    const saleEstimatedProfit = document.getElementById('saleEstimatedProfit');
    const saleForm = document.getElementById('saleForm');
    const stockHint = document.getElementById('stockHint');
    const salePreview = document.getElementById('salePreview');

    const recentPurchasesDiv = document.getElementById('recentPurchases');
    const recentSalesDiv = document.getElementById('recentSales');

    let selectedSaleProduct = null;

    loadProductsDropdown();
    loadRecentPurchases();
    loadRecentSales();

    function calculatePurchaseTotal() {
        const qty = Number(purchaseQuantity.value) || 0;
        const price = Number(purchasePrice.value) || 0;
        purchaseTotalCost.value = '₹' + (qty * price).toFixed(2);
    }

    function calculateSaleTotals() {
        const qty = Number(saleQuantity.value) || 0;
        const price = Number(salePrice.value) || 0;
        saleTotalAmount.value = '₹' + (qty * price).toFixed(2);

        if (selectedSaleProduct) {
            const costPrice = getLatestPurchasePrice(selectedSaleProduct.id);
            const profit = (price - costPrice) * qty;
            saleEstimatedProfit.value = '₹' + profit.toFixed(2);
        }
    }

    purchaseQuantity.addEventListener('input', calculatePurchaseTotal);
    purchasePrice.addEventListener('input', calculatePurchaseTotal);
    saleQuantity.addEventListener('input', calculateSaleTotals);
    salePrice.addEventListener('input', calculateSaleTotals);

    purchaseForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const productId = purchaseProductSelect.value;
        const quantity = Number(purchaseQuantity.value);
        const price = Number(purchasePrice.value);
        const supplier = document.getElementById('purchaseSupplier').value.trim();
        const notes = document.getElementById('purchaseNotes').value.trim();

        if (!productId || quantity <= 0 || price < 0) {
            showToast('Please fill all required fields correctly', 'error');
            return;
        }

        let products = Storage.get('products') || [];
        const productIndex = products.findIndex(p => p.id === productId);
        if (productIndex === -1) {
            showToast('Product not found', 'error');
            return;
        }

        const currentStockValue = (products[productIndex].currentStock ?? products[productIndex].stock ?? 0) + quantity;
        products[productIndex].currentStock = currentStockValue;
        products[productIndex].stock = currentStockValue;
        Storage.set('products', products);

        const purchase = {
            id: Date.now().toString(),
            productId,
            productName: products[productIndex].name,
            sku: products[productIndex].sku,
            quantity,
            purchasePrice: price,
            totalCost: quantity * price,
            supplier,
            notes,
            date: new Date().toISOString()
        };

        const purchases = Storage.get('purchases') || [];
        purchases.unshift(purchase);
        Storage.set('purchases', purchases);

        purchaseForm.reset();
        purchaseTotalCost.value = '';
        loadProductsDropdown();
        loadRecentPurchases();
        showToast('Purchase saved successfully! Stock updated.', 'success');
    });

    saleProductSelect.addEventListener('change', () => {
        const productId = saleProductSelect.value;
        const products = Storage.get('products') || [];
        selectedSaleProduct = products.find(p => p.id === productId) || null;

        if (selectedSaleProduct) {
            const availableStock = selectedSaleProduct.currentStock ?? selectedSaleProduct.stock ?? 0;
            stockHint.textContent = `Available stock: ${availableStock} ${selectedSaleProduct.unit}`;
            const costPrice = getLatestPurchasePrice(selectedSaleProduct.id);
            if (costPrice > 0) {
                stockHint.textContent += ` | Cost price: ₹${costPrice.toFixed(2)}`;
            }
            salePreview.innerHTML = `<div class="product-preview-card"><strong>${selectedSaleProduct.name}</strong><span>${selectedSaleProduct.sku}</span></div>`;
        } else {
            stockHint.textContent = '';
            salePreview.innerHTML = '';
        }
        calculateSaleTotals();
    });

    saleForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const productId = saleProductSelect.value;
        const quantity = Number(saleQuantity.value);
        const price = Number(salePrice.value);
        const customer = document.getElementById('saleCustomer').value.trim();
        const notes = document.getElementById('saleNotes').value.trim();

        if (!productId || !selectedSaleProduct) {
            showToast('Please select a product', 'error');
            return;
        }
        if (quantity <= 0) {
            showToast('Please enter a valid quantity', 'error');
            return;
        }
        const availableSaleStock = selectedSaleProduct.currentStock ?? selectedSaleProduct.stock ?? 0;
        if (quantity > availableSaleStock) {
            showToast(`Insufficient stock! Only ${availableSaleStock} ${selectedSaleProduct.unit} available.`, 'error');
            return;
        }

        const costPrice = getLatestPurchasePrice(productId);
        const totalAmount = quantity * price;
        const profit = (price - costPrice) * quantity;

        let products = Storage.get('products') || [];
        const productIndex = products.findIndex(p => p.id === productId);
        if (productIndex !== -1) {
            const currentStockValue = (products[productIndex].currentStock ?? products[productIndex].stock ?? 0) - quantity;
            products[productIndex].currentStock = currentStockValue;
            products[productIndex].stock = currentStockValue;
            Storage.set('products', products);
        }

        const sale = {
            id: Date.now().toString(),
            productId,
            productName: selectedSaleProduct.name,
            sku: selectedSaleProduct.sku,
            quantity,
            sellingPrice: price,
            totalAmount,
            costPrice,
            profit,
            customer,
            notes,
            date: new Date().toISOString()
        };

        const sales = Storage.get('sales') || [];
        sales.unshift(sale);
        Storage.set('sales', sales);

        saleForm.reset();
        saleTotalAmount.value = '';
        saleEstimatedProfit.value = '';
        stockHint.textContent = '';
        selectedSaleProduct = null;
        salePreview.innerHTML = '';
        loadProductsDropdown();
        loadRecentSales();

        showToast(`Sale saved successfully! ${profit >= 0 ? `₹${profit.toFixed(2)} profit` : `₹${Math.abs(profit).toFixed(2)} loss`}.`, 'success');
    });

    function getLatestPurchasePrice(productId) {
        const purchases = Storage.get('purchases') || [];
        const productPurchases = purchases.filter(p => p.productId === productId);
        return productPurchases.length > 0 ? productPurchases[0].purchasePrice : 0;
    }

    function loadProductsDropdown() {
        const products = Storage.get('products') || [];
        purchaseProductSelect.innerHTML = '<option value="">-- Select Product --</option>';
        saleProductSelect.innerHTML = '<option value="">-- Select Product --</option>';

        products.forEach(product => {
            const displayStock = product.currentStock ?? product.stock ?? 0;
            const displayText = `${product.name} (${product.sku}) - Stock: ${displayStock}`;
            const purchaseOption = document.createElement('option');
            purchaseOption.value = product.id;
            purchaseOption.textContent = displayText;
            purchaseProductSelect.appendChild(purchaseOption);

            const saleOption = document.createElement('option');
            saleOption.value = product.id;
            saleOption.textContent = displayText;
            saleProductSelect.appendChild(saleOption);
        });
    }

    function loadRecentPurchases() {
        const purchases = Storage.get('purchases') || [];
        if (purchases.length === 0) {
            recentPurchasesDiv.innerHTML = '<p class="empty-text">No purchases recorded yet.</p>';
            return;
        }
        recentPurchasesDiv.innerHTML = '';
        purchases.slice(0, 8).forEach(p => {
            const item = document.createElement('div');
            item.className = 'purchase-item';
            item.innerHTML = `
                <div class="title">${p.productName}</div>
                <div class="meta">
                    Qty: ${p.quantity} × ₹${p.purchasePrice.toFixed(2)} = ₹${p.totalCost.toFixed(2)}
                    <br>
                    ${new Date(p.date).toLocaleString()}
                </div>
            `;
            recentPurchasesDiv.appendChild(item);
        });
    }

    function loadRecentSales() {
        const sales = Storage.get('sales') || [];
        if (sales.length === 0) {
            recentSalesDiv.innerHTML = '<p class="empty-text">No sales recorded yet.</p>';
            return;
        }
        recentSalesDiv.innerHTML = '';
        sales.slice(0, 8).forEach(s => {
            const item = document.createElement('div');
            item.className = 'purchase-item';
            item.innerHTML = `
                <div class="title">${s.productName}</div>
                <div class="meta">
                    Qty: ${s.quantity} × ₹${s.sellingPrice.toFixed(2)} = ₹${s.totalAmount.toFixed(2)}
                    <span class="${s.profit >= 0 ? 'profit-positive' : 'profit-negative'}">
                        ${s.profit >= 0 ? 'Profit' : 'Loss'}: ₹${Math.abs(s.profit).toFixed(2)}
                    </span>
                    <br>
                    ${new Date(s.date).toLocaleString()}
                </div>
            `;
            recentSalesDiv.appendChild(item);
        });
    }
});
