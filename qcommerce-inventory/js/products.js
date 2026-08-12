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
        const productName = document.getElementById('name').value.trim();
        const existingProducts = Storage.get('products') || [];
        const existingProduct = editId ? existingProducts.find(p => p.id === editId) : null;

        const imageInput = document.getElementById('productImageInput');
        let imageData = existingProduct?.image || null;

        function persistProduct() {
            const product = {
                id: editId || Date.now().toString(),
                sku: document.getElementById('sku').value.trim(),
                name: productName,
                unit: document.getElementById('unit').value,
                minStock: Number(document.getElementById('minStock').value) || 0,
                stock: editId ? (existingProduct?.stock || 0) : 0,
                image: imageData || existingProduct?.image || getProductImage(productName),
                barcode: document.getElementById('barcode')?.value?.trim() || existingProduct?.barcode || ''
            };

            let products = existingProducts;
            if (editId) {
                products = products.map(p => p.id === editId ? { ...p, ...product } : p);
            } else {
                products.push(product);
            }

            Storage.set('products', products);
            modal.classList.remove('active');
            loadProducts();
            showToast(editId ? 'Product updated successfully!' : 'Product added successfully!', 'success');
        }

        if (imageInput && imageInput.files && imageInput.files[0]) {
            const file = imageInput.files[0];
            const reader = new FileReader();
            reader.onload = () => {
                imageData = reader.result;
                persistProduct();
            };
            reader.readAsDataURL(file);
            return;
        }

        persistProduct();
    });

    function getProductImage(name) {
        const query = encodeURIComponent(name.trim() || 'inventory product');
        return `https://source.unsplash.com/featured/520x320/?${query}`;
    }

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
                const imageUrl = product.image || getProductImage(product.name);
                const card = document.createElement('div');
                card.className = currentView === 'compact' ? 'product-card compact' : 'product-card';
                card.innerHTML = `
                    <div class="product-card-media">
                        <img src="${imageUrl}" alt="${product.name}">
                    </div>
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
        document.getElementById('barcode').value = product.barcode || '';
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

    const barcodeFile = document.getElementById('barcodeFile');
    if (barcodeFile) {
        barcodeFile.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = () => {
                const dataUrl = reader.result;
                const barcodeInput = document.getElementById('barcode');
                barcodeInput.value = '';

                if (window.Quagga && Quagga.decodeSingle) {
                    Quagga.decodeSingle({
                        src: dataUrl,
                        numOfWorkers: 0,
                        decoder: {
                            readers: [
                                'code_128_reader',
                                'ean_reader',
                                'ean_8_reader',
                                'code_39_reader',
                                'upc_reader',
                                'upc_e_reader'
                            ]
                        }
                    }, (result) => {
                        if (result && result.codeResult && result.codeResult.code) {
                            barcodeInput.value = result.codeResult.code;
                            showToast('Barcode decoded from image.', 'success');
                        } else {
                            barcodeInput.value = file.name.split('.')[0];
                            showToast('Could not decode barcode image. Using filename placeholder.', 'warning');
                        }
                    });
                } else {
                    barcodeInput.value = file.name.split('.')[0];
                    showToast('Barcode decode unavailable. Using filename placeholder.', 'warning');
                }
            };
            reader.readAsDataURL(file);
        });
    }

    const scanBtn = document.getElementById('scanBarcodeBtn');
    if (scanBtn) {
        scanBtn.addEventListener('click', () => {
            const fileInput = document.getElementById('barcodeFile');
            if (fileInput) {
                fileInput.click();
                showToast('Select or take a barcode photo to auto-decode in the form.', 'info');
            } else {
                alert('Barcode scanning requires image upload support. Please use the barcode field manually.');
            }
        });
    }
});
