// reports.js

document.addEventListener('DOMContentLoaded', () => {
    const periodSelect = document.getElementById('periodSelect');
    const tableBody = document.getElementById('reportsTableBody');
    const noReportsMsg = document.getElementById('noReportsMsg');

    // Load reports on page open
    loadReports();

    periodSelect.addEventListener('change', loadReports);

    async function loadReports() {
        const period = periodSelect.value;
        const purchases = await DB.getPurchases();
        const sales     = await DB.getSales();

        // Filter by selected period
        const filteredPurchases = purchases.filter(p => inPeriod(p.date, period));
        const filteredSales = sales.filter(s => inPeriod(s.date, period));

        updateStats(filteredPurchases, filteredSales);
        renderTable(filteredPurchases, filteredSales);
    }

    // Check if a date is within the selected period
    function inPeriod(dateStr, period) {
        if (period === 'all') return true;

        const date = new Date(dateStr);
        const now = new Date();
        const today = now.toDateString();

        if (period === 'today') {
            return date.toDateString() === today;
        }

        if (period === 'week') {
            // Start of week (Monday)
            const startOfWeek = new Date(now);
            const day = (now.getDay() + 6) % 7; // Monday = 0
            startOfWeek.setDate(now.getDate() - day);
            startOfWeek.setHours(0, 0, 0, 0);
            return date >= startOfWeek;
        }

        if (period === 'month') {
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            return date >= startOfMonth;
        }

        return true;
    }

    // Update the summary stat cards
    function updateStats(purchases, sales) {
        let totalSales = 0;
        let totalProfit = 0;

        sales.forEach(sale => {
            totalSales += sale.totalAmount || 0;
            totalProfit += sale.profit || 0;
        });

        let totalPurchases = 0;
        purchases.forEach(purchase => {
            totalPurchases += purchase.totalCost || 0;
        });

        const margin = totalSales > 0 ? (totalProfit / totalSales) * 100 : 0;

        document.getElementById('report-total-sales').textContent = '₹' + totalSales.toFixed(2);
        document.getElementById('report-total-profit').textContent = '₹' + totalProfit.toFixed(2);
        document.getElementById('report-total-purchases').textContent = '₹' + totalPurchases.toFixed(2);
        document.getElementById('report-margin').textContent = margin.toFixed(1) + '%';
    }

    // Render combined transaction history table
    function renderTable(purchases, sales) {
        tableBody.innerHTML = '';

        // Tag each record with its type and normalize fields
        const purchaseRows = purchases.map(p => ({
            date: p.date,
            type: 'Purchase',
            product: p.productName,
            qty: p.quantity,
            rate: p.purchasePrice,
            total: p.totalCost,
            extra: p.totalCost,           // cost column
            profitValue: null
        }));

        const saleRows = sales.map(s => ({
            date: s.date,
            type: 'Sale',
            product: s.productName,
            qty: s.quantity,
            rate: s.sellingPrice,
            total: s.totalAmount,
            extra: s.profit || 0,         // profit column
            profitValue: s.profit || 0
        }));

        const allRows = [...purchaseRows, ...saleRows];
        allRows.sort((a, b) => new Date(b.date) - new Date(a.date));

        if (allRows.length === 0) {
            noReportsMsg.style.display = 'block';
            return;
        }

        noReportsMsg.style.display = 'none';

        allRows.forEach(row => {
            const tr = document.createElement('tr');

            const typeCell = row.type === 'Sale'
                ? '<span class="badge badge-sale">Sale</span>'
                : '<span class="badge badge-purchase">Purchase</span>';

            let extraCell;
            if (row.type === 'Sale') {
                const profitClass = row.profitValue >= 0 ? 'profit-positive' : 'profit-negative';
                const label = row.profitValue >= 0 ? '+' : '-';
                extraCell = `<span class="${profitClass}">${label}₹${Math.abs(row.profitValue).toFixed(2)}</span>`;
            } else {
                extraCell = '₹' + Number(row.extra).toFixed(2);
            }

            tr.innerHTML = `
                <td>${new Date(row.date).toLocaleString()}</td>
                <td>${typeCell}</td>
                <td>${row.product}</td>
                <td>${row.qty}</td>
                <td>₹${Number(row.rate).toFixed(2)}</td>
                <td>₹${Number(row.total).toFixed(2)}</td>
                <td>${extraCell}</td>
            `;
            tableBody.appendChild(tr);
        });
    }
});
