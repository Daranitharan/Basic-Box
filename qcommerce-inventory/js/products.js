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
    let currentCategoryFilter = ''; // Track active category filter

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

    // Initialize category filter
    const categoryFilter = document.getElementById('categoryFilter');
    const productsHeading = document.getElementById('productsHeading');
    if (categoryFilter) {
        categoryFilter.addEventListener('change', (e) => {
            currentCategoryFilter = e.target.value;
            loadProducts();
            // Update heading
            if (productsHeading) {
                if (currentCategoryFilter) {
                    const selectedOption = categoryFilter.options[categoryFilter.selectedIndex].text;
                    productsHeading.textContent = selectedOption;
                } else {
                    productsHeading.textContent = 'All Products';
                }
            }
        });
    }

    // Load products when page opens
    loadProducts();

    // Open modal
    addBtn.addEventListener('click', () => {
        editId = null;
        document.getElementById('modalTitle').textContent = 'Add New Product';

        // Manually reset each field instead of form.reset()
        // (form.reset() clears hidden inputs too, breaking the category picker)
        document.getElementById('sku').value = '';
        document.getElementById('name').value = '';
        document.getElementById('unit').value = '';
        document.getElementById('supplier').value = '';
        document.getElementById('minStock').value = '0';
        document.getElementById('barcode').value = '';

        if (window.setCategoryPicker) window.setCategoryPicker('');
        resetPreview();
        setFeedback('Scan or enter a barcode to lookup a product.');
        modal.classList.add('active');
    });

    // Close modal
    closeBtn.addEventListener('click', () => modal.classList.remove('active'));
    cancelBtn.addEventListener('click', () => modal.classList.remove('active'));

    // Save product
    form.addEventListener('submit', (e) => {
        e.preventDefault();

        // Read category from hidden input, with fallback to trigger's data attribute
        const categoryInput = document.getElementById('category');
        const categoryTrigger = document.getElementById('categoryTrigger');
        const categoryValue = (categoryInput ? categoryInput.value : '') ||
                              (categoryTrigger ? categoryTrigger.dataset.selected : '') || '';

        if (!categoryValue.trim()) {
            if (categoryTrigger) {
                categoryTrigger.style.borderColor = 'var(--danger)';
                categoryTrigger.style.boxShadow = '0 0 0 3px var(--danger-soft)';
                setTimeout(() => {
                    categoryTrigger.style.borderColor = '';
                    categoryTrigger.style.boxShadow = '';
                }, 2500);
            }
            showToast('Please select a category.', 'error');
            return;
        }

        const productName = document.getElementById('name').value.trim();
        const existingProducts = Storage.get('products') || [];
        const existingProduct = editId ? existingProducts.find(p => p.id === editId) : null;

        const imageInput = document.getElementById('productImageInput');
        let imageData = existingProduct?.image || null;

        function persistProduct() {
            const barcodeValue = document.getElementById('barcode')?.value?.trim() || existingProduct?.barcode || '';
            const existingBarcodeMatch = existingProducts.find(p => p.barcode === barcodeValue && p.id !== (existingProduct?.id || ''));
            if (barcodeValue && existingBarcodeMatch) {
                showToast('A product with this barcode already exists.', 'error');
                return;
            }

            const currentStockValue = Number(existingProduct?.currentStock ?? existingProduct?.stock ?? 0);
            const catInput   = document.getElementById('category');
            const catTrigger = document.getElementById('categoryTrigger');
            const finalCategory = (catInput ? catInput.value : '') ||
                                  (catTrigger ? catTrigger.dataset.selected : '') || '';
            const product = {
                id: editId || Date.now().toString(),
                sku: document.getElementById('sku').value.trim(),
                category: finalCategory.trim(),
                name: productName,
                unit: document.getElementById('unit').value,
                minStock: Number(document.getElementById('minStock').value) || 0,
                openingStock: existingProduct?.openingStock || 0,
                currentStock: currentStockValue,
                stock: currentStockValue,
                supplier: document.getElementById('supplier').value.trim(),
                image: imageData || existingProduct?.image || null,
                barcode: barcodeValue
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

    function resetPreview() {
        const productImagePreview = document.getElementById('productImagePreview');
        if (productImagePreview) {
            productImagePreview.innerHTML = '<span>No image selected</span>';
        }
    }

    function populateProductFields(product) {
        if (!product) return;
        editId = product.id;
        document.getElementById('modalTitle').textContent = 'Edit Product';
        document.getElementById('sku').value = product.sku || '';
        document.getElementById('category').value = product.category || '';
        if (window.setCategoryPicker) window.setCategoryPicker(product.category || '');
        document.getElementById('name').value = product.name || '';
        document.getElementById('unit').value = product.unit || '';
        document.getElementById('minStock').value = product.minStock || 0;
        document.getElementById('supplier').value = product.supplier || '';
        document.getElementById('barcode').value = product.barcode || '';

        const productImagePreview = document.getElementById('productImagePreview');
        if (product.image && productImagePreview) {
            productImagePreview.innerHTML = `<img src="${product.image}" alt="Product preview">`;
        } else {
            resetPreview();
        }

        modal.classList.add('active');
    }

    // Load and display products
    function loadProducts() {
        let products = Storage.get('products') || [];
        
        // Filter by category if a filter is active
        if (currentCategoryFilter) {
            products = products.filter(p => p.category === currentCategoryFilter);
        }
        
        tableBody.innerHTML = '';
        gridView.innerHTML = '';

        if (products.length === 0) {
            noProductsMsg.style.display = 'block';
            tableView.classList.add('hidden');
            gridView.classList.add('hidden');
            noProductsMsg.textContent = currentCategoryFilter 
                ? `No products found in this category.` 
                : 'No products found. Click "Add Product" to create one.';
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
            const stock = Number(product.currentStock ?? product.stock ?? 0);
            const minStock = Number(product.minStock ?? 0);
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
                    <td>${product.category || '-'}</td>
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
                const imageUrl = product.image || null;
                const card = document.createElement('div');
                card.className = currentView === 'compact' ? 'product-card compact' : 'product-card';
                
                const imageHTML = imageUrl 
                    ? `<div class="product-card-media"><img src="${imageUrl}" alt="${product.name}" onerror="this.parentElement.style.display='none'"></div>`
                    : '';
                
                card.innerHTML = `
                    ${imageHTML}
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
                
                // If no image, add extra padding
                if (!imageUrl) {
                    card.style.padding = '16px';
                }
                
                gridView.appendChild(card);
            }
        });
    }

    // Make functions global so buttons can call them
    window.editProduct = function(id) {
        const products = Storage.get('products') || [];
        const product = products.find(p => p.id === id);
        if (!product) return;
        populateProductFields(product);
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
            const barcodeCameraInput = document.getElementById('barcodeCameraInput');
            const uploadBarcodeBtn = document.getElementById('uploadBarcodeBtn');
            const barcodeLookupFeedback = document.getElementById('barcodeLookupFeedback');
            const barcodeInput = document.getElementById('barcode');
            const productImageInput = document.getElementById('productImageInput');
            const productImagePreview = document.getElementById('productImagePreview');

            function setFeedback(message, type = 'info') {
                barcodeLookupFeedback.textContent = message;
                barcodeLookupFeedback.style.color = type === 'error' ? 'var(--danger)' : type === 'success' ? 'var(--success)' : 'var(--text-faint)';
            }

            function resetPreview() {
                if (productImagePreview) {
                    productImagePreview.innerHTML = '<span>No image selected</span>';
                }
            }

            function lookupBarcode(barcode) {
                const products = Storage.get('products') || [];
                if (!barcode) {
                    setFeedback('Scan or enter a barcode to lookup a product.');
                    return null;
                }
                const found = products.find(p => p.barcode === barcode);
                if (found) {
                    setFeedback('Product found. Loaded details for editing.', 'success');
                    return found;
                }
                setFeedback('Product not found. You can add it now.');
                return null;
            }

            if (productImageInput && productImagePreview) {
                productImageInput.addEventListener('change', (e) => {
                    const file = e.target.files[0];
                    if (!file) {
                        resetPreview();
                        return;
                    }
                    const reader = new FileReader();
                    reader.onload = () => {
                        productImagePreview.innerHTML = `<img src="${reader.result}" alt="Product preview">`;
                    };
                    reader.readAsDataURL(file);
                });
            }

            if (barcodeInput) {
                barcodeInput.addEventListener('blur', () => {
                    const product = lookupBarcode(barcodeInput.value.trim());
                    if (product) {
                        populateProductFields(product);
                    }
                });
            }

            if (uploadBarcodeBtn && barcodeFile) {
                uploadBarcodeBtn.addEventListener('click', () => {
                    barcodeFile.click();
                });
            }

            if (barcodeFile) {
                barcodeFile.addEventListener('change', (e) => {
                    const file = e.target.files[0];
                    if (!file) return;

                    const reader = new FileReader();
                    reader.onload = () => {
                        const dataUrl = reader.result;
                        if (window.Quagga && Quagga.decodeSingle) {
                            setFeedback('Decoding barcode image...');
                            Quagga.decodeSingle({
                                src: dataUrl,
                                numOfWorkers: 0,
                                decoder: {
                                    readers: [
                                        'code_128_reader',
                                        'ean_reader',
                                        'ean_8_reader',
                                        'upc_reader',
                                        'upc_e_reader'
                                    ]
                                }
                            }, (result) => {
                                if (result && result.codeResult && result.codeResult.code) {
                                    barcodeInput.value = result.codeResult.code;
                                    const product = lookupBarcode(result.codeResult.code);
                                    if (product) {
                                        populateProductFields(product);
                                    }
                                } else {
                                    setFeedback('Barcode not detected. Please enter it manually.', 'error');
                                }
                            });
                        } else {
                            setFeedback('Barcode decode unavailable. Please enter it manually.', 'error');
                        }
                    };
                    reader.readAsDataURL(file);
                });
            }

            const scanBtn = document.getElementById('scanBarcodeBtn');
            if (scanBtn) {
                scanBtn.addEventListener('click', () => {
                    if (barcodeCameraInput) {
                        barcodeCameraInput.click();
                        setFeedback('Use your camera to scan a barcode image.');
                    } else if (barcodeFile) {
                        barcodeFile.click();
                        setFeedback('Select a barcode photo to decode.');
                    } else {
                        setFeedback('Camera scanning is not supported on this browser.', 'error');
                    }
                });
            }

            if (barcodeCameraInput) {
                barcodeCameraInput.addEventListener('change', (e) => {
                    const file = e.target.files[0];
                    if (!file) return;
                    if (barcodeFile) {
                        const dataTransfer = new DataTransfer();
                        dataTransfer.items.add(file);
                        barcodeFile.files = dataTransfer.files;
                        barcodeFile.dispatchEvent(new Event('change'));
                    }
                });
            }
        });
