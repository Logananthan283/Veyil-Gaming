/**
 * MASTER.JS - Type field removed from Consoles
 */

// --- 1. CORE UI LOGIC ---
const menuBtn = document.getElementById('menuBtn');
if (menuBtn) {
    menuBtn.addEventListener('click', () => document.getElementById('sidebar').classList.toggle('open'));
}

function switchTab(tabId, btn) {
    document.querySelectorAll('.ms-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.ms-panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('tab-' + tabId).classList.add('active');
}

function openModal(id) { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }

// --- 2. DATABASE OPERATIONS ---

// CONSOLES (TAB 1) - Type Removed
async function loadConsoles() {
    const { data } = await supabase.from('consoles').select('*').order('name');
    const tbody = document.getElementById('consoleTableBody');
    tbody.innerHTML = (data || []).map(c => `
        <tr>
            <td>${c.name}</td>
            <td><span class="badge ${c.status === 'active' ? 'badge-active' : 'badge-expired'}">${c.status}</span></td>
            <td><button class="action-btn danger" onclick="deleteItem('consoles', ${c.id}, loadConsoles)">Delete</button></td>
        </tr>
    `).join('');
}

async function saveConsole() {
    const payload = {
        name: document.getElementById('cName').value,
        status: document.getElementById('cStatus').value
    };
    if (!payload.name) return alert("Name is required");
    const { error } = await supabase.from('consoles').insert([payload]);
    if (error) alert(error.message);
    else { 
        document.getElementById('cName').value = '';
        closeModal('consoleModal'); 
        loadConsoles(); 
    }
}

// PLAYERS (TAB 2)
async function loadPlayersMaster() {
    const { data } = await supabase.from('master_players').select('*').order('player_count');
    const tbody = document.getElementById('playerTableBody');
    tbody.innerHTML = (data || []).map(p => `
        <tr>
            <td>${p.player_count} Players</td>
            <td><span class="badge badge-active">${p.status}</span></td>
            <td><button class="action-btn danger" onclick="deleteItem('master_players', ${p.id}, loadPlayersMaster)">Delete</button></td>
        </tr>
    `).join('');
}

async function savePlayerMaster() {
    const count = parseInt(document.getElementById('mPlayerCount').value);
    if (!count) return alert("Enter player count");
    const { error } = await supabase.from('master_players').insert([{ player_count: count }]);
    if (error) alert(error.message);
    else { 
        document.getElementById('mPlayerCount').value = '';
        closeModal('playerModal'); 
        loadPlayersMaster(); 
    }
}

// HOURS (TAB 3)
async function loadHoursMaster() {
    const { data } = await supabase.from('master_hours').select('*').order('hour_value');
    const tbody = document.getElementById('hourTableBody');
    tbody.innerHTML = (data || []).map(h => `
        <tr>
            <td>${h.hour_value} Hrs</td>
            <td>${h.label}</td>
            <td><span class="badge badge-active">${h.status}</span></td>
            <td><button class="action-btn danger" onclick="deleteItem('master_hours', ${h.id}, loadHoursMaster)">Delete</button></td>
        </tr>
    `).join('');
}

async function saveHourMaster() {
    const val = parseFloat(document.getElementById('mHourValue').value);
    const lbl = document.getElementById('mHourLabel').value;
    if (!val || !lbl) return alert("Value and Label are required");
    const { error } = await supabase.from('master_hours').insert([{ hour_value: val, label: lbl }]);
    if (error) alert(error.message);
    else { 
        document.getElementById('mHourValue').value = '';
        document.getElementById('mHourLabel').value = '';
        closeModal('hourModal'); 
        loadHoursMaster(); 
    }
}

// PRICING (TAB 4)
async function preparePricingModal() {
    const { data: con } = await supabase.from('consoles').select('name').eq('status', 'active');
    const { data: pla } = await supabase.from('master_players').select('player_count');
    const { data: hrs } = await supabase.from('master_hours').select('*');

    document.getElementById('price-console').innerHTML = con.map(c => `<option>${c.name}</option>`).join('');
    document.getElementById('price-players').innerHTML = pla.map(p => `<option value="${p.player_count}">${p.player_count} Players</option>`).join('');
    document.getElementById('price-hours').innerHTML = hrs.map(h => `<option value="${h.hour_value}">${h.label}</option>`).join('');
    openModal('pricingModal');
}

async function loadPricing() {
    const { data } = await supabase.from('pricing_rates').select('*');
    const tbody = document.getElementById('pricingTableBody');
    tbody.innerHTML = (data || []).map(p => `
        <tr>
            <td>${p.console}</td>
            <td>${p.players} Players</td>
            <td>${p.hours} Hrs</td>
            <td style="font-weight:bold; color:var(--accent);">₹${p.price}</td>
            <td><button class="action-btn danger" onclick="deleteItem('pricing_rates', ${p.id}, loadPricing)">Delete</button></td>
        </tr>
    `).join('');
}

async function savePricing() {
    const payload = {
        console: document.getElementById('price-console').value,
        players: parseInt(document.getElementById('price-players').value),
        hours: document.getElementById('price-hours').value,
        price: parseFloat(document.getElementById('price-amount').value),
        status: 'active'
    };
    if (isNaN(payload.price)) return alert("Enter price");
    const { error } = await supabase.from('pricing_rates').insert([payload]);
    if (error) alert(error.message);
    else { 
        document.getElementById('price-amount').value = '';
        closeModal('pricingModal'); 
        loadPricing(); 
    }
}

// F&B (TAB 5)
async function loadFB() {
    const { data } = await supabase.from('menu_items').select('*').order('name');
    const tbody = document.getElementById('fbTableBody');
    tbody.innerHTML = (data || []).map(f => `
        <tr>
            <td>${f.name}</td>
            <td>${f.category}</td>
            <td>₹${f.price}</td>
            <td><button class="action-btn danger" onclick="deleteItem('menu_items', ${f.id}, loadFB)">Delete</button></td>
        </tr>
    `).join('');
}

async function saveFB() {
    const payload = {
        name: document.getElementById('fName').value,
        category: document.getElementById('fCat').value,
        price: parseFloat(document.getElementById('fPrice').value),
        status: 'active'
    };
    if (!payload.name) return alert("Enter item name");
    const { error } = await supabase.from('menu_items').insert([payload]);
    if (error) alert(error.message);
    else { 
        document.getElementById('fName').value = '';
        document.getElementById('fPrice').value = '';
        closeModal('fbModal'); 
        loadFB(); 
    }
}

// --- 3. SHARED UTILITIES ---
async function deleteItem(table, id, callback) {
    if (!confirm("Confirm permanent deletion?")) return;
    const { error } = await supabase.from(table).delete().eq('id', id);
    if (error) alert(error.message);
    else callback();
}

// --- 4. INITIALIZATION ---
window.onload = () => {
    loadConsoles();
    loadPlayersMaster();
    loadHoursMaster();
    loadPricing();
    loadFB();
    
    // Auto-active nav link
    const path = window.location.pathname.split("/").pop();
    document.querySelectorAll('.nav-link').forEach(link => {
        if (link.getAttribute('href') === path) link.classList.add('active');
    });
};