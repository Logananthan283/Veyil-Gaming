// ============================================
// REPORTS.JS — Fully Synced with Provided SQL
// ============================================

document.getElementById('menuBtn').addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('open');
});

const REPORT_CARDS = [
    { id: 'monthly', name: 'Monthly Revenue', desc: 'Detailed earnings from bookings.', icon: 'indian-rupee', color: '#10b981' },
    { id: 'inventory', name: 'Inventory Usage', desc: 'Stock depletion vs sales tracking.', icon: 'package', color: '#3b82f6' },
    { id: 'peak', name: 'Peak Hours', desc: 'Busiest hours based on start times.', icon: 'clock', color: '#f59e0b' },
    { id: 'loyalty', name: 'Customer Loyalty', desc: 'Returning player statistics.', icon: 'users', color: '#8b5cf6' }
];

let revenueData = [];
let consoleRevenue = [];
let paymentMethods = [];

async function fetchReportData() {
    try {
        if (typeof supabase === 'undefined') throw new Error("Supabase Missing");

        const { data: daily } = await supabase.from('daily_financial_summary').select('*');
        const { data: consoles } = await supabase.from('console_revenue_summary').select('*');
        const { data: bookings } = await supabase.from('bookings').select('paymentmode');

        revenueData = (daily || []).reverse();
        consoleRevenue = consoles || [];

        if (bookings) {
            const counts = bookings.reduce((acc, b) => {
                const mode = b.paymentmode || 'Cash';
                acc[mode] = (acc[mode] || 0) + 1;
                return acc;
            }, {});
            const total = bookings.length || 1;
            paymentMethods = Object.keys(counts).map(key => ({
                name: key,
                value: Math.round((counts[key] / total) * 100),
                color: key === 'UPI' ? '#00ff88' : key === 'Cash' ? '#4488ff' : '#a855f7'
            }));
        }

        renderKPIs();
        renderPaymentMethods();
        renderReportCards();
        
        setTimeout(() => {
            drawRevExpChart();
            drawConsoleRevChart();
        }, 300);

        lucide.createIcons();
    } catch (err) {
        showToast(err.message, "error");
    }
}

function renderReportCards() {
    const container = document.getElementById('reportCards');
    if (!container) return;
    container.innerHTML = REPORT_CARDS.map(r => `
        <div class="card" onclick="openReportDetail('${r.id}')" style="cursor:pointer; padding:20px; transition:0.3s; border: 1px solid transparent;">
            <div style="background:${r.color}15; width:40px; height:40px; border-radius:10px; display:flex; align-items:center; justify-content:center; margin-bottom:15px;">
                <i data-lucide="${r.icon}" style="color:${r.color}; width:20px;"></i>
            </div>
            <div style="font-weight:700; margin-bottom:5px;">${r.name}</div>
            <div style="font-size:12px; color:#94a3b8; line-height:1.4;">${r.desc}</div>
        </div>
    `).join('');
    lucide.createIcons();
}

async function openReportDetail(id) {
    const modal = document.getElementById('reportModal');
    const title = document.getElementById('modalReportTitle');
    const content = document.getElementById('modalReportContent');
    
    const report = REPORT_CARDS.find(r => r.id === id);
    title.innerText = report.name;
    content.innerHTML = '<div style="padding:20px; text-align:center;">Loading...</div>';
    modal.classList.add('open');

    try {
        if (id === 'monthly') {
            const { data } = await supabase.from('bookings')
                .select('playername, mobile, finalamount, date')
                .order('date', {ascending: false}).limit(15);
                
            content.innerHTML = `
                <table style="width:100%; border-collapse:collapse; font-size:13px;">
                    <thead><tr style="text-align:left; border-bottom:1px solid #eee; color:#94a3b8;">
                        <th style="padding:10px;">Player</th><th>Date</th><th>Amount</th>
                    </tr></thead>
                    <tbody>${data.map(d => `
                        <tr>
                            <td style="padding:10px;"><b>${d.playername || 'Guest'}</b><br><small style="color:#888;">${d.mobile || ''}</small></td>
                            <td>${d.date}</td>
                            <td style="color:#10b981; font-weight:700;">₹${d.finalamount || 0}</td>
                        </tr>`).join('')}
                    </tbody>
                </table>`;
        } else if (id === 'loyalty') {
            const { data } = await supabase.from('bookings').select('mobile');
            const counts = data.reduce((acc, b) => { if(b.mobile) acc[b.mobile] = (acc[b.mobile] || 0) + 1; return acc; }, {});
            const total = Object.keys(counts).length;
            const repeat = Object.values(counts).filter(v => v > 1).length;

            content.innerHTML = `
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:15px; padding:10px;">
                    <div style="background:#f8fafc; padding:20px; border-radius:12px; text-align:center;">
                        <div style="font-size:24px; font-weight:800; color:#3b82f6;">${total}</div>
                        <div style="font-size:12px; color:#64748b;">Total Players</div>
                    </div>
                    <div style="background:#f8fafc; padding:20px; border-radius:12px; text-align:center;">
                        <div style="font-size:24px; font-weight:800; color:#8b5cf6;">${repeat}</div>
                        <div style="font-size:12px; color:#64748b;">Repeat Players</div>
                    </div>
                </div>`;
        } else if (id === 'peak') {
            const { data } = await supabase.from('peak_hours_summary').select('*').limit(8);
            content.innerHTML = `
                <div style="padding:5px;">
                    ${data.map(d => {
                        const h = parseInt(d.hour);
                        return `<div style="display:flex; justify-content:space-between; padding:12px; border-bottom:1px solid #f1f5f9; align-items:center;">
                            <span style="font-weight:600;">${h % 12 || 12}:00 ${h >= 12 ? 'PM' : 'AM'}</span>
                            <span style="background:#fef3c7; color:#d97706; padding:4px 10px; border-radius:20px; font-size:11px; font-weight:700;">${d.booking_count} Bookings</span>
                        </div>`;
                    }).join('')}
                </div>`;
        } else {
            content.innerHTML = `<div style="padding:40px; text-align:center; color:#94a3b8;">Inventory records are managed in the Stock tab.</div>`;
        }
    } catch (e) {
        content.innerHTML = `<p style="color:red; padding:20px;">Error: ${e.message}</p>`;
    }
}

function closeReportModal() {
    document.getElementById('reportModal').classList.remove('open');
}

function renderKPIs() {
    const rev = revenueData.reduce((s, d) => s + Number(d.revenue), 0);
    const exp = revenueData.reduce((s, d) => s + Number(d.expense), 0);
    const container = document.getElementById('reportKpis');
    if (!container) return;
    container.innerHTML = `
        <div class="report-kpi"><div class="report-kpi-value">₹${rev.toLocaleString()}</div><div class="report-kpi-label">Revenue</div></div>
        <div class="report-kpi"><div class="report-kpi-value" style="color:#ef4444;">₹${exp.toLocaleString()}</div><div class="report-kpi-label">Expenses</div></div>
        <div class="report-kpi"><div class="report-kpi-value" style="color:#10b981;">₹${(rev-exp).toLocaleString()}</div><div class="report-kpi-label">Net Profit</div></div>
    `;
}

function drawRevExpChart() {
    const canvas = document.getElementById('revExpChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvas.parentElement.clientWidth * dpr;
    canvas.height = canvas.parentElement.clientHeight * dpr;
    ctx.scale(dpr, dpr);

    const W = canvas.parentElement.clientWidth, H = canvas.parentElement.clientHeight;
    if (revenueData.length < 2) return;

    const max = Math.max(...revenueData.map(d => Math.max(d.revenue, d.expense)), 100) * 1.2;
    const stepX = (W - 60) / (revenueData.length - 1);

    ctx.beginPath(); ctx.strokeStyle = '#00ff88'; ctx.lineWidth = 3;
    revenueData.forEach((d, i) => {
        const x = 30 + (i * stepX), y = H - 30 - (d.revenue / max * (H - 60));
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.stroke();
    
    ctx.beginPath(); ctx.strokeStyle = '#4488ff';
    revenueData.forEach((d, i) => {
        const x = 30 + (i * stepX), y = H - 30 - (d.expense / max * (H - 60));
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.stroke();
}

function drawConsoleRevChart() {
    const canvas = document.getElementById('consoleRevChart');
    if (!canvas || consoleRevenue.length === 0) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.parentElement.clientWidth, H = canvas.parentElement.clientHeight;
    canvas.width = W * (window.devicePixelRatio || 1);
    canvas.height = H * (window.devicePixelRatio || 1);
    ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);

    const max = Math.max(...consoleRevenue.map(d => d.revenue), 10);
    consoleRevenue.forEach((d, i) => {
        const barW = (d.revenue / max) * (W - 100);
        const y = 20 + (i * 35);
        ctx.fillStyle = '#a855f7'; ctx.fillRect(80, y, barW, 18);
        ctx.fillStyle = '#94a3b8'; ctx.font = '11px sans-serif'; ctx.textAlign = 'right';
        ctx.fillText(d.console || 'Unknown', 70, y + 13);
    });
}

function renderPaymentMethods() {
    const list = document.getElementById('paymentMethodList');
    if (!list) return;
    list.innerHTML = paymentMethods.map(p => `
        <div style="margin-bottom:12px;">
            <div style="display:flex; justify-content:space-between; font-size:11px; margin-bottom:4px;">
                <span>${p.name}</span><span>${p.value}%</span>
            </div>
            <div style="height:5px; background:#f1f5f9; border-radius:10px; overflow:hidden;">
                <div style="height:100%; background:${p.color}; width:${p.value}%;"></div>
            </div>
        </div>
    `).join('');
}

function showToast(msg, type = 'success') {
    const c = document.getElementById('toastContainer');
    if (!c) return;
    const t = document.createElement('div');
    t.className = `toast toast-${type}`;
    t.innerText = msg;
    c.appendChild(t);
    setTimeout(() => t.remove(), 3000);
}

window.addEventListener('load', fetchReportData);
window.addEventListener('resize', () => { drawRevExpChart(); drawConsoleRevChart(); });
async function generateProfessionalPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;
    const contentWidth = pageWidth - (margin * 2);

    // --- COLOR PALETTE ---
    const colors = {
        primary: [30, 41, 59],   // Slate 800
        accent: [79, 70, 229],    // Indigo 600
        success: [16, 185, 129],  // Emerald 500
        danger: [239, 68, 68],    // Red 500
        text: [71, 85, 105],      // Slate 600
        lightBg: [248, 250, 252]  // Slate 50
    };

    // 1. HEADER SECTION
    doc.setFillColor(...colors.primary);
    doc.rect(0, 0, pageWidth, 45, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont("helvetica", "bold");
    doc.text("GameCenter", margin, 22);
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("BUSINESS PERFORMANCE REPORT", margin, 30);
    doc.text(`Period: Last 10 Days | Generated: ${new Date().toLocaleString()}`, margin, 36);

    // 2. KPI BOXES (Structured Spacing)
    const kpiData = [
        { label: "TOTAL REVENUE", value: document.querySelectorAll('.report-kpi-value')[0].innerText, color: colors.success },
        { label: "TOTAL EXPENSES", value: document.querySelectorAll('.report-kpi-value')[1].innerText, color: colors.danger },
        { label: "NET PROFIT", value: document.querySelectorAll('.report-kpi-value')[2].innerText, color: colors.accent }
    ];

    let xPos = margin;
    const boxWidth = (contentWidth - 10) / 3;

    kpiData.forEach(kpi => {
        doc.setFillColor(...colors.lightBg);
        doc.roundedRect(xPos, 55, boxWidth, 25, 2, 2, 'F');
        
        doc.setFontSize(8);
        doc.setTextColor(...colors.text);
        doc.setFont("helvetica", "bold");
        doc.text(kpi.label, xPos + (boxWidth/2), 63, { align: "center" });
        
        doc.setFontSize(14);
        doc.setTextColor(...kpi.color);
        doc.text(kpi.value, xPos + (boxWidth/2), 73, { align: "center" });
        xPos += boxWidth + 5;
    });

    // 3. MAIN TREND CHART (Large & Clear)
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, 95, pageWidth - margin, 95); // Divider

    doc.setTextColor(...colors.primary);
    doc.setFontSize(12);
    doc.text("Financial Revenue Trend", margin, 105);

    const chartCanvas = await html2canvas(document.getElementById('revExpChart'), { scale: 2 });
    doc.addImage(chartCanvas.toDataURL('image/png'), 'PNG', margin, 110, contentWidth, 60);

    // 4. SECONDARY DATA GRID (Two Columns)
    doc.text("Console Distribution", margin, 185);
    doc.text("Payment Methods", margin + (contentWidth / 2) + 5, 185);

    // Console Chart Capture
    const consoleCanvas = await html2canvas(document.getElementById('consoleRevChart'), { scale: 2 });
    doc.addImage(consoleCanvas.toDataURL('image/png'), 'PNG', margin, 190, (contentWidth / 2) - 5, 50);

    // Payment Methods Table Style
    const paymentRows = paymentMethods.map(p => [p.name, `${p.value}%`]);
    doc.autoTable({
        startY: 190,
        margin: { left: margin + (contentWidth / 2) + 5 },
        tableWidth: (contentWidth / 2) - 5,
        head: [['Method', 'Volume']],
        body: paymentRows,
        theme: 'striped',
        headStyles: { fillColor: colors.primary },
        styles: { fontSize: 8 }
    });

    // 5. FOOTER & PAGE NUMBERING
    const pageCount = doc.internal.getNumberOfPages();
    for(let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(160);
        doc.text(`Page ${i} of ${pageCount}`, pageWidth / 2, 287, { align: "center" });
        doc.text("© 2026 GameCenter Management System", margin, 287);
    }

    // DOWNLOAD
    doc.save(`Performance_Report_${new Date().toISOString().split('T')[0]}.pdf`);
    showToast("Professional PDF Downloaded");
}