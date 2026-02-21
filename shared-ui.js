/**
 * SHARED-UI.JS - Syncs both Top Bar Pill and Sidebar Footer
 */
async function syncProfileUI() {
    // 1. Wait for Supabase to be ready
    if (typeof supabase === 'undefined' || typeof supabase.from !== 'function') {
        setTimeout(syncProfileUI, 50);
        return;
    }

    // --- TARGETS ---
    // Top Bar Pill elements
    const pillContainer = document.getElementById('profilePill');
    const pillName = document.getElementById('adminNameDisplay');
    const pillAvatar = document.getElementById('adminInitial');

    // Sidebar Footer elements
    const sideName = document.querySelector('.user-name');
    const sideAvatar = document.querySelector('.user-avatar');

    // --- STEP A: INSTANT CACHE RENDER ---
    const cachedName = localStorage.getItem('user-name') || "Admin";
    const cachedAvatar = localStorage.getItem('user-avatar');

    // Render Names
    if (pillName) pillName.innerText = cachedName;
    if (sideName) sideName.innerText = cachedName;

    // Render Avatars
    if (cachedAvatar && cachedAvatar !== "null") {
        const imgHTML = `<img src="${cachedAvatar}" style="width:100%; height:100%; object-fit:cover; border-radius:50%;">`;
        
        if (pillAvatar && !pillAvatar.querySelector('img')) {
            pillAvatar.innerHTML = imgHTML;
            pillAvatar.style.background = "transparent";
        }
        if (sideAvatar && !sideAvatar.querySelector('img')) {
            sideAvatar.innerHTML = imgHTML;
        }
    } else {
        const init = cachedName.charAt(0).toUpperCase();
        if (pillAvatar && !pillAvatar.innerText) {
            pillAvatar.innerText = init;
            pillAvatar.style.background = "#00ff88";
        }
        if (sideAvatar && !sideAvatar.innerText) {
            sideAvatar.innerText = init;
        }
    }

    if (pillContainer) pillContainer.style.display = 'flex';

    // --- STEP B: BACKGROUND SYNC ---
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profile } = await supabase
            .from('admin_profiles')
            .select('first_name, last_name, avatar_url')
            .eq('email', user.email)
            .single();

        if (profile) {
            const fullName = `${profile.first_name || 'Admin'} ${profile.last_name || ''}`;
            const cloudUrl = profile.avatar_url;

            // Update Name only if different
            if (fullName !== cachedName) {
                if (pillName) pillName.innerText = fullName;
                if (sideName) sideName.innerText = fullName;
                localStorage.setItem('user-name', fullName);
            }

            // --- THE ANTI-FLICKER GUARD ---
            if (cloudUrl) {
                // Check Pill Avatar
                const currentPillImg = pillAvatar ? pillAvatar.querySelector('img') : null;
                if (pillAvatar && (!currentPillImg || currentPillImg.src !== cloudUrl)) {
                    pillAvatar.innerHTML = `<img src="${cloudUrl}" style="width:100%; height:100%; object-fit:cover; border-radius:50%;">`;
                    pillAvatar.style.background = "transparent";
                }

                // Check Sidebar Avatar
                const currentSideImg = sideAvatar ? sideAvatar.querySelector('img') : null;
                if (sideAvatar && (!currentSideImg || currentSideImg.src !== cloudUrl)) {
                    sideAvatar.innerHTML = `<img src="${cloudUrl}" style="width:100%; height:100%; object-fit:cover; border-radius:50%;">`;
                }

                localStorage.setItem('user-avatar', cloudUrl);
            } else {
                // No image in DB: Show initials
                const init = fullName.charAt(0).toUpperCase();
                if (pillAvatar) {
                    pillAvatar.innerHTML = "";
                    pillAvatar.innerText = init;
                    pillAvatar.style.background = "#00ff88";
                }
                if (sideAvatar) {
                    sideAvatar.innerHTML = "";
                    sideAvatar.innerText = init;
                }
                localStorage.removeItem('user-avatar');
            }
        }
    } catch (e) {
        console.warn("Profile sync skipped:", e.message);
    }
}

// Start immediately
syncProfileUI();