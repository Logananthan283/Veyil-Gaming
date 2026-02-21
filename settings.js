/**
 * SETTINGS.JS - Final Clean Version
 * Fixed: Single Toast Export
 * Features: Profile Sync, Password Auth, Backup & Restore
 */

document.addEventListener('DOMContentLoaded', () => {
    if (window.lucide) lucide.createIcons();
    loadSettings();

    const menuBtn = document.getElementById('menuBtn');
    if (menuBtn) {
        menuBtn.addEventListener('click', () => {
            document.getElementById('sidebar').classList.toggle('open');
        });
    }
});

/* ---------------- UI NAVIGATION ---------------- */

function switchPanel(panel, btn) {
    document.querySelectorAll('.sn-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    document.querySelectorAll('.settings-panel').forEach(p => p.classList.remove('active'));
    const target = document.getElementById('panel-' + panel);
    if (target) target.classList.add('active');
}

/* ---------------- LOAD SETTINGS ---------------- */

async function loadSettings() {
    try {
        const { data: business } = await supabase
            .from('business_settings')
            .select('*')
            .eq('id', 1)
            .single();

        if (business) {
            centerName.value = business.center_name || '';
            currency.value = business.currency || 'INR';
            taxRate.value = business.tax_rate || 0;
            openTime.value = business.open_time || '09:00';
            closeTime.value = business.close_time || '23:00';
            address.value = business.address || '';
        }

        const { data: profile } = await supabase
            .from('admin_profiles')
            .select('*')
            .eq('id', 1)
            .single();

        if (profile) {
            firstName.value = profile.first_name || '';
            lastName.value = profile.last_name || '';
            email.value = profile.email || '';
            phone.value = profile.phone || '';

            const bigAvatar = document.getElementById('bigAvatar');

            if (profile.avatar_url) {
                bigAvatar.innerHTML = `
                    <img src="${profile.avatar_url}" 
                    style="width:100%;height:100%;object-fit:cover;border-radius:50%;">
                `;
            } else {
                const initials =
                    ((profile.first_name?.[0] || 'A') +
                        (profile.last_name?.[0] || 'U')).toUpperCase();
                bigAvatar.innerText = initials;
            }
        }
    } catch (err) {
        console.error(err);
        showToast("Connection to cloud failed", "error");
    }
}

/* ---------------- AVATAR UPLOAD ---------------- */

async function uploadAvatar() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';

    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const fileExt = file.name.split('.').pop();
        const fileName = `avatar-${Date.now()}.${fileExt}`;

        try {
            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(fileName, file);

            if (uploadError) throw uploadError;

            const { data } = supabase.storage
                .from('avatars')
                .getPublicUrl(fileName);

            await supabase
                .from('admin_profiles')
                .update({ avatar_url: data.publicUrl })
                .eq('id', 1);

            bigAvatar.innerHTML = `
                <img src="${data.publicUrl}" 
                style="width:100%;height:100%;object-fit:cover;border-radius:50%;">
            `;

            showToast("Profile picture updated!", "success");
        } catch (err) {
            showToast("Upload failed: " + err.message, "error");
        }
    };

    input.click();
}

/* ---------------- SAVE SETTINGS ---------------- */

async function saveSettings() {
    const btn = document.getElementById('saveBtn');
    const original = btn.innerHTML;

    btn.innerText = "Syncing...";
    btn.disabled = true;

    try {
        const profilePayload = {
            first_name: firstName.value,
            last_name: lastName.value,
            email: email.value,
            phone: phone.value
        };

        const businessPayload = {
            center_name: centerName.value,
            currency: currency.value,
            tax_rate: parseFloat(taxRate.value) || 0,
            open_time: openTime.value,
            close_time: closeTime.value,
            address: address.value
        };

        const [p, b] = await Promise.all([
            supabase.from('admin_profiles').update(profilePayload).eq('id', 1),
            supabase.from('business_settings').update(businessPayload).eq('id', 1)
        ]);

        if (p.error || b.error) throw new Error("Sync failed");

        showToast("Cloud backup complete!", "success");
    } catch (err) {
        showToast(err.message, "error");
    } finally {
        btn.innerHTML = original;
        btn.disabled = false;
    }
}

/* ---------------- PASSWORD UPDATE ---------------- */

async function updatePassword() {
    const newPass = newPassInput.value;
    const confirmPass = confirmPassInput.value;

    if (!newPass || newPass !== confirmPass) {
        return showToast("Passwords do not match", "error");
    }

    const { error } = await supabase.auth.updateUser({
        password: newPass
    });

    if (error) {
        showToast(error.message, "error");
    } else {
        showToast("Password updated successfully", "success");
        newPassInput.value = '';
        confirmPassInput.value = '';
        passStrength.innerHTML = '';
    }
}

/* ---------------- FULL DATA EXPORT (FIXED SINGLE TOAST) ---------------- */

async function exportFullData() {
    const tables = [
        'admin_profiles', 'business_settings', 'consoles', 'bookings',
        'expenses', 'inventory', 'master_hours', 'master_players',
        'menu_items', 'pricing_rates', 'system_config'
    ];

    let backupData = {
        export_date: new Date().toISOString(),
        site: "GameCenter Admin",
        data: {}
    };

    try {
        for (const table of tables) {
            const { data, error } = await supabase
                .from(table)
                .select('*')
                .range(0, 9999);

            if (error) throw error;
            backupData.data[table] = data;
        }

        const blob = new Blob(
            [JSON.stringify(backupData, null, 2)],
            { type: 'application/json' }
        );

        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download =
            `GameCenter_Full_Backup_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);

        // ✅ ONLY ONE TOAST
        showToast("Full system backup downloaded successfully!", "success");

    } catch (err) {
        showToast("Export failed: " + err.message, "error");
    }
}

/* ---------------- RESTORE ---------------- */

function openRestoreModal() {
    document.getElementById('importFile').click();
}

async function importFullData(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = async (e) => {
        try {
            const backup = JSON.parse(e.target.result);

            if (!backup.data || backup.site !== "GameCenter Admin") {
                throw new Error("Invalid backup format.");
            }

            const deleteOrder = [
                'bookings', 'expenses', 'inventory', 'menu_items',
                'pricing_rates', 'consoles', 'admin_profiles',
                'business_settings', 'master_hours',
                'master_players', 'system_config'
            ];

            const insertOrder = [...deleteOrder].reverse();

            for (const table of deleteOrder) {
                await supabase.from(table).delete().neq('id', 0);
            }

            for (const table of insertOrder) {
                const data = backup.data[table];
                if (!data || data.length === 0) continue;

                const { error } = await supabase.from(table).insert(data);
                if (error) throw error;
            }

            showToast("System fully restored!", "success");
            setTimeout(() => location.reload(), 1500);

        } catch (err) {
            showToast("Restore failed: " + err.message, "error");
        }
    };

    reader.readAsText(file);
    event.target.value = '';
}

/* ---------------- PASSWORD CHECK ---------------- */

function checkPassword() {
    const pass = newPassInput.value;
    const confirm = confirmPassInput.value;

    if (!pass) {
        passStrength.innerHTML = '';
        return;
    }

    const match = pass === confirm;

    passStrength.innerHTML = confirm
        ? `<div style="margin-top:10px;text-align:right;">
            <span style="color:${match ? '#00ff88' : '#ff4757'};
            font-size:12px;font-weight:600;">
            ${match ? '✓ Passwords Match' : '✗ Mismatch'}
            </span>
           </div>`
        : '';
}

/* ---------------- TOAST SYSTEM ---------------- */

function showToast(msg, type = 'success') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');

    const colors = {
        success: '#00ff88',
        error: '#ff4757',
        info: '#3b82f6'
    };

    toast.innerHTML = `
        <div style="
            display:flex;
            align-items:center;
            gap:12px;
            background:#1a1a1a;
            color:white;
            padding:12px 20px;
            border-radius:8px;
            border-left:4px solid ${colors[type]};
            box-shadow:0 10px 30px rgba(0,0,0,0.5);
            margin-bottom:10px;
            animation: slideIn 0.3s ease forwards;
        ">
            <span style="font-size:13px;font-weight:500;">
                ${msg}
            </span>
        </div>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(20px)';
        toast.style.transition = 'all 0.4s ease';
        setTimeout(() => toast.remove(), 400);
    }, 3000);
}