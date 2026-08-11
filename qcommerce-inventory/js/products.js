// products.js

document.addEventListener('DOMContentLoaded', () => {
    const addBtn = document.getElementById('addProductBtn');
    const modal = document.getElementById('productModal');
    const closeBtn = document.getElementById('closeModal');
    const cancelBtn = document.getElementById('cancelBtn');
    const form = document.getElementById('productForm');
    const tableBody = document.getElementById('productsTableBody');
    const noProductsMsg = document.getElementById('noProductsMsg');

    let editId = null;

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

        if (products.length === 0) {
            noProductsMsg.style.display = 'block';
            return;
        }

        noProductsMsg.style.display = 'none';

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
