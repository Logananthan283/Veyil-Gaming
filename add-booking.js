/**
 * ADD-BOOKING.JS - Full 370+ Line Version
 * Real-time Functional, Edit-Aware, Multi-Player Support & 10-Digit Validation
 */

let CONSOLES = [], FB_ITEMS = [], RATES = [], MASTER_HOURS = [], MASTER_PLAYERS = [];
let state = { 
    duration: 0.5, 
    fbItems: {}, 
    paymentMethod: 'Cash', 
    finalTotal: 0 
};

// Check if we are in Edit Mode via URL
const urlParams = new URLSearchParams(window.location.search);
const editId = urlParams.get('edit');

// --- 1. NOTIFICATIONS ---
function showNotification(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `custom-toast toast-${type}`;
    toast.innerHTML = `<span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 100);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// --- 2. TIME & INPUT FORMATTING ---
function convertTo12Hour(time24) {
    if (!time24) return "--:-- --";
    let [h, m] = time24.split(':');
    h = parseInt(h);
    const suffix = h >= 12 ? "PM" : "AM";
    h = h % 12 || 12; 
    return `${String(h).padStart(2, '0')}:${m} ${suffix}`;
}

// RESTRICT INPUT TO 10 DIGITS NATIVELY
document.addEventListener('input', function (e) {
    if (e.target.type === 'tel') {
        // Remove non-numeric characters and limit to 10
        e.target.value = e.target.value.replace(/[^0-9]/g, '').slice(0, 10);
    }
});

// --- 3. DATA LOADING ---
async function loadDbData() {
    try {
        const { data: consoles } = await supabase.from('consoles').select('*').eq('status', 'active');
        const { data: hours } = await supabase.from('master_hours').select('*').order('hour_value');
        const { data: players } = await supabase.from('master_players').select('*').order('player_count');
        const { data: rates } = await supabase.from('pricing_rates').select('*').eq('status', 'active');
        const { data: menu } = await supabase.from('menu_items').select('*').eq('status', 'active');

        CONSOLES = consoles || [];
        MASTER_HOURS = hours || [];
        MASTER_PLAYERS = players || [];
        RATES = rates || [];
        FB_ITEMS = menu || [];

        populateDropdowns();
        renderFB();
        setupSlider();

        if (editId) {
            await loadBookingForEdit(editId);
            document.querySelector('.topbar-title').innerText = "Edit Booking";
            const saveBtn = document.querySelector('.btn-primary[onclick="confirmBooking()"]');
            if(saveBtn) saveBtn.innerText = "UPDATE BOOKING";
        } else {
            document.getElementById('bookingDate').valueAsDate = new Date();
            const now = new Date();
            const nowStr = now.getHours().toString().padStart(2, '0') + ":" + now.getMinutes().toString().padStart(2, '0');
            document.getElementById('startTime').value = nowStr;
            handleTimeChange(); 
        }

    } catch (err) { 
        showNotification("DB Error: " + err.message, "error"); 
    }
}

// --- 4. DYNAMIC PLAYER FIELDS ---
function updatePlayerFields() {
    const count = parseInt(document.getElementById('numPlayers').value);
    const container = document.getElementById('additionalPlayersContainer');
    const list = document.getElementById('playerFieldsList');
    
    if(!list || !container) return;
    list.innerHTML = '';

    if (count > 1) {
        container.style.display = 'block';
        for (let i = 2; i <= count; i++) {
            const playerRow = document.createElement('div');
            playerRow.className = 'form-row mt-10';
            playerRow.innerHTML = `
                <div class="form-group">
                    <label class="form-label">Player ${i} Name</label>
                    <input type="text" class="form-input extra-player-name" placeholder="Name for Player ${i}">
                </div>
                <div class="form-group">
                    <label class="form-label">Player ${i} Phone</label>
                    <input type="tel" class="form-input extra-player-phone" placeholder="10 Digits">
                </div>
            `;
            list.appendChild(playerRow);
        }
    } else {
        container.style.display = 'none';
    }
}

// --- 5. EDIT MODE LOADING ---
async function loadBookingForEdit(id) {
    const { data, error } = await supabase.from('bookings').select('*').eq('id', id).single();
    if (error) return showNotification(error.message, "error");

    if (data) {
        document.getElementById('customerName').value = data.playername;
        document.getElementById('customerPhone').value = data.mobile;
        document.getElementById('customerPlace').value = data.place;
        document.getElementById('bookingDate').value = data.date;
        document.getElementById('consoleSelect').value = data.console;
        document.getElementById('numPlayers').value = data.players;
        document.getElementById('startTime').value = data.starttime;
        
        updatePlayerFields();

        if (data.additional_players && Array.isArray(data.additional_players)) {
            const extraNames = document.querySelectorAll('.extra-player-name');
            const extraPhones = document.querySelectorAll('.extra-player-phone');
            data.additional_players.forEach((p, idx) => {
                if(extraNames[idx]) extraNames[idx].value = p.name || '';
                if(extraPhones[idx]) extraPhones[idx].value = p.phone || '';
            });
        }

        state.duration = parseFloat(data.hours);
        matchSliderToDuration(state.duration);
        
        if(data.paymentmode && data.paymentmode.includes('Mixed')) {
            setPayment('Mixed');
            const cashPart = data.paymentmode.match(/C:([\d.]+)/);
            if(cashPart) document.getElementById('mixCash').value = cashPart[1];
        } else {
            setPayment(data.paymentmode || 'Cash');
        }

        handleTimeChange();
    }
}

function populateDropdowns() {
    document.getElementById('consoleSelect').innerHTML = CONSOLES.map(c => `<option value="${c.name}">${c.name}</option>`).join('');
    
    const playerSelect = document.getElementById('numPlayers');
    playerSelect.innerHTML = MASTER_PLAYERS.map(p => `<option value="${p.player_count}">${p.player_count} Players</option>`).join('');
    
    playerSelect.onchange = () => {
        updatePlayerFields();
        updateSummary();
    };
}

// --- 6. SLIDER LOGIC ---
function setupSlider() {
    const slider = document.getElementById('durationSlider');
    if (!slider || MASTER_HOURS.length === 0) return;
    slider.min = 0;
    slider.max = MASTER_HOURS.length - 1;
    slider.step = 1;
    
    if(!editId) {
        const halfHourIdx = MASTER_HOURS.findIndex(h => parseFloat(h.hour_value) === 0.5);
        slider.value = halfHourIdx !== -1 ? halfHourIdx : 0;
        updateDurationFromSlider(slider.value);
    }
    
    slider.oninput = function() { updateDurationFromSlider(this.value); };
}

function matchSliderToDuration(val) {
    let closestIdx = 0;
    let minDiff = Infinity;
    MASTER_HOURS.forEach((h, idx) => {
        let d = Math.abs(parseFloat(h.hour_value) - val);
        if (d < minDiff) { minDiff = d; closestIdx = idx; }
    });
    document.getElementById('durationSlider').value = closestIdx;
    document.getElementById('durationLabel').innerText = `${val} hrs`;
}

function updateDurationFromSlider(index) {
    const selectedHourObj = MASTER_HOURS[index];
    if (!selectedHourObj) return;
    state.duration = parseFloat(selectedHourObj.hour_value);
    document.getElementById('durationLabel').innerText = selectedHourObj.label || `${state.duration} hrs`;
    
    calculateEndTimeAuto(); 
    updateDurationGapDisplay();
    updateSummary();
}

// --- 7. TIME CALCULATIONS ---
function calculateDiffInHours(startStr, endStr) {
    const [sh, sm] = startStr.split(':').map(Number);
    const [eh, em] = endStr.split(':').map(Number);
    let startTotal = sh * 60 + sm;
    let endTotal = eh * 60 + em;
    if (endTotal < startTotal) endTotal += 1440; 
    return (endTotal - startTotal) / 60;
}

function handleTimeChange() {
    calculateEndTimeAuto();
    updateDurationGapDisplay();
    updateSummary();
}

function calculateEndTimeAuto() {
    const start = document.getElementById('startTime').value;
    if (!start) return;
    const [h, m] = start.split(':').map(Number);
    let totalMins = h * 60 + m + (state.duration * 60);
    
    let endH = Math.floor(totalMins / 60) % 24;
    let endM = Math.floor(totalMins % 60);
    const time24 = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
    
    document.getElementById('endTimeInput').value = time24;
    document.getElementById('endTime').value = time24;
    
    document.getElementById('startTime12h').innerText = convertTo12Hour(start);
    document.getElementById('endTime12h').innerText = convertTo12Hour(time24);
}

function handleEndTimeManualChange(new24Time) {
    const start = document.getElementById('startTime').value;
    if (!start || !new24Time) return;

    const diffHrs = calculateDiffInHours(start, new24Time);
    state.duration = diffHrs;

    matchSliderToDuration(diffHrs);
    document.getElementById('endTime').value = new24Time;
    document.getElementById('endTime12h').innerText = convertTo12Hour(new24Time);

    updateDurationGapDisplay();
    updateSummary();
}

function updateDurationGapDisplay() {
    const start = document.getElementById('startTime').value;
    const end = document.getElementById('endTimeInput').value;
    if (!start || !end) return;

    const diffHrs = calculateDiffInHours(start, end);
    const totalMins = Math.round(diffHrs * 60);
    const h = Math.floor(totalMins / 60);
    const m = totalMins % 60;

    document.getElementById('totalDurationDisplay').value = `${h}h ${m}m Total Session`;
}

// --- 8. SUMMARY & PRO-RATA PAYMENTS ---
function updateSummary() {
    const consoleName = document.getElementById('consoleSelect').value;
    const players = parseInt(document.getElementById('numPlayers').value);
    const discount = parseFloat(document.getElementById('discountInput').value) || 0;

    const start = document.getElementById('startTime').value;
    const end = document.getElementById('endTimeInput').value;
    const actualDuration = (start && end) ? calculateDiffInHours(start, end) : state.duration;

    const baseRateEntry = RATES.find(r => 
        r.console === consoleName && 
        parseInt(r.players) === players
    );

    let consoleCost = 0;
    if (baseRateEntry) {
        const hourlyRate = parseFloat(baseRateEntry.price) / parseFloat(baseRateEntry.hours);
        consoleCost = hourlyRate * actualDuration;
    }

    let fbTotal = 0;
    FB_ITEMS.forEach(item => { if(state.fbItems[item.id]) fbTotal += parseFloat(item.price); });

    state.finalTotal = (consoleCost + fbTotal) - discount;
    document.getElementById('sumConsoleCost').innerText = `₹${consoleCost.toFixed(2)}`;
    document.getElementById('sumFB').innerText = `₹${fbTotal.toFixed(2)}`;
    document.getElementById('sumTotal').innerText = `₹${Math.max(0, state.finalTotal).toFixed(2)}`;
    
    if (state.paymentMethod === 'Mixed') calculateMixedBalance();
}

// --- 9. FB & PAYMENT UTILS ---
function renderFB() {
    const grid = document.getElementById('fbGrid');
    if(!grid) return;
    grid.innerHTML = FB_ITEMS.map(item => `
        <div class="fb-item-small ${state.fbItems[item.id] ? 'selected' : ''}" onclick="toggleFB('${item.id}')">
            <div class="fb-name-sm">${item.name}</div>
            <div class="fb-price-sm">₹${item.price}</div>
        </div>
    `).join('');
}

function toggleFB(id) { state.fbItems[id] = !state.fbItems[id]; renderFB(); updateSummary(); }

function setPayment(type) { 
    state.paymentMethod = type; 
    document.querySelectorAll('.pay-btn').forEach(b => b.classList.remove('active'));
    const target = document.getElementById('pay' + type);
    if(target) target.classList.add('active');
    document.getElementById('mixedInputs').style.display = (type === 'Mixed') ? 'flex' : 'none';
    updateSummary(); 
}

function calculateMixedBalance() {
    if (state.paymentMethod !== 'Mixed') return;
    const cash = parseFloat(document.getElementById('mixCash').value) || 0;
    const upi = Math.max(0, state.finalTotal - cash);
    document.getElementById('mixUPI').value = upi.toFixed(2);
}

// --- 10. FINAL SAVE / UPDATE WITH VALIDATION ---
async function confirmBooking() {
    const name = document.getElementById('customerName').value.trim();
    const phone = document.getElementById('customerPhone').value.trim();
    const place = document.getElementById('customerPlace').value.trim();
    
    // VALIDATION REGEX FOR 10 DIGITS
    const phoneRegex = /^[0-9]{10}$/;

    if (!name || !place) return showNotification("Name and Place required", "error");
    
    // Validate Main Phone
    if (!phoneRegex.test(phone)) {
        return showNotification("Main Phone must be 10 digits", "error");
    }

    // Collect and Validate Dynamic Player Data
    const extraNames = document.querySelectorAll('.extra-player-name');
    const extraPhones = document.querySelectorAll('.extra-player-phone');
    let additionalPlayersData = [];
    let extraPhoneError = false;

    extraNames.forEach((input, index) => {
        const pName = input.value.trim();
        const pPhone = extraPhones[index].value.trim();
        
        if(pName !== "") {
            // If a player phone is entered, it must be 10 digits
            if (pPhone !== "" && !phoneRegex.test(pPhone)) {
                extraPhoneError = `Player ${index + 2} phone must be 10 digits`;
            }
            additionalPlayersData.push({ name: pName, phone: pPhone });
        }
    });

    if (extraPhoneError) return showNotification(extraPhoneError, "error");

    const payload = {
        playername: name,
        mobile: phone,
        place: place,
        console: document.getElementById('consoleSelect').value,
        players: parseInt(document.getElementById('numPlayers').value),
        hours: state.duration,
        starttime: document.getElementById('startTime').value,
        date: document.getElementById('bookingDate').value,
        finalamount: state.finalTotal,
        additional_players: additionalPlayersData,
        paymentmode: state.paymentMethod === 'Mixed' ? 
            `Mixed (C:${document.getElementById('mixCash').value}, U:${document.getElementById('mixUPI').value})` : 
            state.paymentMethod,
        status: 'active'
    };

    let result;
    if (editId) {
        result = await supabase.from('bookings').update(payload).eq('id', editId);
    } else {
        result = await supabase.from('bookings').insert([payload]);
    }

    if (!result.error) {
        showNotification(editId ? "Booking Updated!" : "Booking Saved!");
        setTimeout(() => window.location.href = 'booking-list.html', 1500);
    } else {
        showNotification(result.error.message, "error");
    }
}

window.onload = loadDbData;