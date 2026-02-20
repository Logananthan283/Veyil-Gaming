/**
 * SETTINGS.JS - Full Supabase Integration
 * Handles: Profile, Business Info, Password UI, Notifications, and Security Cloud Sync
 */

// --- 1. UI Initialization & Navigation ---

document.addEventListener('DOMContentLoaded', () => {
    // Initial Data Fetch
    loadSettings();

    // Sidebar Toggle Logic
    const menuBtn = document.getElementById('menuBtn');
    if (menuBtn) {
        menuBtn.addEventListener('click', () => {
            document.getElementById('sidebar').classList.toggle('open');
        });
    }
});

// Tab/Panel Switching Logic
function switchPanel(panel, btn) {
    // Update Button States
    document.querySelectorAll('.sn-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    // Update Panel Visibility
    document.querySelectorAll('.settings-panel').forEach(p => p.classList.remove('active'));
    const target = document.getElementById('panel-' + panel);
    if (target) target.classList.add('active');
}

// --- 2. Data Loading (Fetch from Supabase) ---

async function loadSettings() {
    try {
        // A. Load Business Settings
        const { data: business, error: bErr } = await supabase
            .from('business_settings')
            .select('*')
            .eq('id', 1)
            .single();

        if (business) {
            if (document.getElementById('centerName')) document.getElementById('centerName').value = business.center_name || '';
            if (document.getElementById('currency')) document.getElementById('currency').value = business.currency || 'INR';
            if (document.getElementById('taxRate')) document.getElementById('taxRate').value = business.tax_rate || 0;
            if (document.getElementById('openTime')) document.getElementById('openTime').value = business.open_time || '09:00';
            if (document.getElementById('closeTime')) document.getElementById('closeTime').value = business.close_time || '23:00';
            if (document.getElementById('address')) document.getElementById('address').value = business.address || '';
        }

        // B. Load Admin Profile
        const { data: profile, error: pErr } = await supabase
            .from('admin_profiles')
            .select('*')
            .eq('id', 1)
            .single();

        if (profile) {
            if (document.getElementById('firstName')) document.getElementById('firstName').value = profile.first_name || '';
            if (document.getElementById('lastName')) document.getElementById('lastName').value = profile.last_name || '';
            if (document.getElementById('email')) document.getElementById('email').value = profile.email || '';
            if (document.getElementById('phone')) document.getElementById('phone').value = profile.phone || '';

            // Update UI Avatars & Sidebar Names
            const fName = profile.first_name || 'Admin';
            const lName = profile.last_name || 'User';
            const initials = (fName[0] + (lName[0] || '')).toUpperCase();

            const bigAvatar = document.getElementById('bigAvatar');
            if (bigAvatar) bigAvatar.innerText = initials;

            const sideAvatar = document.getElementById('sideAvatar');
            if (sideAvatar) sideAvatar.innerText = initials;

            const sideName = document.getElementById('sideName');
            if (sideName) sideName.innerText = `${fName} ${lName}`;
        }

        // C. Load System Config (Notifications & Security Toggles)
        const { data: config, error: cErr } = await supabase
            .from('system_config')
            .select('*')
            .eq('id', 1)
            .single();

        if (config) {
            if (document.getElementById('notifEmail')) document.getElementById('notifEmail').checked = config.notif_email;
            if (document.getElementById('notifSMS')) document.getElementById('notifSMS').checked = config.notif_sms;
            if (document.getElementById('notifStock')) document.getElementById('notifStock').checked = config.notif_stock;
            if (document.getElementById('sec2FA')) document.getElementById('sec2FA').checked = config.sec_2fa;
            if (document.getElementById('secTimeout')) document.getElementById('secTimeout').checked = config.sec_timeout;
        }

    } catch (err) {
        console.error("Fetch Error:", err.message);
        showToast("Error connecting to database", "error");
    }
}

// --- 3. Data Saving (Update Supabase) ---

async function saveSettings() {
    const btn = document.getElementById('saveBtn');
    const originalText = btn.innerText;
    
    btn.innerText = 'Saving...';
    btn.disabled = true;

    try {
        // Prepare Business Payload
        const businessPayload = {
            center_name: document.getElementById('centerName').value,
            currency: document.getElementById('currency').value,
            tax_rate: parseFloat(document.getElementById('taxRate').value) || 0,
            open_time: document.getElementById('openTime').value,
            close_time: document.getElementById('closeTime').value,
            address: document.getElementById('address').value
        };

        // Prepare Profile Payload
        const profilePayload = {
            first_name: document.getElementById('firstName').value,
            last_name: document.getElementById('lastName').value,
            email: document.getElementById('email').value,
            phone: document.getElementById('phone').value
        };

        // Prepare System Config Payload (Toggles)
        const configPayload = {
            notif_email: document.getElementById('notifEmail').checked,
            notif_sms: document.getElementById('notifSMS').checked,
            notif_stock: document.getElementById('notifStock').checked,
            sec_2fa: document.getElementById('sec2FA').checked,
            sec_timeout: document.getElementById('secTimeout').checked
        };

        // Execute all updates simultaneously
        const [resB, resP, resC] = await Promise.all([
            supabase.from('business_settings').update(businessPayload).eq('id', 1),
            supabase.from('admin_profiles').update(profilePayload).eq('id', 1),
            supabase.from('system_config').update(configPayload).eq('id', 1)
        ]);
        
        // Check for errors in results
        if (resB.error || resP.error || resC.error) {
            throw new Error("One or more sections failed to update.");
        }

        showToast('All settings synced to cloud!', 'success');
        loadSettings(); // Refresh UI for avatars/sidebar
        
    } catch (err) {
        console.error("Save Error:", err.message);
        showToast(err.message, 'error');
    } finally {
        btn.innerText = originalText;
        btn.disabled = false;
    }
}

// --- 4. Password Strength & Match Logic ---

function checkPassword() {
    const pass = document.getElementById('newPass').value;
    const confirm = document.getElementById('confirmPass').value;
    const container = document.getElementById('passStrength');

    if (!pass) { container.innerHTML = ''; return; }

    let strength = 0;
    let label = 'Weak';
    let color = '#ff4757';

    if (pass.length >= 8) strength++;
    if (/[A-Z]/.test(pass)) strength++;
    if (/[0-9]/.test(pass)) strength++;
    if (/[^A-Za-z0-9]/.test(pass)) strength++;

    if (strength >= 3) { label = 'Strong'; color = '#00ff88'; }
    else if (strength === 2) { label = 'Medium'; color = '#ffa502'; }

    const pct = Math.round((strength / 4) * 100);
    const isMatch = pass === confirm;
    const matchMsg = confirm ? (isMatch ? 
        '<span style="color:#00ff88;font-size:11px;">✓ Match</span>' : 
        '<span style="color:#ff4757;font-size:11px;">✗ Mismatch</span>') : '';

    container.innerHTML = `
        <div class="pass-strength-bar" style="background: rgba(255,255,255,0.1); height: 4px; border-radius: 2px; margin: 8px 0;">
            <div class="pass-strength-fill" style="width:${pct}%; background:${color}; height:100%; border-radius:2px; transition: all 0.3s;"></div>
        </div>
        <div style="display:flex; justify-content:space-between; align-items:center;">
            <span style="font-size:11px; color:${color}; font-weight:600;">Strength: ${label}</span>
            ${matchMsg}
        </div>`;
}

// --- 5. Notification Toast UI ---

function showToast(msg, type = 'success') {
    const icons = { success: '✓', error: '✗', warning: '⚠', info: 'ℹ' };
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.style.display = 'flex';
    toast.style.alignItems = 'center';
    toast.style.gap = '10px';
    
    toast.innerHTML = `
        <span class="toast-icon" style="font-weight:bold;">${icons[type]}</span>
        <span class="toast-msg">${msg}</span>
    `;

    container.appendChild(toast);

    // Animate out and remove
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(20px)';
        toast.style.transition = 'all 0.4s ease';
        setTimeout(() => toast.remove(), 400);
    }, 3000);
}