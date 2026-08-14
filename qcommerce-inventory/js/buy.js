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
    
    // Category filter dropdown
    const categoryFilterTrigger = document.getElementById('categoryFilterTrigger');
    const categoryFilterDropdown = document.getElementById('categoryFilterDropdown');
    const categoryOptions = document.querySelectorAll('.category-option-filter');
    const categoryArrow = document.querySelector('.category-filter-arrow');
    
    // Toggle dropdown
    if (categoryFilterTrigger) {
        categoryFilterTrigger.addEventListener('click', () => {
            const isOpen = categoryFilterDropdown.classList.contains('open');
            if (isOpen) {
                categoryFilterDropdown.classList.remove('open');
                categoryFilterTrigger.classList.remove('open');
                if (categoryArrow) categoryArrow.classList.remove('rotated');
            } else {
                categoryFilterDropdown.classList.add('open');
                categoryFilterTrigger.classList.add('open');
                if (categoryArrow) categoryArrow.classList.add('rotated');
            }
        });
    }
    
    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (categoryFilterTrigger && categoryFilterDropdown) {
            if (!categoryFilterTrigger.contains(e.target) && !categoryFilterDropdown.contains(e.target)) {
                categoryFilterDropdown.classList.remove('open');
                categoryFilterTrigger.classList.remove('open');
                if (categoryArrow) categoryArrow.classList.remove('rotated');
            }
        }
    });
    
    // Handle category selection
    categoryOptions.forEach(option => {
        option.addEventListener('click', () => {
            categoryOptions.forEach(o => o.classList.remove('active'));
            option.classList.add('active');
            currentCategoryFilter = option.dataset.category || '';
            categoryHeading.textContent = option.textContent.trim();
            
            // Update trigger text
            if (categoryFilterTrigger) {
                const selectedDisplay = categoryFilterTrigger.querySelector('.selected-category-display');
                if (selectedDisplay) {
                    selectedDisplay.innerHTML = option.innerHTML;
                }
            }
            
            // Close dropdown
            categoryFilterDropdown.classList.remove('open');
            categoryFilterTrigger.classList.remove('open');
            if (categoryArrow) categoryArrow.classList.remove('rotated');
            
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

    // Product grid search
    const productGridSearch = document.getElementById('productGridSearch');
    if (productGridSearch) {
        productGridSearch.addEventListener('input', () => loadProductsGrid());
    }
    
    // STEP 1: Show product selection grid
    function showProductSelection() {
        productSelectionView.style.display = 'block';
        transactionView.classList.remove('active');
        selectedProduct = null;
        loadProductsGrid();
    }
    
    // STEP 2: Show transaction form
    async function showTransactionForm(product) {
        selectedProduct = product;
        productSelectionView.style.display = 'none';
        transactionView.classList.add('active');

        // Fetch latest purchase price for this product
        const purchases = await DB.getPurchases();
        const prevPurchases = purchases
            .filter(p => p.productId === product.id)
            .sort((a, b) => new Date(b.date) - new Date(a.date));
        const lastPrice = prevPurchases.length > 0 ? Number(prevPurchases[0].purchasePrice) : 0;

        const stock = product.currentStock ?? product.stock ?? 0;
        selectedProductPreview.innerHTML = `
            <h4>${product.name}</h4>
            <div class="meta">
                SKU: ${product.sku} | Current Stock: ${stock} ${product.unit}
                ${lastPrice > 0 ? `| <strong>Last Bought: ₹${lastPrice.toFixed(2)}</strong>` : ''}
            </div>
        `;

        // Reset form
        buyForm.reset();
        totalCostInput.value = '';

        // Load recent purchases for THIS product
        await loadRecentPurchases(product.id);

        window.scrollTo(0, 0);
    }
    
    // Load products into grid (buy.js)
    async function loadProductsGrid() {
        let products = await DB.getProducts();

        // Filter by category
        if (currentCategoryFilter) {
            products = products.filter(p => p.category === currentCategoryFilter);
        }

        // Filter by search term
        const searchTerm = (document.getElementById('productGridSearch')?.value || '').toLowerCase().trim();
        if (searchTerm) {
            products = products.filter(p =>
                p.name.toLowerCase().includes(searchTerm) ||
                (p.sku || '').toLowerCase().includes(searchTerm)
            );
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
    buyForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        if (!selectedProduct) { showToast('No product selected', 'error'); return; }
        
        const quantity = Number(quantityInput.value);
        const purchasePrice = Number(priceInput.value);
        const supplier = document.getElementById('supplier').value.trim();
        const notes = document.getElementById('notes').value.trim();
        
        if (!quantity || quantity <= 0) { showToast('Please enter a valid quantity', 'error'); return; }
        if (purchasePrice < 0) { showToast('Please enter a valid purchase price', 'error'); return; }
        
        const currentStock = selectedProduct.currentStock ?? selectedProduct.stock ?? 0;
        const newStock = currentStock + quantity;
        
        // Update stock in DB
        await DB.updateProductStock(selectedProduct.id, newStock);
        
        // Save purchase to DB
        const purchase = {
            id: Date.now().toString(),
            productId: selectedProduct.id,
            productName: selectedProduct.name,
            sku: selectedProduct.sku,
            quantity,
            purchasePrice,
            totalCost: quantity * purchasePrice,
            supplier,
            notes,
            date: new Date().toISOString()
        };
        
        const result = await DB.savePurchase(purchase);
        if (!result.ok) { showToast('Error saving purchase.', 'error'); return; }
        
        showToast(`Purchase completed! Stock updated to ${newStock} ${selectedProduct.unit}`, 'success');
        await loadRecentPurchases();
        showProductSelection();
        
        // Trigger dashboard refresh
        if (typeof window.triggerDashboardRefresh === 'function') {
            window.triggerDashboardRefresh();
        }
    });
    
    // Load recent purchases — filtered by productId when provided
    async function loadRecentPurchases(productId = null) {
        let purchases = await DB.getPurchases();

        if (productId) {
            purchases = purchases.filter(p => p.productId === productId);
        }

        if (purchases.length === 0) {
            recentPurchasesDiv.innerHTML = `<p class="empty-text">${productId ? 'No purchases recorded for this product yet.' : 'No purchases recorded yet.'}</p>`;
            return;
        }

        recentPurchasesDiv.innerHTML = '';
        purchases.slice(0, 10).forEach(p => {
            const div = document.createElement('div');
            div.className = 'purchase-item';
            div.innerHTML = `
                <div class="title">${p.productName}</div>
                <div class="meta">
                    Qty: ${p.quantity} × ₹${Number(p.purchasePrice).toFixed(2)} = ₹${Number(p.totalCost).toFixed(2)}
                    ${p.supplier ? `| Supplier: ${p.supplier}` : ''}
                    <br>${new Date(p.date).toLocaleString()}
                </div>
            `;
            recentPurchasesDiv.appendChild(div);
        });
    }
});
