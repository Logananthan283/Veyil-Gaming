let currentFilter = 'all';
let masterData = [];

async function loadDashboard() {
    try {
        const now = new Date();
        const today = now.toISOString().split('T')[0];

        const { data: consoles, error: cErr } = await supabase.from('consoles').select('*').order('name');
        const { data: bookings, error: bErr } = await supabase.from('bookings').select('*').eq('status', 'active');

        if (cErr || bErr) throw (cErr || bErr);

        masterData = consoles.map(c => {
            const activeSession = bookings.find(b => {
                const nameMatch = b.console?.trim() === c.name?.trim();
                const dateMatch = b.date === today;
                
                if (b.starttime && b.hours) {
                    const [h, m] = b.starttime.split(':').map(Number);
                    const endTime = new Date(b.date);
                    endTime.setHours(h, m, 0);
                    endTime.setMinutes(endTime.getMinutes() + (parseFloat(b.hours) * 60));
                    return nameMatch && dateMatch && (now < endTime);
                }
                return false;
            });

            return activeSession ? {
                ...c,
                is_active: true,
                player: activeSession.playername || 'Guest',
                starttime: activeSession.starttime,
                hours: activeSession.hours,
                bookingId: activeSession.id,
                date: activeSession.date
            } : { ...c, is_active: false };
        });

        renderUI();
        updateSummary();
        document.getElementById('syncTime').innerText = "Last Sync: " + now.toLocaleTimeString();
    } catch (err) {
        console.error("Dashboard Sync Error:", err.message);
    }
}

function setFilter(filter, btn) {
    currentFilter = filter;
    document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    renderUI();
}

function renderUI() {
    const grid = document.getElementById('consoleGrid');
    const filtered = masterData.filter(c => {
        if (currentFilter === 'active') return c.is_active;
        if (currentFilter === 'available') return !c.is_active;
        return true;
    });

    grid.innerHTML = filtered.map(c => {
        let timeLeft = 0;
        let progress = 0;
        if (c.is_active) {
            timeLeft = calculateMins(c.starttime, c.hours, c.date);
            progress = Math.max(0, Math.min(100, (timeLeft / (c.hours * 60)) * 100));
        }

        return `
            <div class="console-card ${c.is_active ? 'active-card' : 'available-card'}" style="display: flex; flex-direction: column; gap: 16px; padding: 20px; border-radius: 12px; border: 1px solid ${c.is_active ? 'var(--accent)' : '#333'}; background: #111;">
                
                <div class="cc-top" style="display: flex; justify-content: space-between; align-items: flex-start;">
                    <div class="cc-icon-wrap" style="display: flex; gap: 12px; align-items: center;">
                        <div class="cc-icon" style="width: 40px; height: 40px; border-radius: 8px; display: flex; align-items: center; justify-content: center; background: ${c.is_active ? 'rgba(0, 255, 136, 0.1)' : '#222'}; color: ${c.is_active ? '#00ff88' : '#666'};">
                            <i data-lucide="${c.is_active ? 'gamepad-2' : 'power-off'}" style="width: 20px; height: 20px;"></i>
                        </div>
                        <div>
                            <div class="cc-name" style="font-weight: 700; font-size: 16px; color: #fff;">${c.name}</div>
                            <div class="cc-type" style="font-size: 12px; color: #888;">${c.type || 'Gaming Station'}</div>
                        </div>
                    </div>
                    <span class="cc-status-badge" style="display: flex; align-items: center; gap: 6px; font-size: 10px; font-weight: 800; letter-spacing: 1px; color: ${c.is_active ? '#00ff88' : '#888'};">
                        <span class="sc-dot ${c.is_active ? 'active' : 'available'}" style="width: 6px; height: 6px; border-radius: 50%; background: ${c.is_active ? '#00ff88' : '#444'}; ${c.is_active ? 'box-shadow: 0 0 8px #00ff88;' : ''}"></span>
                        ${c.is_active ? 'ACTIVE' : 'READY'}
                    </span>
                </div>

                <div class="cc-session" style="flex-grow: 1; display: flex; flex-direction: column; gap: 12px;">
                    ${c.is_active ? `
                        <div class="cc-session-row" style="display: flex; justify-content: space-between; align-items: center;">
                            <span class="cc-session-label" style="color: #888; font-size: 13px; display: flex; align-items: center;"><i data-lucide="user" style="width:14px; height:14px; margin-right:6px;"></i> Player</span>
                            <span class="cc-session-val" style="color: #fff; font-weight: 600;">${c.player}</span>
                        </div>
                        
                        <div style="margin-top: 4px;">
                            <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 6px;">
                                <span style="font-size: 11px; color: #666; text-transform: uppercase;">Time Remaining</span>
                                <span class="cc-timer ${timeLeft < 10 ? 'urgent-timer' : 'active-timer'}" style="font-size: 18px; font-weight: 800; color: ${timeLeft < 10 ? '#ef4444' : '#00ff88'};">
                                    ${timeLeft}m
                                </span>
                            </div>
                            <div class="time-progress" style="width: 100%; height: 6px; background: #222; border-radius: 10px; overflow: hidden;">
                                <div class="time-progress-bar" style="width: ${progress}%; height: 100%; transition: width 0.5s ease; background: ${timeLeft < 10 ? '#ef4444' : '#00ff88'};"></div>
                            </div>
                        </div>
                    ` : `
                        <div style="height: 60px; display: flex; align-items: center; justify-content: center; border: 1px dashed #333; border-radius: 8px; color: #444; font-weight: 700; letter-spacing: 2px;">
                            VACANT
                        </div>
                    `}
                </div>

                <div class="cc-actions">
                    ${c.is_active ? 
                        `<button class="cc-action end-btn" onclick="endSession('${c.bookingId}')" style="width: 100%; padding: 10px; border-radius: 6px; background: rgba(239, 68, 68, 0.1); color: #ef4444; border: 1px solid #ef4444; cursor: pointer; display: flex; align-items: center; justify-content: center; font-weight: 600; gap: 8px; transition: 0.2s;">
                            <i data-lucide="square" style="width:16px; height: 16px;"></i> End Session
                        </button>` : 
                        `<button class="cc-action book-btn" onclick="location.href='add-booking.html?console=${encodeURIComponent(c.name)}'" style="width: 100%; padding: 10px; border-radius: 6px; background: #00ff88; color: #000; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; font-weight: 700; gap: 8px; transition: 0.2s;">
                            <i data-lucide="plus" style="width:16px; height: 16px;"></i> New Booking
                        </button>`
                    }
                </div>
            </div>
        `;
    }).join('');

    lucide.createIcons();
}

function calculateMins(start, hrs, date) {
    const [h, m] = start.split(':').map(Number);
    const end = new Date(date);
    end.setHours(h, m, 0);
    end.setMinutes(end.getMinutes() + (parseFloat(hrs) * 60));
    return Math.max(0, Math.floor((end - new Date()) / 60000));
}

function updateSummary() {
    const activeCount = masterData.filter(c => c.is_active).length;
    document.getElementById('statusSummary').innerHTML = `
        <div class="status-chip active-chip">
            <i data-lucide="activity" style="width:14px; margin-right:6px;"></i> Active: ${activeCount}
        </div>
        <div class="status-chip available-chip">
            <i data-lucide="check-circle" style="width:14px; margin-right:6px;"></i> Available: ${masterData.length - activeCount}
        </div>
    `;
    // RE-INITIALIZE ICONS AFTER RENDERING SUMMARY
    lucide.createIcons();
}

async function endSession(id) {
    if(!confirm("Are you sure you want to end this session early?")) return;
    const { error } = await supabase.from('bookings').update({ status: 'completed' }).eq('id', id);
    if(!error) loadDashboard();
}

window.onload = () => {
    loadDashboard();
    setInterval(loadDashboard, 30000); 
};