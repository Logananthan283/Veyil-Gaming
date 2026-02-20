// ============================================
// EXPENSE-TRACKER.JS — Fully Corrected
// ============================================
document.getElementById('menuBtn').addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('open');
});

let expenses = [];
let filtered = [];
let editingId = null;

// ============================================
// DATABASE ACTIONS
// ============================================

async function loadExpenses() {
  try {
    if (typeof supabase === 'undefined') {
      throw new Error("Supabase is not initialized. Check your config.js.");
    }

    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .order('date', { ascending: false });

    if (error) throw error;

    expenses = (data || []).map(e => ({
      ...e,
      payment_mode: e.payment_mode || e.paymentmode || 'Cash',
      status: e.status || 'paid'
    }));

    filtered = [...expenses];
    
    renderStats();
    renderTable();
    renderCategoryBreakdown();
    lucide.createIcons(); // Initialize icons after rendering
  } catch (err) {
    console.error("Expense Load Error:", err);
    showToast("Error loading: " + err.message, "error");
  }
}

async function saveExpense() {
  const date = document.getElementById('eDate').value;
  const category = document.getElementById('eCat').value;
  const vendor = document.getElementById('eVendor').value.trim();
  const amount = parseFloat(document.getElementById('eAmount').value);
  const payment_mode = document.getElementById('ePayMode').value;
  const status = document.getElementById('eStatus').value;
  const notes = document.getElementById('eNotes').value.trim();

  if (!date || !vendor || isNaN(amount)) { 
    showToast('Fill all required fields.', 'error'); 
    return; 
  }

  const payload = { date, category, vendor, amount, payment_mode, status, notes };

  try {
    let result;
    if (editingId) {
      result = await supabase.from('expenses').update(payload).eq('id', editingId);
    } else {
      result = await supabase.from('expenses').insert([payload]);
    }

    if (result.error) throw result.error;

    showToast(editingId ? 'Expense updated!' : 'Expense added!', 'success');
    closeModal('expModal');
    loadExpenses(); 
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function deleteExpense(id) {
  if (!confirm('Delete this expense record?')) return;
  try {
    const { error } = await supabase.from('expenses').delete().eq('id', id);
    if (error) throw error;
    showToast('Deleted.', 'warning');
    loadExpenses();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function markPaid(id) {
  try {
    const { error } = await supabase.from('expenses').update({ status: 'paid' }).eq('id', id);
    if (error) throw error;
    showToast('Marked as paid.', 'success');
    loadExpenses();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ============================================
// UI RENDERING
// ============================================

function renderStats() {
  const total = expenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);
  const paid = expenses.filter(e => e.status === 'paid').reduce((s, e) => s + (Number(e.amount) || 0), 0);
  const pending = expenses.filter(e => e.status === 'pending').reduce((s, e) => s + (Number(e.amount) || 0), 0);

  document.getElementById('expStats').innerHTML = `
    <div class="exp-stat"><div class="exp-stat-value">₹${total.toLocaleString()}</div><div class="exp-stat-label">Total</div></div>
    <div class="exp-stat" style="border-color:#10b981;"><div class="exp-stat-value" style="color:#10b981;">₹${paid.toLocaleString()}</div><div class="exp-stat-label">Paid</div></div>
    <div class="exp-stat" style="border-color:#f59e0b;"><div class="exp-stat-value" style="color:#f59e0b;">₹${pending.toLocaleString()}</div><div class="exp-stat-label">Pending</div></div>
    <div class="exp-stat"><div class="exp-stat-value">${expenses.length}</div><div class="exp-stat-label">Entries</div></div>
  `;
}

function renderTable() {
  const tbody = document.getElementById('expTableBody');
  if (!tbody) return;

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:40px;color:#94a3b8;">No expenses found</td></tr>`;
    return;
  }
  
  tbody.innerHTML = filtered.map(e => `
    <tr>
      <td style="white-space:nowrap;">${e.date}</td>
      <td><span class="category-tag" style="background:#051eff0c; padding:2px 8px; border-radius:4px; font-size:11px;">${e.category}</span></td>
      <td style="font-weight:600;">${e.vendor}</td>
      <td style="font-weight:700; color:#ef4444;">₹${Number(e.amount).toLocaleString()}</td>
      <td>${e.payment_mode}</td>
      <td><span class="badge badge-${e.status}">${e.status}</span></td>
      <td style="max-width:150px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:#64748b; font-size:12px;">${e.notes || '—'}</td>
      <td>
        <div style="display:flex; gap:6px;">
          ${e.status === 'pending' ? `<button class="action-btn success" onclick="markPaid(${e.id})">Paid</button>` : ''}
          <button class="action-btn" onclick="editExpense(${e.id})">Edit</button>
          <button class="action-btn danger" onclick="deleteExpense(${e.id})">Delete</button>
        </div>
      </td>
    </tr>
  `).join('');
}

function renderCategoryBreakdown() {
  const catMap = {};
  expenses.forEach(e => { catMap[e.category] = (catMap[e.category] || 0) + Number(e.amount); });
  const total = expenses.reduce((s, e) => s + Number(e.amount), 0) || 1;
  const sorted = Object.entries(catMap).sort((a, b) => b[1] - a[1]);

  document.getElementById('catBreakdown').innerHTML = sorted.map(([name, val]) => `
    <div class="cat-bar-row" style="margin-bottom:12px;">
      <div style="display:flex; justify-content:space-between; font-size:12px; margin-bottom:4px;">
        <span>${name}</span>
        <span style="font-weight:600;">₹${val.toLocaleString()}</span>
      </div>
      <div style="height:6px; background:#f1f5f9; border-radius:10px; overflow:hidden;">
        <div style="height:100%; background:var(--accent); width:${Math.min(100, Math.round((val/total)*100))}%;"></div>
      </div>
    </div>
  `).join('');
}

// ============================================
// MODALS & HELPERS
// ============================================

function filterExpenses() {
  const q = document.getElementById('searchInput').value.toLowerCase();
  const cat = document.getElementById('catFilter').value;
  const status = document.getElementById('statusFilter').value;

  filtered = expenses.filter(e => {
    const matchQ = !q || e.vendor.toLowerCase().includes(q) || e.category.toLowerCase().includes(q);
    const matchCat = !cat || e.category === cat;
    const matchStatus = !status || e.status === status;
    return matchQ && matchCat && matchStatus;
  });
  renderTable();
}

function openAddModal() {
  editingId = null;
  document.getElementById('expModalTitle').textContent = 'Add Expense';
  document.getElementById('eDate').value = new Date().toISOString().split('T')[0];
  document.getElementById('eVendor').value = '';
  document.getElementById('eAmount').value = '';
  document.getElementById('eNotes').value = '';
  openModal('expModal');
}

function editExpense(id) {
  const e = expenses.find(x => x.id === id);
  if (!e) return;
  editingId = id;
  document.getElementById('expModalTitle').textContent = 'Edit Expense';
  document.getElementById('eDate').value = e.date;
  document.getElementById('eCat').value = e.category;
  document.getElementById('eVendor').value = e.vendor;
  document.getElementById('eAmount').value = e.amount;
  document.getElementById('ePayMode').value = e.payment_mode;
  document.getElementById('eStatus').value = e.status;
  document.getElementById('eNotes').value = e.notes || '';
  openModal('expModal');
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

window.addEventListener('load', loadExpenses);