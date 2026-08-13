// sell.js - Two-step workflow: Select Product → Enter Transaction Details

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
    const priceInput = document.getElementById('sellingPrice');
    const totalAmountInput = document.getElementById('totalAmount');
    const estimatedProfitInput = document.getElementById('estimatedProfit');
    const sellForm = document.getElementById('sellForm');
    const recentSalesDiv = document.getElementById('recentSales');
    
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
    loadRecentSales();
    
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
        const costPrice = getLatestPurchasePrice(product.id);
        
        selectedProductPreview.innerHTML = `
            <h4>${product.name}</h4>
            <div class="meta">
                SKU: ${product.sku} | Available: ${stock} ${product.unit}
                ${costPrice > 0 ? `| Cost Price: ₹${costPrice.toFixed(2)}` : ''}
            </div>
        `;
        
        // Reset form
        sellForm.reset();
        totalAmountInput.value = '';
        estimatedProfitInput.value = '';
        
        // Scroll to top
        window.scrollTo(0, 0);
    }
    
    // Load products into grid
    async function loadProductsGrid() {
        let products = await DB.getProducts();
        
        // Filter by category
        if (currentCategoryFilter) {
            products = products.filter(p => p.category === currentCategoryFilter);
        }
        
        // Filter out products with zero stock
        products = products.filter(p => {
            const stock = p.currentStock ?? p.stock ?? 0;
            return stock > 0;
        });
        
        productsGrid.innerHTML = '';
        
        if (products.length === 0) {
            noProductsMsg.classList.remove('hidden');
            noProductsMsg.textContent = currentCategoryFilter 
                ? 'No products available in this category.' 
                : 'No products available for sale.';
            return;
        }
        
        noProductsMsg.classList.add('hidden');
        
        products.forEach(product => {
            const stock = product.currentStock ?? product.stock ?? 0;
            const minStock = product.minStock ?? 0;
            const isLow = minStock > 0 && stock <= minStock;
            const stockClass = stock === 0 ? 'out' : (isLow ? 'low' : '');
            
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
                            <span>Available</span>
                            <span class="stock-qty ${stockClass}">${stock} ${product.unit}</span>
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
    
    // Calculate totals
    function calculateTotals() {
        const qty = Number(quantityInput.value) || 0;
        const price = Number(priceInput.value) || 0;
        
        totalAmountInput.value = '₹' + (qty * price).toFixed(2);
        
        if (selectedProduct) {
            const costPrice = getLatestPurchasePrice(selectedProduct.id);
            const profit = (price - costPrice) * qty;
            estimatedProfitInput.value = '₹' + profit.toFixed(2);
            
            // Change color based on profit/loss
            if (profit >= 0) {
                estimatedProfitInput.style.color = 'var(--success)';
            } else {
                estimatedProfitInput.style.color = 'var(--danger)';
            }
        }
    }
    
    quantityInput.addEventListener('input', calculateTotals);
    priceInput.addEventListener('input', calculateTotals);
    
    // Get latest purchase price
    async function getLatestPurchasePrice(productId) {
        const purchases = await DB.getPurchases();
        const productPurchases = purchases.filter(p => p.productId === productId);
        return productPurchases.length > 0 ? productPurchases[0].purchasePrice : 0;
    }
    
    // Handle form submit
    sellForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        if (!selectedProduct) { showToast('No product selected', 'error'); return; }
        
        const quantity = Number(quantityInput.value);
        const sellingPrice = Number(priceInput.value);
        const customer = document.getElementById('customer').value.trim();
        const notes = document.getElementById('notes').value.trim();
        
        if (!quantity || quantity <= 0) { showToast('Please enter a valid quantity', 'error'); return; }
        if (!sellingPrice || sellingPrice < 0) { showToast('Please enter a valid selling price', 'error'); return; }
        
        const availableStock = selectedProduct.currentStock ?? selectedProduct.stock ?? 0;
        if (quantity > availableStock) {
            showToast(`Insufficient stock! Only ${availableStock} ${selectedProduct.unit} available.`, 'error');
            return;
        }
        
        const costPrice = await getLatestPurchasePrice(selectedProduct.id);
        const totalAmount = quantity * sellingPrice;
        const profit = (sellingPrice - costPrice) * quantity;
        
        // Update stock in DB
        const newStock = availableStock - quantity;
        await DB.updateProductStock(selectedProduct.id, newStock);
        
        // Save sale to DB
        const sale = {
            id: Date.now().toString(),
            productId: selectedProduct.id,
            productName: selectedProduct.name,
            sku: selectedProduct.sku,
            quantity,
            sellingPrice,
            totalAmount,
            costPrice,
            profit,
            customer,
            notes,
            date: new Date().toISOString()
        };
        
        const result = await DB.saveSale(sale);
        if (!result.ok) { showToast('Error saving sale.', 'error'); return; }
        
        const profitText = profit >= 0 ? `Profit: ₹${profit.toFixed(2)}` : `Loss: ₹${Math.abs(profit).toFixed(2)}`;
        showToast(`Sale completed! ${profitText}`, 'success');
        
        await loadRecentSales();
        showProductSelection();
    });
    
    // Load recent sales
    async function loadRecentSales() {
        const sales = await DB.getSales();
        
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
                    <span class="${profitClass}"> | ${profitLabel}: ₹${Math.abs(profit).toFixed(2)}</span>
                    <br>
                    ${new Date(s.date).toLocaleString()}
                </div>
            `;
            recentSalesDiv.appendChild(div);
        });
    }
});
