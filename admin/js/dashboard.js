

if (!localStorage.getItem('adminLoggedIn')) {
    window.location.href = 'login.html';
}

// Global variables
let bookingsData = [];
let currentPage = 1;
const itemsPerPage = 10;

// Initialize dashboard
document.addEventListener('DOMContentLoaded', function () {
    fetchBookings();
    setInterval(fetchBookings, 30000);
    setupEventListeners();
});

// Event Listeners
function setupEventListeners() {
    // Sidebar controls
    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebarClose = document.getElementById('sidebarCloseBtn');
    if (sidebarToggle) sidebarToggle.addEventListener('click', toggleSidebar);
    if (sidebarClose) sidebarClose.addEventListener('click', toggleSidebar);

    // Logout buttons
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) logoutBtn.addEventListener('click', () => {
        localStorage.clear();
        window.location.href = 'login.html';
    });

    // Window resize
    window.addEventListener('resize', checkScreenSize);
    checkScreenSize();
}

// API Functions
async function fetchBookings() {
    try {
        const response = await fetch('http://localhost:5050/api/bookings');
        const data = await response.json();
        bookingsData = data.data;
        updateDashboard();
    } catch (error) {
        console.error('Fetch error:', error);
        showToast('Error fetching bookings', 'error');
    }
}

async function updateBookingStatus(id, status) {
    try {
        const response = await fetch(`http://localhost:5050/api/bookings/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status }),
        });
        const data = await response.json();
        if (data.success) {
            showToast('Booking updated successfully');
            fetchBookings();
        }
    } catch (error) {
        showToast('Error updating booking', 'error');
    }
}

// Dashboard Updates
function updateDashboard() {
    updateStats();
    renderBookingsTable();
}

function updateStats() {
    const totalBookings = bookingsData.length;
    const activeBookings = bookingsData.filter(b => b.status === 'confirmed').length;
    const todayRevenue = calculateTodayRevenue();
    const totalRevenue = calculateTotalCompletedRevenue();

    document.getElementById('totalBookings').textContent = totalBookings;
    document.getElementById('activeBookings').textContent = activeBookings;
    document.getElementById('todayRevenue').textContent = formatCurrency(todayRevenue);
    document.getElementById('completedRevenue').textContent = formatCurrency(totalRevenue);
}


// Revenue Calculations
function calculateTodayRevenue() {
    const today = new Date();
    const todayDateString = today.toISOString().split('T')[0]; // Get today's date in YYYY-MM-DD format
    return bookingsData
        .filter(b => b.pickup_date.split('T')[0] === todayDateString && b.status === 'completed')
        .reduce((sum, b) => sum + parseFloat(b.total_price || 0), 0);
}


function calculateTotalCompletedRevenue() {
    return bookingsData
        .filter(b => b.status === 'completed')
        .reduce((sum, b) => sum + parseFloat(b.total_price || 0), 0);
}

// Utility Functions
function formatCurrency(amount) {
    const formattedAmount = Number(amount).toFixed(2);
    return `€${formattedAmount}`;
}


// Table Rendering
function renderBookingsTable() {
    const tbody = document.getElementById('bookingsTableBody');
    if (!tbody) return;

    const start = (currentPage - 1) * itemsPerPage;
    const paginatedData = bookingsData.slice(start, start + itemsPerPage);

    tbody.innerHTML = paginatedData.map(booking => `
       
        <tr>
            <td>#${booking.id}</td>
            <td>
                <div>${booking.name || 'N/A'}</div>
                <small class="text-muted">${booking.phone_number || 'N/A'}</small>
            </td>
            <td>
                <div>${booking.pickup_city || 'N/A'}</div>
                <small class="text-muted">${booking.street || 'N/A'}</small>
            </td>
            <td>
                ${booking.areaCode}
            </td>
            <td>
                <div>${formatDate(booking.pickup_date)}</div>
                <small class="text-muted">${booking.pickup_time || 'N/A'}</small>
            </td>
            <td>${booking.vehicle_type || 'N/A'}</td>
            <td>${formatCurrency(booking.total_price || 0)}</td>
            <td>
             ${booking.created_at}
            </td>
            <td><span class="badge bg-${getStatusColor(booking.status)}">${booking.status || 'Pending'}</span></td>
            <td>
                <button onclick="editBooking(${booking.id})" class="btn btn-sm btn-primary">
                    <i class="fas fa-edit"></i> Edit
                </button>
            </td>
        </tr>
    `).join('');
}

// Modal Functions
function editBooking(id) {
    const booking = bookingsData.find(b => b.id === id);
    if (booking) {
        document.getElementById('editBookingId').value = id;
        document.getElementById('editStatus').value = booking.status;
        new bootstrap.Modal(document.getElementById('editModal')).show();
    }
}

// Save Changes Event
document.getElementById('saveChanges')?.addEventListener('click', async () => {
    const id = document.getElementById('editBookingId').value;
    const status = document.getElementById('editStatus').value;
    await updateBookingStatus(id, status);
    bootstrap.Modal.getInstance(document.getElementById('editModal')).hide();
});

function formatDate(dateString) {
    return dateString ? new Date(dateString).toLocaleDateString('de-DE') : 'N/A';
}

function getStatusColor(status) {
    return {
        'pending': 'warning',
        'confirmed': 'success',
        'completed': 'info',
        'cancelled': 'danger',
    }[status] || 'secondary';
}

function showToast(message, type = 'success') {
    Toastify({
        text: message,
        duration: 3000,
        gravity: 'top',
        position: 'right',
        backgroundColor: type === 'success' ? '#4CAF50' : '#f44336',
    }).showToast();
}

// Sidebar Functions
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.getElementById('mainContent');
    sidebar?.classList.toggle('collapsed');
    mainContent?.classList.toggle('expanded');
}

function checkScreenSize() {
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.getElementById('mainContent');
    if (window.innerWidth <= 768) {
        sidebar?.classList.add('collapsed');
        mainContent?.classList.add('expanded');
    }
}



async function exportBookings() {
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF();

    // Company Header
    pdf.setFontSize(18);
    pdf.text("Book Your Driver", 105, 20, { align: "center" });
    pdf.setFontSize(12);
    pdf.text("Bookings List", 105, 30, { align: "center" });
    pdf.text(`Generated on: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`, 105, 40, { align: "center" });
    pdf.line(10, 45, 200, 45); // Draw a line below the header

    // Add table
    const tableBody = bookingsData.map(booking => [
        booking.id,
        booking.name || "N/A",
        booking.pickup_city || "N/A",
        booking.areaCode || "N/A",
        formatDate(booking.pickup_date) || "N/A",
        booking.vehicle_type || "N/A",
        formatCurrency(booking.total_price || 0),
        booking.status || "pending"
    ]);

    pdf.autoTable({
        startY: 50,
        head: [['ID', 'Customer', 'Pickup City', 'Area Code', 'Date', 'Vehicle', 'Price', 'Status']],
        body: tableBody,
        theme: 'grid',
        styles: {
            fontSize: 10,
        },
        headStyles: {
            fillColor: [0, 123, 255], // Bootstrap primary color
            textColor: [255, 255, 255],
        },
    });

    // Footer
    const pageCount = pdf.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        pdf.setPage(i);
        pdf.setFontSize(10);
        pdf.text(`Page ${i} of ${pageCount}`, 105, pdf.internal.pageSize.height - 10, { align: 'center' });
    }

    // Save the PDF
    pdf.save(`Bookings_${new Date().toISOString().split('T')[0]}.pdf`);
}

