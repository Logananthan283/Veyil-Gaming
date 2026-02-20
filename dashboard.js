let revChart = null;
let pkChart = null;

async function initDashboard() {
    try {
        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];
        
        const { data: bookings, error: bErr } = await supabase.from('bookings').select('*');
        const { data: consoles, error: cErr } = await supabase.from('consoles').select('*').order('name');

        if (bErr || cErr) throw (bErr || cErr);

        const todayBookings = bookings.filter(b => b.date === todayStr);
        const todayRevenue = todayBookings.reduce((sum, b) => sum + (Number(b.finalamount) || 0), 0);

        const activeConsoles = consoles.filter(c => {
            return todayBookings.some(b => {
                if (b.status === 'completed' || b.console !== c.name) return false;
                const [h, m] = b.starttime.split(':').map(Number);
                const end = new Date(b.date);
                end.setHours(h, m, 0);
                end.setMinutes(end.getMinutes() + (parseFloat(b.hours) * 60));
                return now < end;
            });
        });

        // 1. Render KPIs with Lucide Icons
      document.getElementById('kpiGrid').innerHTML = `
    <div class="kpi-card" style="border: 1px solid #00ff88; display:flex; flex-direction:column; align-items:center; justify-content:center; min-width:180px; height:140px; flex:1; padding:20px; text-align:center; background: rgba(0, 255, 136, 0.05); border-radius: 12px; gap: 8px;">
        <div class="kpi-icon icon-green" style="margin-bottom: 5px;">
            <i data-lucide="banknote" style="color:#00ff88; width:28px; height:28px;"></i>
        </div>
        <div class="kpi-value" style="color: #00ff88; font-size:24px; font-weight:800;">₹${todayRevenue.toLocaleString()}</div>
        <div class="kpi-label" style="color:#888; font-size:12px; text-transform:uppercase; letter-spacing:0.5px;">Today Revenue</div>
    </div>

    <div class="kpi-card" style="border: 1px solid #3b82f6; display:flex; flex-direction:column; align-items:center; justify-content:center; min-width:180px; height:140px; flex:1; padding:20px; text-align:center; background: rgba(59, 130, 246, 0.05); border-radius: 12px; gap: 8px;">
        <div class="kpi-icon icon-blue" style="margin-bottom: 5px;">
            <i data-lucide="gamepad-2" style="color:#3b82f6; width:28px; height:28px;"></i>
        </div>
        <div class="kpi-value" style="color: #3b82f6; font-size:24px; font-weight:800;">${activeConsoles.length}/${consoles.length}</div>
        <div class="kpi-label" style="color:#888; font-size:12px; text-transform:uppercase; letter-spacing:0.5px;">Active Now</div>
    </div>

    <div class="kpi-card" style="border: 1px solid #a855f7; display:flex; flex-direction:column; align-items:center; justify-content:center; min-width:180px; height:140px; flex:1; padding:20px; text-align:center; background: rgba(168, 85, 247, 0.05); border-radius: 12px; gap: 8px;">
        <div class="kpi-icon icon-purple" style="margin-bottom: 5px;">
            <i data-lucide="calendar-check" style="color:#a855f7; width:28px; height:28px;"></i>
        </div>
        <div class="kpi-value" style="color: #a855f7; font-size:24px; font-weight:800;">${todayBookings.length}</div>
        <div class="kpi-label" style="color:#888; font-size:12px; text-transform:uppercase; letter-spacing:0.5px;">Today's Bookings</div>
    </div>
`;
// Always re-initialize icons after updating innerHTML
if(window.lucide) lucide.createIcons();

        // 2. Render Recent Bookings
        const recentBox = document.getElementById('recentBookings');
        const recentList = todayBookings.slice(-5).reverse();
        recentBox.innerHTML = recentList.length ? recentList.map(b => `
            <div class="booking-row">
                <div class="booking-info">
                    <div class="booking-avatar">${(b.playername || 'G')[0].toUpperCase()}</div>
                    <div>
                        <div class="booking-name">${b.playername}</div>
                        <div class="booking-detail">${b.console} • ${b.hours}h</div>
                    </div>
                </div>
                <div class="booking-amount">₹${b.finalamount}</div>
            </div>
        `).join('') : '<div style="color:var(--text-muted); padding:20px; text-align:center;">No bookings yet</div>';

        // 3. Render Status
        document.getElementById('consoleStatus').innerHTML = consoles.map(c => {
            const isActive = activeConsoles.some(ac => ac.id === c.id);
            return `
                <div class="console-status-row">
                    <div class="console-dot ${isActive ? 'active' : 'available'}"></div>
                    <span class="console-name">${c.name}</span>
                    <span style="font-size:10px; opacity:0.6; margin-left: auto;">${isActive ? 'BUSY' : 'READY'}</span>
                </div>
            `;
        }).join('');

        renderCharts(bookings, todayBookings);
        
        // RE-INITIALIZE ICONS (Ensures dynamically added icons appear)
        lucide.createIcons();

    } catch (err) {
        console.error("Dashboard Error:", err);
    }
}

function renderCharts(all, today) {
    const revCtx = document.getElementById('revenueChart').getContext('2d');
    const pkCtx = document.getElementById('peakChart').getContext('2d');

    const revData = {};
    // Last 7 days for the trend
    all.slice(-30).forEach(b => {
        const d = new Date(b.date).toLocaleDateString('en-GB', {day:'2-digit', month:'short'});
        revData[d] = (revData[d] || 0) + Number(b.finalamount);
    });

    if(revChart) revChart.destroy();
    revChart = new Chart(revCtx, {
        type: 'line',
        data: {
            labels: Object.keys(revData),
            datasets: [{ 
                label: 'Revenue', 
                data: Object.values(revData), 
                borderColor: '#00ff88', 
                backgroundColor: 'rgba(0,255,136,0.05)',
                fill: true,
                tension: 0.4 
            }]
        },
        options: { 
            responsive: true, 
            maintainAspectRatio: false, 
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' } } }
        }
    });

    const hrs = Array(24).fill(0);
    today.forEach(b => { if(b.starttime) hrs[parseInt(b.starttime.split(':')[0])]++ });

    if(pkChart) pkChart.destroy();
    pkChart = new Chart(pkCtx, {
        type: 'bar',
        data: {
            labels: ["10am", "12pm", "2pm", "4pm", "6pm", "8pm", "10pm"],
            datasets: [{ 
                data: [hrs[10], hrs[12], hrs[14], hrs[16], hrs[18], hrs[20], hrs[22]], 
                backgroundColor: '#3b82f6', 
                borderRadius: 4 
            }]
        },
        options: { 
            responsive: true, 
            maintainAspectRatio: false, 
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' } } }
        }
    });
}

// Start the dashboard
window.onload = initDashboard;