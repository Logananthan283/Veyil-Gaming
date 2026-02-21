/**
 * BOOKING-LIST.JS
 * Full Version: Corrected Column Order, 12-Hour Format,
 * Automatic Status Completion + Manual "Done" Override.
 * INTEGRATED WITH LUCIDE ICONS - VERTICAL ALIGNMENT
 */

// 1. Sidebar Toggle Logic
document.getElementById('menuBtn').addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('open');
});

// 2. State Management
let allBookings = [];
let filteredBookings = [];
let currentPage = 1;
const rowsPerPage = 20;

// ============================================
// NEW: AUTOMATIC STATUS WATCHDOG
// ============================================
async function autoCheckStatus() {
    const now = new Date();
    let statusChanged = false;

    // Only check sessions currently marked as 'active'
    const activeSessions = allBookings.filter(b => b.status === 'active');

    for (let b of activeSessions) {
        if (!b.starttime || !b.date) continue;

        // Create a Date object for the session end time
        const [h, m] = b.starttime.split(':').map(Number);
        const endTime = new Date(b.date);
        endTime.setHours(h, m, 0);
        endTime.setMinutes(endTime.getMinutes() + (parseFloat(b.hours) * 60));

        // Compare: If current time is past calculated end time
        if (now >= endTime) {
            const { error } = await supabase
                .from('bookings')
                .update({ status: 'completed' })
                .eq('id', b.id);

            if (!error) {
                b.status = 'completed'; // Update local state
                statusChanged = true;
            }
        }
    }

    if (statusChanged) {
        showToast("Sessions automatically completed", "info");
        renderTable();
        renderStats();
    }
}

// ============================================
// UI FEEDBACK (Your Original Full Logic)
// ============================================
function showToast(msg, type = 'success') {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const t = document.createElement('div');
    t.className = `toast toast-${type}`;
    t.style.cssText = `
        background: ${type === 'success' ? '#00ff88' : type === 'info' ? '#00d4ff' : '#ff4444'};
        color: #000; padding: 12px 20px; border-radius: 8px; font-weight: 600;
        margin-top: 10px; box-shadow: 0 4px 15px rgba(0,0,0,0.3); animation: slideIn 0.3s ease forwards;
    `;
    t.innerText = msg;
    container.appendChild(t);
    setTimeout(() => { 
        t.style.opacity = '0'; 
        setTimeout(() => t.remove(), 500); 
    }, 3000);
}

function customConfirm(message, actionText, onConfirm) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay open';
    overlay.style.zIndex = '9999';
    overlay.innerHTML = `
        <div class="modal" style="max-width: 350px; text-align: center; border: 1px solid var(--accent); background: #111; color: #fff; padding: 20px; border-radius: 12px;">
            <div class="modal-header"><div class="modal-title" style="font-size: 1.2rem; margin-bottom: 10px;">Confirmation</div></div>
            <div class="modal-body"><p style="margin-bottom: 20px; color: #ccc;">${message}</p></div>
            <div class="modal-footer" style="display:flex; gap:10px; justify-content:center;">
                <button class="btn btn-ghost" id="confirmCancel">Cancel</button>
                <button class="btn btn-primary" id="confirmYes">${actionText}</button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);
    document.getElementById('confirmCancel').onclick = () => overlay.remove();
    document.getElementById('confirmYes').onclick = () => { onConfirm(); overlay.remove(); };
}

// ============================================
// DATA FETCHING & FORMATTING
// ============================================
function formatTimeSafe(t) {
    if (!t) return '—';
    const [h, m] = t.split(':');
    const date = new Date();
    date.setHours(h, m, 0);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
}

function calculateEndTime(startTimeStr, durationHours) {
    if (!startTimeStr) return '—';
    const [h, m] = startTimeStr.split(':').map(Number);
    const date = new Date();
    date.setHours(h, m, 0);
    date.setMinutes(date.getMinutes() + (parseFloat(durationHours) * 60));
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
}

async function fetchBookings() {
    try {
        const { data, error } = await supabase
            .from('bookings')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        allBookings = data.map(b => ({
            ...b,
            playerName: b.playername || 'Guest',
            displayStartTime: formatTimeSafe(b.starttime),
            displayEndTime: calculateEndTime(b.starttime, b.hours),
            finalAmount: b.finalamount || 0,
            status: b.status || 'active'
        }));

        filterBookings();
        autoCheckStatus(); 
    } catch (err) {
        showToast(err.message, "error");
    }
}

// ============================================
// RENDERING
// ============================================
function renderTable() {
    const tbody = document.getElementById('bookingTableBody');
    const start = (currentPage - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    const paginatedItems = filteredBookings.slice(start, end);

    if (filteredBookings.length === 0) {
        tbody.innerHTML = '<tr><td colspan="14" style="text-align:center; padding:40px;">No bookings found.</td></tr>';
        updatePaginationInfo(0, 0, 0);
        return;
    }

    tbody.innerHTML = paginatedItems.map((b, index) => {
        const sNo = start + index + 1;
        const statusClass = b.status === 'active' ? 'badge-active' : 'badge-completed';
        
        return `
            <tr>
                <td>${sNo}</td>
                <td>
                    <div class="td-primary">${b.playerName}</div>
                    <div style="font-size:11px; color:var(--text-muted);">${b.mobile || ''}</div>
                </td>
                <td>${b.console} (${b.players}P)</td>
                <td>${b.hours}h</td>
                <td>${b.date}</td>
                <td class="time-col">${b.displayStartTime}</td>
                <td class="time-col">${b.displayEndTime}</td>
                <td>${b.hours} hrs</td>
                <td>₹0</td> 
                <td>₹${b.finalamount}</td>
                <td>₹${b.finalamount}</td>
                <td>${b.paymentmode}</td>
                <td><span class="badge ${statusClass}">${b.status}</span></td>
                <td>
                    <div class="action-row" style="display: flex; gap: 4px; justify-content: center; align-items: center; flex-wrap: nowrap;">
                        <button class="action-btn" title="View"
                            style="background: rgba(0, 255, 136, 0.1); color: #00ff88; border: 1px solid #00ff88; padding: 4px; border-radius: 4px; cursor: pointer; transition: all 0.2s;"
                            onclick="viewBooking('${b.id}')"><i data-lucide="eye" style="width:14px;height:14px;"></i></button>
                        
                        <button class="action-btn btn-edit" title="Edit" onclick="editBooking('${b.id}')"><i data-lucide="edit-3" style="width:14px;height:14px;"></i></button>
                        <button class="action-btn btn-delete" title="Delete" onclick="confirmDelete('${b.id}')"><i data-lucide="trash-2" style="width:14px;height:14px;"></i></button>
                        
                        ${b.status === 'active' ? `<button class="action-btn success" title="Done" onclick="confirmCompletion('${b.id}')" style="background: rgba(168, 85, 247, 0.1); color: #a855f7; border: 1px solid #a855f7; padding: 4px; border-radius: 4px;"><i data-lucide="check-circle" style="width:14px;height:14px;"></i></button>` : ''}
                    </div>
                </td>
            </tr>
          `;
    }).join('');

    updatePaginationInfo(start + 1, Math.min(end, filteredBookings.length), filteredBookings.length);
    if(window.lucide) lucide.createIcons();
}

function updatePaginationInfo(start, end, total) {
    document.getElementById('paginationInfo').innerText = `Showing ${start} to ${end} of ${total} entries`;
    document.getElementById('prevPage').disabled = currentPage === 1;
    document.getElementById('nextPage').disabled = end >= total;
}

function changePage(dir) {
    currentPage += dir;
    renderTable();
}

// ============================================
// ACTIONS
// ============================================
function confirmCompletion(id) {
    customConfirm("Mark session as finished?", "Complete", async () => {
        const { error } = await supabase.from('bookings').update({ status: 'completed' }).eq('id', id);
        if (!error) { showToast("Session Completed"); fetchBookings(); }
    });
}

function confirmDelete(id) {
    customConfirm("Delete this record?", "Delete", async () => {
        const { error } = await supabase.from('bookings').delete().eq('id', id);
        if (!error) { showToast("Deleted", "error"); fetchBookings(); }
    });
}

function editBooking(id) {
    window.location.href = `add-booking.html?edit=${id}`;
}

function viewBooking(id) {
    const b = allBookings.find(x => x.id == id);
    if (!b) return;

    const modalBody = document.getElementById('viewModalContent');
    const totalP = parseInt(b.players || 0) + parseInt(b.additionalplayers || 0);

    modalBody.innerHTML = `
        <div id="receipt-area" style="color: #fff; font-family: sans-serif;">
            <div style="text-align: center; border-bottom: 1px solid #333; padding-bottom: 5px; margin-bottom: 10px;">
                <h2 style="margin: 0; color: #00ff88; font-size: 1.2rem; letter-spacing: 1px;">GAMECENTER</h2>
                <p style="font-size: 9px; color: #888; margin: 2px 0;">ID: ${b.id.slice(0,8).toUpperCase()}</p>
            </div>

            <div style="display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 12px;">
                <span><strong>Customer:</strong> ${b.playerName}</span>
                <span style="color: #00ff88; font-weight: bold;">${b.status.toUpperCase()}</span>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px 15px; font-size: 11px; margin-bottom: 12px; background: rgba(255,255,255,0.03); padding: 8px; border-radius: 4px;">
                <div><span style="color: #888;">Console:</span><br><strong>${b.console}</strong></div>
                <div><span style="color: #888;">Date:</span><br><strong>${b.date}</strong></div>
                <div><span style="color: #888;">Players:</span><br><strong>${b.players} Primary</strong></div>
                <div><span style="color: #888;">Additional:</span><br><strong>+ ${b.additionalplayers || 0} Extra</strong></div>
                <div style="grid-column: span 2; border-top: 1px solid #333; padding-top: 4px;">
                    <span style="color: #888;">Time Slot:</span> <strong>${b.displayStartTime} - ${b.displayEndTime}</strong>
                </div>
                <div style="grid-column: span 2;">
                    <span style="color: #888;">Total People:</span> <strong style="color: #00ff88;">${totalP} Players</strong>
                </div>
            </div>

            <div style="background: #00ff88; color: #000; padding: 8px; border-radius: 4px; display: flex; justify-content: space-between; align-items: center;">
                <span style="font-weight: bold; font-size: 11px;">TOTAL PAID</span>
                <span style="font-weight: 900; font-size: 15px;">₹${b.finalamount}</span>
            </div>
        </div>
        
        <button onclick="printReceipt()" style="width: 100%; padding: 10px; background: #222; color: #00ff88; border: 1px solid #00ff88; border-radius: 4px; cursor: pointer; font-weight: bold; margin-top: 12px; font-size: 12px; display:flex; align-items:center; justify-content:center; gap:8px;">
            <i data-lucide="printer" style="width:14px; height:14px;"></i> PRINT RECEIPT
        </button>
    `;
    
    const modalContainer = modalBody.parentElement;
    if(modalContainer) {
        modalContainer.style.overflow = 'hidden';
        modalContainer.style.maxHeight = '90vh';
    }
    
    document.getElementById('viewModal').classList.add('open');
    if(window.lucide) lucide.createIcons();
}

function printReceipt() {
    const receiptContent = document.getElementById('receipt-area').innerHTML;
    const printWindow = window.open('', '', 'height=600,width=450');

    printWindow.document.write(`
        <html>
            <head>
                <title>GameCenter Receipt</title>
                <style>
                    body { font-family: sans-serif; padding: 30px; color: #000; background: #fff; }
                    h2 { margin: 0; font-size: 22px; text-align: center; }
                    strong { color: #000; }
                    div { margin-bottom: 8px; }
                    [style*="grid"] { display: block !important; }
                    [style*="grid"] > div { border-bottom: 1px solid #eee; padding: 5px 0; }
                </style>
            </head>
            <body>
                ${receiptContent}
                <div style="text-align:center; margin-top: 20px; font-size: 10px; border-top: 1px dashed #000; padding-top: 10px;">
                    Thank you for playing!
                </div>
                <script>
                    window.onload = function() {
                        window.print();
                        setTimeout(() => { window.close(); }, 500);
                    };
                </script>
            </body>
        </html>
    `);
    printWindow.document.close();
}

function filterBookings() {
    const query = document.getElementById('searchInput').value.toLowerCase();
    const status = document.getElementById('statusFilter').value;
    
    filteredBookings = allBookings.filter(b => {
        const matchSearch = b.playerName.toLowerCase().includes(query) || 
                            (b.mobile && b.mobile.includes(query)) || 
                            b.console.toLowerCase().includes(query);
        const matchStatus = !status || b.status === status;
        return matchSearch && matchStatus;
    });
    
    currentPage = 1;
    renderTable();
    renderStats();
}

/**
 * UPDATED RENDERSTATS: 
 * Matches the vertical stacked design (Icon Top -> Value Middle -> Label Bottom)
 */
function renderStats() {
    const active = allBookings.filter(b => b.status === 'active').length;
    const rawRevenue = allBookings.reduce((sum, b) => sum + parseFloat(b.finalamount || 0), 0);
    const totalDiscount = allBookings.reduce((sum, b) => sum + parseFloat(b.discount || 0), 0);
    const finalRevenue = rawRevenue - totalDiscount;

    // Use flex-nowrap on the container to keep everything in one line
    const container = document.getElementById('bookingStats');
    container.style.display = 'flex';
    container.style.flexWrap = 'nowrap';
    container.style.overflowX = 'auto'; // Allows horizontal scrolling if the screen is too small
    container.style.gap = '15px';

    container.innerHTML = `
        <div class="stat-chip" style="border-color: #2bfff4; display:flex; flex-direction:column; align-items:center; justify-content:center; min-width:180px; height:120px; flex:1; padding:15px; text-align:center; background: rgba(43, 255, 244, 0.05);">
            <i data-lucide="database" style="color:#2bfff4; width:20px; height:20px; margin-bottom:8px;"></i>
            <div class="stat-chip-value" style="color: #2bfff4; font-size:22px; font-weight:800;">${allBookings.length}</div>
            <div class="stat-chip-label" style="color:#888; font-size:11px; text-transform:uppercase; letter-spacing:0.5px;">Total Records</div>
        </div>
        
        <div class="stat-chip" style="border-color:#00ff88; display:flex; flex-direction:column; align-items:center; justify-content:center; min-width:180px; height:120px; flex:1; padding:15px; text-align:center; background: rgba(0, 255, 136, 0.05);">
            <i data-lucide="play-circle" style="color:#00ff88; width:20px; height:20px; margin-bottom:8px;"></i>
            <div class="stat-chip-value" style="color:#00ff88; font-size:22px; font-weight:800;">${active}</div>
            <div class="stat-chip-label" style="color:#888; font-size:11px; text-transform:uppercase; letter-spacing:0.5px;">Active Sessions</div>
        </div>

        <div class="stat-chip" style="border-color: #f619fd; display:flex; flex-direction:column; align-items:center; justify-content:center; min-width:180px; height:120px; flex:1; padding:15px; text-align:center; background: rgba(246, 25, 253, 0.05);">
            <i data-lucide="indian-rupee" style="color:#f619fd; width:20px; height:20px; margin-bottom:8px;"></i>
            <div class="stat-chip-value" style="color: #f619fd; font-size:22px; font-weight:800;">₹${rawRevenue.toFixed(0)}</div>
            <div class="stat-chip-label" style="color:#888; font-size:11px; text-transform:uppercase; letter-spacing:0.5px;">Console Revenue</div>
        </div>

        <div class="stat-chip" style="border-color: #ef4444; display:flex; flex-direction:column; align-items:center; justify-content:center; min-width:180px; height:120px; flex:1; padding:15px; text-align:center; background: rgba(239, 68, 68, 0.05);">
            <i data-lucide="percent" style="color:#ef4444; width:20px; height:20px; margin-bottom:8px;"></i>
            <div class="stat-chip-value" style="color: #ef4444; font-size:22px; font-weight:800;">₹${totalDiscount.toFixed(0)}</div>
            <div class="stat-chip-label" style="color:#888; font-size:11px; text-transform:uppercase; letter-spacing:0.5px;">Total Discount</div>
        </div>

        <div class="stat-chip" style="border-color: #06f2fa; display:flex; flex-direction:column; align-items:center; justify-content:center; min-width:180px; height:120px; flex:1; padding:15px; text-align:center; background: rgba(6, 242, 250, 0.05);">
            <i data-lucide="wallet" style="color:#06f2fa; width:20px; height:20px; margin-bottom:8px;"></i>
            <div class="stat-chip-value" style="color: #06f2fa; font-size:22px; font-weight:800;">₹${finalRevenue.toFixed(0)}</div>
            <div class="stat-chip-label" style="color:#888; font-size:11px; text-transform:uppercase; letter-spacing:0.5px;">Final Cost Revenue</div>
        </div>
    `;
    if(window.lucide) lucide.createIcons();
}

function clearFilters() {
    document.getElementById('searchInput').value = '';
    document.getElementById('statusFilter').value = '';
    filterBookings();
}

function closeModal(id) { 
    document.getElementById(id).classList.remove('open'); 
}

// ============================================
// INITIALIZATION & TIMER
// ============================================
window.addEventListener('load', () => {
    fetchBookings();
    setInterval(autoCheckStatus, 30000);
});
async function exportToPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('l', 'mm', 'a4'); // Landscape for better table fit

    // Header Branding
    doc.setFillColor(30, 41, 59);
    doc.rect(0, 0, 297, 30, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.text("GAMECENTER - BOOKING REPORT", 15, 15);
    doc.setFontSize(10);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 15, 22);

    const tableData = filteredBookings.map((b, i) => [
        i + 1,
        b.playerName,
        b.console,
        b.date,
        b.displayStartTime,
        b.displayEndTime,
        b.hours + 'h',
        `Rs. ${b.finalamount}`,
        b.paymentmode,
        b.status.toUpperCase()
    ]);

    doc.autoTable({
        startY: 35,
        head: [['#', 'Customer', 'Console', 'Date', 'Start', 'End', 'Dur.', 'Amount', 'Mode', 'Status']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [79, 70, 229], textColor: 255 },
        styles: { fontSize: 8, cellPadding: 3 },
        columnStyles: {
            7: { fontStyle: 'bold' }, // Amount column
            9: { fontStyle: 'bold' }  // Status column
        },
        didParseCell: function(data) {
            if (data.section === 'body' && data.column.index === 9) {
                const val = data.cell.raw;
                if (val === 'ACTIVE') data.cell.styles.textColor = [16, 185, 129];
            }
        }
    });

    doc.save(`Bookings_Report_${new Date().toISOString().slice(0,10)}.pdf`);
    showToast("PDF Exported Successfully");
}
function exportToExcel() {
    // Prepare data specifically for Excel
    const excelData = filteredBookings.map((b, i) => ({
        "S.No": i + 1,
        "Customer Name": b.playerName,
        "Mobile": b.mobile || 'N/A',
        "Console": b.console,
        "Players": b.players,
        "Date": b.date,
        "Start Time": b.displayStartTime,
        "End Time": b.displayEndTime,
        "Duration (Hrs)": b.hours,
        "Amount (INR)": b.finalamount,
        "Payment Mode": b.paymentmode,
        "Status": b.status
    }));

    // Create worksheet
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Bookings");

    // Adjust column widths automatically
    const wscols = [
        {wch: 5}, {wch: 20}, {wch: 15}, {wch: 15}, {wch: 8}, 
        {wch: 12}, {wch: 12}, {wch: 12}, {wch: 10}, {wch: 12}, {wch: 12}, {wch: 12}
    ];
    worksheet['!cols'] = wscols;

    // Download file
    XLSX.writeFile(workbook, `GameCenter_Bookings_${new Date().toISOString().slice(0,10)}.xlsx`);
    showToast("Excel Exported Successfully");
}