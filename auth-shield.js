// auth-shield.js
(async function() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        // Kick unauthorized users back to login
        window.location.href = 'index.html'; 
    }
})();

// Add a Logout function globally
async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = 'index.html';
}