// ============================================
// INVENTORY.JS — Fully Corrected
// ============================================

// Sidebar Toggle
document.getElementById('menuBtn').addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('open');
});

let inventory = [];
let filteredItems = [];
let editingId = null;

// Initial Load
window.addEventListener('load', () => {
    loadInventory();
    lucide.createIcons();
});

async function loadInventory() {
    try {
        if (typeof supabase === 'undefined') {
            throw new Error("Supabase is not initialized. Check config.js");
        }

        const { data, error } = await supabase
            .from('inventory')
            .select('*')
            .order('item', { ascending: true });

        if (error) throw error;

        inventory = data || [];
        filteredItems = [...inventory];
        
        renderStats();
        renderTable();
    } catch (err) {
        console.error("Load Error:", err);
        showToast(err.message, "error");
    }
}

async function saveItem() {
    const payload = { 
        item: document.getElementById('iName').value.trim(), 
        category: document.getElementById('iCat').value, 
        price: parseFloat(document.getElementById('iPrice').value), 
        stock: parseInt(document.getElementById('iStock').value), 
        low_stock_level: parseInt(document.getElementById('iLowLevel').value) || 5 
    };

    if (!payload.item || isNaN(payload.price) || isNaN(payload.stock)) {
        showToast('Please fill all required fields.', 'error');
        return;
    }

    try {
        let error;
        if (editingId) {
            const res = await supabase.from('inventory').update(payload).eq('id', editingId);
            error = res.error;
        } else {
            const res = await supabase.from('inventory').insert([payload]);
            error = res.error;
        }

        if (error) throw error;

        showToast(editingId ? 'Item updated!' : 'Item added!', 'success');
        closeModal('itemModal');
        loadInventory(); 
    } catch (err) {
        showToast(err.message, 'error');
    }
}

async function restockItem(id) {
    const item = inventory.find(i => i.id === id);
    if (!item) return;

    const qty = prompt(`Restock "${item.item}"\nCurrent stock: ${item.stock}\nUnits to add:`, '10');
    if (qty === null) return;
    
    const add = parseInt(qty);
    if (isNaN(add) || add <= 0) { showToast('Invalid quantity.', 'error'); return; }

    try {
        const { error } = await supabase
            .from('inventory')
            .update({ stock: item.stock + add })
            .eq('id', id);

        if (error) throw error;
        showToast(`Restocked ${item.item}`, 'success');
        loadInventory();
    } catch (err) {
        showToast(err.message, 'error');
    }
}

async function deleteItem(id) {
    if (!confirm(`Delete this item?`)) return;
    try {
        const { error } = await supabase.from('inventory').delete().eq('id', id);
        if (error) throw error;
        showToast('Deleted', 'warning');
        loadInventory();
    } catch (err) {
        showToast(err.message, 'error');
    }
}

function renderStats() {
    const total = inventory.length;
    const lowStockItems = inventory.filter(i => i.stock <= i.low_stock_level);
    const totalValue = inventory.reduce((s, i) => s + (i.stock * i.price), 0);

    document.getElementById('invStats').innerHTML = `
        <div class="inv-stat"><div class="inv-stat-value">${total}</div><div class="inv-stat-label">Total Items</div></div>
        <div class="inv-stat" style="${lowStockItems.length > 0 ? 'border-color:#ff4d4d' : ''}">
            <div class="inv-stat-value" style="color:${lowStockItems.length > 0 ? '#ff4d4d' : 'inherit'}">${lowStockItems.length}</div>
            <div class="inv-stat-label">Low Stock</div>
        </div>
        <div class="inv-stat"><div class="inv-stat-value">₹${totalValue.toLocaleString()}</div><div class="inv-stat-label">Total Value</div></div>
    `;

    const alert = document.getElementById('lowStockAlert');
    if (lowStockItems.length > 0) {
        alert.innerHTML = `<span>⚠ <strong>Low Stock:</strong> ${lowStockItems.slice(0,2).map(i=>i.item).join(', ')}${lowStockItems.length > 2 ? '...' : ''}</span>`;
        alert.style.display = 'flex';
    } else {
        alert.style.display = 'none';
    }
}

function renderTable() {
    const tbody = document.getElementById('invTableBody');
    if (!tbody) return;

    if (filteredItems.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:40px;color:#94a3b8;">No items found</td></tr>`;
        return;
    }

    tbody.innerHTML = filteredItems.map(item => {
        const isLow = item.stock <= item.low_stock_level;
        return `
            <tr>
                <td style="font-weight:600;">${item.item}</td>
                <td><span class="category-tag">${item.category}</span></td>
                <td>₹${item.price}</td>
                <td style="color:${isLow ? '#ff4d4d' : 'inherit'}; font-weight:700;">${item.stock}</td>
                <td style="color:#64748b;">${item.low_stock_level}</td>
                <td style="font-weight:600;">₹${(item.stock * item.price).toLocaleString()}</td>
                <td>
                    <span class="badge ${isLow ? 'badge-expired' : 'badge-completed'}">${isLow ? 'Low Stock' : 'In Stock'}</span>
                </td>
                <td>
                    <div style="display:flex;gap:6px;">
                        <button class="action-btn success" onclick="restockItem(${item.id})">Restock</button>
                        <button class="action-btn" onclick="editItem(${item.id})">Edit</button>
                        <button class="action-btn danger" onclick="deleteItem(${item.id})">Delete</button>
                    </div>
                </td>
            </tr>`;
    }).join('');
    
    // Refresh icons for any icons added inside the table
    lucide.createIcons();
}

function filterItems() {
    const q = document.getElementById('searchInput').value.toLowerCase();
    const cat = document.getElementById('catFilter').value;
    const stock = document.getElementById('stockFilter').value;

    filteredItems = inventory.filter(i => {
        const matchQ = !q || i.item.toLowerCase().includes(q);
        const matchCat = !cat || i.category === cat;
        const matchStock = !stock || (stock === 'low' ? i.stock <= i.low_stock_level : i.stock > i.low_stock_level);
        return matchQ && matchCat && matchStock;
    });
    renderTable();
}

function openAddModal() {
    editingId = null;
    document.getElementById('itemModalTitle').textContent = 'Add Item';
    document.getElementById('iName').value = '';
    document.getElementById('iPrice').value = '';
    document.getElementById('iStock').value = '';
    document.getElementById('iLowLevel').value = '5';
    openModal('itemModal');
}

function editItem(id) {
    const item = inventory.find(i => i.id === id);
    if (!item) return;
    editingId = id;
    document.getElementById('itemModalTitle').textContent = 'Edit Item';
    document.getElementById('iName').value = item.item;
    document.getElementById('iCat').value = item.category;
    document.getElementById('iPrice').value = item.price;
    document.getElementById('iStock').value = item.stock;
    document.getElementById('iLowLevel').value = item.low_stock_level;
    openModal('itemModal');
}

function openModal(id) { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }

function showToast(msg, type = 'success') {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerText = msg;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}