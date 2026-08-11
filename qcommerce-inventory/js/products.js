// products.js

document.addEventListener('DOMContentLoaded', () => {
    const addBtn = document.getElementById('addProductBtn');
    const modal = document.getElementById('productModal');
    const closeBtn = document.getElementById('closeModal');
    const cancelBtn = document.getElementById('cancelBtn');
    const form = document.getElementById('productForm');
    const tableBody = document.getElementById('productsTableBody');
    const noProductsMsg = document.getElementById('noProductsMsg');

    const viewBtns = document.querySelectorAll('.view-btn');
    const tableView = document.getElementById('tableView');
    const gridView = document.getElementById('gridView');

    const allowedViews = ['table', 'grid', 'compact'];
    let currentView = Storage.get('products-view') || 'table';
    if (!allowedViews.includes(currentView)) currentView = 'table';
    let editId = null;

    // Initialize view switcher
    function initViewSwitcher() {
        viewBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === currentView);
            btn.addEventListener('click', () => {
                currentView = btn.dataset.view;
                if (!allowedViews.includes(currentView)) currentView = 'table';
                Storage.set('products-view', currentView);
                viewBtns.forEach(b => b.classList.toggle('active', b.dataset.view === currentView));
                loadProducts();
            });
        });
    }

    initViewSwitcher();

    // Load products when page opens
    loadProducts();

    // Open modal
    addBtn.addEventListener('click', () => {
        editId = null;
        document.getElementById('modalTitle').textContent = 'Add New Product';
        form.reset();
        modal.classList.add('active');
    });

    // Close modal
    closeBtn.addEventListener('click', () => modal.classList.remove('active'));
    cancelBtn.addEventListener('click', () => modal.classList.remove('active'));

    // Save product
    form.addEventListener('submit', (e) => {
        e.preventDefault();

        const product = {
            id: editId || Date.now().toString(),
            sku: document.getElementById('sku').value.trim(),
            name: document.getElementById('name').value.trim(),
            unit: document.getElementById('unit').value,
            minStock: Number(document.getElementById('minStock').value) || 0,
            stock: 0   // current stock starts at 0
        };

        let products = Storage.get('products') || [];

        if (editId) {
            // Update existing
            products = products.map(p => p.id === editId ? product : p);
        } else {
            // Add new
            products.push(product);
        }

        Storage.set('products', products);
        modal.classList.remove('active');
        loadProducts();
        showToast(editId ? 'Product updated successfully!' : 'Product added successfully!', 'success');
    });

    // Load and display products
    function loadProducts() {
        const products = Storage.get('products') || [];
        tableBody.innerHTML = '';
        gridView.innerHTML = '';

        if (products.length === 0) {
            noProductsMsg.style.display = 'block';
            tableView.classList.add('hidden');
            gridView.classList.add('hidden');
            return;
        }

        noProductsMsg.style.display = 'none';

        if (currentView === 'table') {
            tableView.classList.remove('hidden');
            gridView.classList.add('hidden');
        } else {
            tableView.classList.add('hidden');
            gridView.classList.remove('hidden');
            gridView.classList.toggle('compact', currentView === 'compact');
        }

        products.forEach(product => {
            const stock = product.stock || 0;
            const minStock = product.minStock || 0;
            const isOut = stock === 0;
            const isLow = !isOut && minStock > 0 && stock <= minStock;
            const isHealthy = !isOut && !isLow;

            // Determine stock badge class, icon, and label
            let badgeClass, badgeIcon, badgeLabel, barClass;
            if (isOut) {
                badgeClass = 'stock-out';
                badgeIcon = 'fa-times-circle';
                badgeLabel = 'Out of Stock';
                barClass = 'bar-out';
            } else if (isLow) {
                badgeClass = 'stock-low';
                badgeIcon = 'fa-exclamation-triangle';
                badgeLabel = `${stock} ${product.unit} · Low`;
                barClass = 'bar-low';
            } else {
                badgeClass = 'stock-healthy';
                badgeIcon = 'fa-check-circle';
                badgeLabel = `${stock} ${product.unit}`;
                barClass = 'bar-healthy';
            }

            // Calculate progress bar width (relative to minStock * 3 as a "full" reference)
            const barMax = minStock > 0 ? minStock * 3 : Math.max(stock, 10);
            const barPercent = Math.min((stock / barMax) * 100, 100);

            if (currentView === 'table') {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${product.sku}</td>
                    <td>${product.name}</td>
                    <td>${product.unit}</td>
                    <td>
                        <div class="stock-cell">
                            <span class="stock-badge ${badgeClass}">
                                <i class="fas ${badgeIcon}"></i>
                                ${badgeLabel}
                            </span>
                            ${minStock > 0 ? `
                            <div class="stock-bar-wrap">
                                <div class="stock-bar ${barClass}" style="width: ${barPercent}%"></div>
                            </div>
                            <span class="stock-min-label">Min: ${minStock} ${product.unit}</span>
                            ` : ''}
                        </div>
                    </td>
                    <td>
                        <button class="btn btn-edit" onclick="editProduct('${product.id}')">Edit</button>
                        <button class="btn btn-danger" onclick="deleteProduct('${product.id}')">Delete</button>
                    </td>
                `;
                tableBody.appendChild(tr);
            } else {
                const card = document.createElement('div');
                card.className = currentView === 'compact' ? 'product-card compact' : 'product-card';
                card.innerHTML = `
                    <div class="product-card-header">
                        <div>
                            <h3 class="product-card-title">${product.name}</h3>
                            <p class="product-card-subtitle">SKU ${product.sku}</p>
                        </div>
                        <span class="product-card-unit">${product.unit.toUpperCase()}</span>
                    </div>
                    <div class="product-card-stock">
                        <div class="stock-summary">
                            <span class="stock-badge ${badgeClass}">
                                <i class="fas ${badgeIcon}"></i>
                                ${badgeLabel}
                            </span>
                            ${minStock > 0 ? `<span class="stock-min-label">Min ${minStock} ${product.unit}</span>` : ''}
                        </div>
                        ${minStock > 0 ? `
                        <div class="stock-bar-wrap">
                            <div class="stock-bar ${barClass}" style="width: ${barPercent}%"></div>
                        </div>` : ''}
                    </div>
                    <div class="product-card-actions">
                        <button class="btn btn-secondary" onclick="editProduct('${product.id}')">Edit</button>
                        <button class="btn btn-danger" onclick="deleteProduct('${product.id}')">Delete</button>
                    </div>
                `;
                gridView.appendChild(card);
            }
        });
    }

    // Make functions global so buttons can call them
    window.editProduct = function(id) {
        const products = Storage.get('products') || [];
        const product = products.find(p => p.id === id);
        if (!product) return;

        editId = id;
        document.getElementById('modalTitle').textContent = 'Edit Product';
        document.getElementById('sku').value = product.sku;
        document.getElementById('name').value = product.name;
        document.getElementById('unit').value = product.unit;
        document.getElementById('minStock').value = product.minStock;
        modal.classList.add('active');
    };

    window.deleteProduct = function(id) {
        if (!confirm('Are you sure you want to delete this product?')) return;

        let products = Storage.get('products') || [];
        products = products.filter(p => p.id !== id);
        Storage.set('products', products);
        loadProducts();
        showToast('Product deleted', 'info');
    };
});
