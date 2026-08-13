// buy.js - Two-step workflow: Select Product → Enter Transaction Details

document.addEventListener('DOMContentLoaded', () => {
    // Views
    const productSelectionView = document.getElementById('productSelectionView');
    const transactionView = document.getElementById('transactionView');
    const backButton = document.getElementById('backButton');
    
    // Product grid
    const productsGrid = document.getElementById('productsGrid');
    const noProductsMsg = document.getElementById('noProductsMsg');
    const categoryHeading = document.getElementById('categoryHeading');
    
    // Transaction form
    const selectedProductPreview = document.getElementById('selectedProductPreview');
    const quantityInput = document.getElementById('quantity');
    const priceInput = document.getElementById('purchasePrice');
    const totalCostInput = document.getElementById('totalCost');
    const buyForm = document.getElementById('buyForm');
    const recentPurchasesDiv = document.getElementById('recentPurchases');
    
    let currentCategoryFilter = '';
    let selectedProduct = null;
    
    // Category filter pills
    const categoryPills = document.querySelectorAll('.category-filter-pill');
    categoryPills.forEach(pill => {
        pill.addEventListener('click', () => {
            categoryPills.forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            currentCategoryFilter = pill.dataset.category || '';
            categoryHeading.textContent = pill.textContent.trim();
            loadProductsGrid();
        });
    });
    
    // Back button
    backButton.addEventListener('click', () => {
        showProductSelection();
    });
    
    // Initialize
    showProductSelection();
    loadRecentPurchases();
    
    // STEP 1: Show product selection grid
    function showProductSelection() {
        productSelectionView.style.display = 'block';
        transactionView.classList.remove('active');
        selectedProduct = null;
        loadProductsGrid();
    }
    
    // STEP 2: Show transaction form
    function showTransactionForm(product) {
        selectedProduct = product;
        productSelectionView.style.display = 'none';
        transactionView.classList.add('active');
        
        // Show selected product preview
        const stock = product.currentStock ?? product.stock ?? 0;
        
        selectedProductPreview.innerHTML = `
            <h4>${product.name}</h4>
            <div class="meta">
                SKU: ${product.sku} | Current Stock: ${stock} ${product.unit}
            </div>
        `;
        
        // Reset form
        buyForm.reset();
        totalCostInput.value = '';
        
        // Scroll to top
        window.scrollTo(0, 0);
    }
    
    // Load products into grid
    function loadProductsGrid() {
        let products = Storage.get('products') || [];
        
        // Filter by category
        if (currentCategoryFilter) {
            products = products.filter(p => p.category === currentCategoryFilter);
        }
        
        productsGrid.innerHTML = '';
        
        if (products.length === 0) {
            noProductsMsg.classList.remove('hidden');
            noProductsMsg.textContent = currentCategoryFilter 
                ? 'No products in this category.' 
                : 'No products available. Add products first.';
            return;
        }
        
        noProductsMsg.classList.add('hidden');
        
        products.forEach(product => {
            const stock = product.currentStock ?? product.stock ?? 0;
            
            const card = document.createElement('div');
            card.className = 'product-card';
            card.onclick = () => showTransactionForm(product);
            
            const imageHTML = product.image 
                ? `<div class="product-card-media"><img src="${product.image}" alt="${product.name}" onerror="this.parentElement.style.display='none'"></div>`
                : '';
            
            card.innerHTML = `
                ${imageHTML}
                <div class="product-card-body">
                    <div class="product-card-title">${product.name}</div>
                    <div class="product-card-sku">SKU: ${product.sku}</div>
                    <div class="product-card-stock">
                        <div class="stock-info">
                            <span>Current Stock</span>
                            <span class="stock-qty">${stock} ${product.unit}</span>
                        </div>
                    </div>
                </div>
            `;
            
            if (!product.image) {
                card.querySelector('.product-card-body').style.paddingTop = '16px';
            }
            
            productsGrid.appendChild(card);
        });
    }
    
    // Calculate total cost
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
        
        if (!selectedProduct) {
            showToast('No product selected', 'error');
            return;
        }
        
        const quantity = Number(quantityInput.value);
        const purchasePrice = Number(priceInput.value);
        const supplier = document.getElementById('supplier').value.trim();
        const notes = document.getElementById('notes').value.trim();
        
        if (!quantity || quantity <= 0) {
            showToast('Please enter a valid quantity', 'error');
            return;
        }
        
        if (purchasePrice < 0) {
            showToast('Please enter a valid purchase price', 'error');
            return;
        }
        
        const currentStock = selectedProduct.currentStock ?? selectedProduct.stock ?? 0;
        const newStock = currentStock + quantity;
        
        // Update stock
        let products = Storage.get('products') || [];
        const productIndex = products.findIndex(p => p.id === selectedProduct.id);
        if (productIndex !== -1) {
            products[productIndex].currentStock = newStock;
            products[productIndex].stock = newStock;
            Storage.set('products', products);
        }
        
        // Save purchase
        const purchase = {
            id: Date.now().toString(),
            productId: selectedProduct.id,
            productName: selectedProduct.name,
            sku: selectedProduct.sku,
            quantity: quantity,
            purchasePrice: purchasePrice,
            totalCost: quantity * purchasePrice,
            supplier: supplier,
            notes: notes,
            date: new Date().toISOString()
        };
        
        let purchases = Storage.get('purchases') || [];
        purchases.unshift(purchase);
        Storage.set('purchases', purchases);
        
        showToast(`Purchase completed! Stock updated to ${newStock} ${selectedProduct.unit}`, 'success');
        
        loadRecentPurchases();
        showProductSelection();
    });
    
    // Load recent purchases
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
                    ${p.supplier ? `| Supplier: ${p.supplier}` : ''}
                    <br>
                    ${new Date(p.date).toLocaleString()}
                </div>
            `;
            recentPurchasesDiv.appendChild(div);
        });
    }
});
