// 1. Ambil elemen DOM
const expenseForm = document.getElementById('expense-form');
const categoryForm = document.getElementById('category-form');
const itemNameInput = document.getElementById('item-name');
const amountInput = document.getElementById('amount');
const dateInput = document.getElementById('transaction-date');
const categorySelect = document.getElementById('category');
const newCategoryInput = document.getElementById('new-category-name');
const transactionList = document.getElementById('transaction-list');
const totalBalanceEl = document.getElementById('total-balance');

// Elemen DOM Fitur Tambahan
const budgetLimitInput = document.getElementById('budget-limit');
const limitWarningEl = document.getElementById('limit-warning');
const balanceCard = document.getElementById('balance-card');
const monthFilterInput = document.getElementById('month-filter');
const sortOptionsSelect = document.getElementById('sort-options');

// Set Tanggal hari ini di Form secara default
dateInput.value = new Date().toISOString().split('T')[0];

// 2. Inisialisasi data dari Local Storage
let transactions = JSON.parse(localStorage.getItem('transactions')) || [];
let customCategories = JSON.parse(localStorage.getItem('customCategories')) || ['Food', 'Transport', 'Fun'];
let budgetLimit = parseFloat(localStorage.getItem('budgetLimit')) || 0;

if (budgetLimit > 0) {
    budgetLimitInput.value = budgetLimit;
}

// 3. Fungsi memuat daftar pilihan kategori ke dropdown select
function loadCategories() {
    categorySelect.innerHTML = '';
    customCategories.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat;
        option.innerText = cat;
        categorySelect.appendChild(option);
    });
}

// 4. Fungsi Utama merender tampilan (Ulang setiap ada perubahan)
function updateDOM() {
    transactionList.innerHTML = '';
    
    let total = 0;
    
    // Siapkan object penampung total per kategori untuk grafik
    let categoryTotals = {};
    customCategories.forEach(cat => categoryTotals[cat] = 0);

    // Filter 1: Berdasarkan Bulan (Monthly Summary View)
    const selectedMonth = monthFilterInput.value; // Format: "YYYY-MM"
    let filteredTransactions = transactions.filter(t => {
        if (!selectedMonth) return true;
        return t.date.substring(0, 7) === selectedMonth;
    });

    // Filter 2: Urutkan Transaksi (Sorting)
    const sortBy = sortOptionsSelect.value;
    filteredTransactions.sort((a, b) => {
        if (sortBy === 'latest') return new Date(b.date) - new Date(a.date);
        if (sortBy === 'oldest') return new Date(a.date) - new Date(b.date);
        if (sortBy === 'amount-high') return b.amount - a.amount;
        if (sortBy === 'amount-low') return a.amount - b.amount;
    });

    // Kalkulasi data yang sudah difilter & diurutkan
    filteredTransactions.forEach((transaction) => {
        total += transaction.amount;
        
        // Cek jika kategori masih ada (antisipasi error data lama)
        if (categoryTotals[transaction.category] !== undefined) {
            categoryTotals[transaction.category] += transaction.amount;
        } else {
            categoryTotals[transaction.category] = transaction.amount;
        }

        // Tampilkan item ke dalam list
        const li = document.createElement('li');
        li.classList.add('transaction-item');
        li.innerHTML = `
            <div class="item-info">
                <p>${transaction.name}</p>
                <small style="color: #2ecc71; font-weight:bold;">$${transaction.amount.toFixed(2)}</small> - <small>${transaction.date}</small><br>
                <span>${transaction.category}</span>
            </div>
            <button class="btn-delete" onclick="deleteTransaction(${transaction.id})">Delete</button>
        `;
        transactionList.appendChild(li);
    });

    // Update Teks Total Saldo
    totalBalanceEl.innerText = `$${total.toFixed(2)}`;

    // Cek Limit Highlight (Peringatan Anggaran)
    if (budgetLimit > 0 && total > budgetLimit) {
        balanceCard.classList.add('over-limit');
        limitWarningEl.innerText = `⚠️ Warning: Pengeluaran melebihi limit $${budgetLimit.toFixed(2)}!`;
    } else {
        balanceCard.classList.remove('over-limit');
        limitWarningEl.innerText = '';
    }

    // Update grafik lingkaran
    updateChart(categoryTotals);
}

// 5. Inisialisasi & Update Grafik Menggunakan Chart.js
let myChart = null;
function updateChart(totals) {
    const ctx = document.getElementById('spending-chart').getContext('2d');
    
    if (myChart) {
        myChart.destroy();
    }

    // Buat daftar warna acak jika kategori kustom bertambah banyak
    const colors = ['#2ecc71', '#3498db', '#e67e22', '#9b59b6', '#f1c40f', '#e74c3c', '#1abc9c'];
    const backgroundColors = Object.keys(totals).map((_, index) => colors[index % colors.length]);

    myChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: Object.keys(totals),
            datasets: [{
                data: Object.values(totals),
                backgroundColor: backgroundColors
            }]
        },
        options: {
            responsive: true
        }
    });
}

// 6. Event Listener: Form Tambah Transaksi
expenseForm.addEventListener('submit', function(e) {
    e.preventDefault();

    if (itemNameInput.value.trim() === '' || amountInput.value.trim() === '' || dateInput.value === '') {
        alert('Harap isi nama, jumlah uang, dan tanggal transaksi!');
        return;
    }

    const newTransaction = {
        id: Date.now(),
        name: itemNameInput.value,
        amount: parseFloat(amountInput.value),
        date: dateInput.value,
        category: categorySelect.value
    };

    transactions.push(newTransaction);
    localStorage.setItem('transactions', JSON.stringify(transactions));

    itemNameInput.value = '';
    amountInput.value = '';
    dateInput.value = new Date().toISOString().split('T')[0];

    updateDOM();
});

// 7. Event Listener: Form Tambah Kategori Kustom
categoryForm.addEventListener('submit', function(e) {
    e.preventDefault();
    const catName = newCategoryInput.value.trim();

    if (catName === '') {
        alert('Nama kategori tidak boleh kosong!');
        return;
    }

    if (customCategories.includes(catName)) {
        alert('Kategori sudah ada!');
        return;
    }

    customCategories.push(catName);
    localStorage.setItem('customCategories', JSON.stringify(customCategories));
    
    newCategoryInput.value = '';
    loadCategories();
    updateDOM();
});

// 8. Event Listener: Perubahan Input Limit Anggaran
budgetLimitInput.addEventListener('input', function() {
    budgetLimit = parseFloat(budgetLimitInput.value) || 0;
    localStorage.setItem('budgetLimit', budgetLimit);
    updateDOM();
});

// 9. Event Listener: Filter Bulan & Pilihan Sorting
monthFilterInput.addEventListener('change', updateDOM);
sortOptionsSelect.addEventListener('change', updateDOM);

// 10. Fungsi Aksi Hapus Transaksi
function deleteTransaction(id) {
    transactions = transactions.filter(t => t.id !== id);
    localStorage.setItem('transactions', JSON.stringify(transactions));
    updateDOM();
}

// Jalankan fungsi awal saat aplikasi dimuat
loadCategories();
updateDOM();
