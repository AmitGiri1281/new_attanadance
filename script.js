// Initialize variables
let attendanceData = JSON.parse(localStorage.getItem("attendanceData")) || [];
let studentData = JSON.parse(localStorage.getItem("studentData")) || [];
let currentStudent = null;
let currentAdmin = null;
let currentPage = 1;
const recordsPerPage = 10;
const toastEl = document.getElementById('liveToast');
const toast = new bootstrap.Toast(toastEl);
const qrModal = new bootstrap.Modal(document.getElementById('qrModal'));

// Admin credentials (in a real app, this would be server-side)
const ADMIN_CREDENTIALS = {
    username: "admin",
    password: "admin123"
};

// Initialize time display
function updateClock() {
    const now = new Date();
    document.getElementById('current-time').textContent = now.toLocaleTimeString();
    document.getElementById('current-date').textContent = now.toLocaleDateString('en-US', { 
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
    });
}
setInterval(updateClock, 1000);
updateClock();

// Show toast notification
function showToast(title, message, type = 'info') {
    const toastHeader = toastEl.querySelector('.toast-header');
    const toastBody = toastEl.querySelector('.toast-body');
    
    // Remove previous color classes
    toastHeader.className = 'toast-header';
    toastBody.className = 'toast-body';
    
    // Add appropriate color based on type
    switch(type) {
        case 'success':
            toastHeader.classList.add('bg-success', 'text-white');
            break;
        case 'danger':
            toastHeader.classList.add('bg-danger', 'text-white');
            break;
        case 'warning':
            toastHeader.classList.add('bg-warning', 'text-dark');
            break;
        case 'primary':
            toastHeader.classList.add('bg-primary', 'text-white');
            break;
        default:
            toastHeader.classList.add('bg-info', 'text-white');
    }
    
    document.getElementById('toast-title').textContent = title;
    document.getElementById('toast-message').textContent = message;
    toast.show();
}

// Login functions
function login() {
    const studentId = document.getElementById("student-id").value.trim();
    const studentName = document.getElementById("student-name").value.trim();
    const studentCourse = document.getElementById("student-course").value;
    
    if (!studentId) {
        showToast('Error', 'Please enter your Student ID!', 'danger');
        return;
    }

    if (!studentName) {
        showToast('Error', 'Please enter your Name!', 'danger');
        return;
    }

    if (!studentCourse) {
        showToast('Error', 'Please select your Course!', 'danger');
        return;
    }

    // Check if student exists or create new record
    let student = studentData.find(s => s.id === studentId);
    if (!student) {
        student = { 
            id: studentId, 
            name: studentName, 
            course: studentCourse,
            qrCode: generateQRCodeData(studentId)
        };
        studentData.push(student);
        localStorage.setItem("studentData", JSON.stringify(studentData));
    }

    currentStudent = student;
    
    // Animate login transition
    document.getElementById("login-section").classList.add("hidden");
    setTimeout(() => {
        document.getElementById("dashboard").classList.remove("hidden");
        document.getElementById("dashboard").classList.add("fade-in");
        document.getElementById("student-name-display").textContent = studentName;
        
        // Check if already marked attendance today
        const today = new Date().toLocaleDateString();
        const alreadyMarked = attendanceData.some(record => 
            record.studentId === studentId && record.date === today
        );
        
        if (alreadyMarked) {
            document.getElementById("attendance-status").textContent = "Present";
            document.getElementById("attendance-status").className = "badge bg-success";
            document.getElementById("mark-attendance").disabled = true;
            document.getElementById("mark-attendance").textContent = "Attendance Marked";
            document.getElementById("mark-attendance").classList.remove("btn-success");
            document.getElementById("mark-attendance").classList.add("btn-secondary");
        } else {
            document.getElementById("attendance-status").textContent = "Not Marked";
            document.getElementById("attendance-status").className = "badge bg-danger";
        }
        
        getLocation();
    }, 300);
    
    showToast('Welcome', `Logged in as ${studentName}`, 'success');
}

function logout() {
    currentStudent = null;
    document.getElementById("dashboard").classList.add("hidden");
    document.getElementById("login-section").classList.remove("hidden");
    document.getElementById("login-form").reset();
    showToast('Logged Out', 'You have been logged out', 'info');
}

// Admin functions
function toggleAdminLogin() {
    const adminLogin = document.getElementById("admin-login");
    if (adminLogin.classList.contains("hidden")) {
        adminLogin.classList.remove("hidden");
        adminLogin.classList.add("fade-in");
    } else {
        adminLogin.classList.add("hidden");
    }
}

function adminLogin() {
    const username = document.getElementById("admin-username").value.trim();
    const password = document.getElementById("admin-password").value.trim();
    
    if (username === ADMIN_CREDENTIALS.username && password === ADMIN_CREDENTIALS.password) {
        currentAdmin = ADMIN_CREDENTIALS;
        document.getElementById("admin-login").classList.add("hidden");
        document.getElementById("login-section").classList.add("hidden");
        document.getElementById("admin-dashboard").classList.remove("hidden");
        document.getElementById("admin-dashboard").classList.add("fade-in");
        
        // Update admin dashboard stats
        updateAdminStats();
        
        showToast('Admin Access', 'Welcome to Admin Dashboard', 'primary');
    } else {
        showToast('Access Denied', 'Invalid admin credentials', 'danger');
    }
}

function adminLogout() {
    currentAdmin = null;
    document.getElementById("admin-dashboard").classList.add("hidden");
    document.getElementById("login-section").classList.remove("hidden");
    document.getElementById("admin-form").reset();
    showToast('Admin Logout', 'Admin session ended', 'info');
}

function updateAdminStats() {
    document.getElementById("total-students").textContent = studentData.length;
    
    const today = new Date().toLocaleDateString();
    const presentToday = attendanceData.filter(record => record.date === today).length;
    document.getElementById("present-today").textContent = presentToday;
    
    // This is a simplified calculation - in a real app you'd compare against registered students
    document.getElementById("absent-today").textContent = studentData.length - presentToday;
}

// Geolocation functions
function getLocation() {
    if (navigator.geolocation) {
        document.getElementById("location-status").textContent = "Detecting your location...";
        navigator.geolocation.getCurrentPosition(
            showPosition, 
            showError, 
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    } else {
        document.getElementById("location-status").textContent = "Geolocation not supported.";
        showToast('Error', 'Geolocation not supported by your browser', 'warning');
    }
}

function showPosition(position) {
    const { latitude, longitude, accuracy } = position.coords;
    const locationText = `Lat: ${latitude.toFixed(4)}, Long: ${longitude.toFixed(4)} (Accuracy: ${Math.round(accuracy)}m)`;
    document.getElementById("location-status").textContent = locationText;
    document.getElementById("mark-attendance").disabled = false;
    
    // Add pulse animation to attendance button
    document.getElementById("mark-attendance").classList.add('pulse');
}

function showError(error) {
    const errorMessages = {
        1: "Permission denied. Please enable location access.",
        2: "Location unavailable. Please check your connection.",
        3: "Location request timed out. Please try again.",
        4: "Unknown error occurred while getting location."
    };
    const message = errorMessages[error.code] || "Error getting location.";
    document.getElementById("location-status").textContent = message;
    showToast('Location Error', message, 'danger');
}

// Attendance marking function
function markAttendance() {
    if (!currentStudent) return;

    const now = new Date();
    const date = now.toLocaleDateString();
    const time = now.toLocaleTimeString();
    const location = document.getElementById("location-status").textContent;

    // Check if already marked today
    const alreadyMarked = attendanceData.some(record => 
        record.studentId === currentStudent.id && record.date === date
    );
    
    if (alreadyMarked) {
        showToast('Notice', 'Attendance already marked for today', 'info');
        return;
    }

    // Create new record
    const record = { 
        studentId: currentStudent.id, 
        studentName: currentStudent.name,
        course: currentStudent.course,
        date, 
        time, 
        location,
        status: "Present",
        timestamp: now.getTime()
    };
    
    attendanceData.push(record);
    localStorage.setItem("attendanceData", JSON.stringify(attendanceData));
    
    // Update UI
    document.getElementById("mark-attendance").classList.remove('pulse');
    document.getElementById("mark-attendance").disabled = true;
    document.getElementById("mark-attendance").textContent = "Attendance Marked";
    document.getElementById("mark-attendance").classList.remove("btn-success");
    document.getElementById("mark-attendance").classList.add("btn-secondary");
    document.getElementById("attendance-status").textContent = "Present";
    document.getElementById("attendance-status").className = "badge bg-success";
    
    showToast('Success', 'Attendance marked successfully!', 'success');
    
    // Update admin stats if admin is logged in
    if (currentAdmin) {
        updateAdminStats();
    }
}

// QR Code functions
function generateQRCodeData(studentId) {
    return JSON.stringify({
        id: studentId,
        system: "AttendanceSystem",
        timestamp: Date.now()
    });
}

function showQRCode() {
    if (!currentStudent) return;
    
    const qrCodeElement = document.getElementById('qr-code');
    qrCodeElement.innerHTML = ''; // Clear previous QR code
    
    QRCode.toCanvas(qrCodeElement, currentStudent.qrCode, { width: 200 }, (error) => {
        if (error) {
            console.error("QR Code Generation Error:", error);
            showToast('Error', 'Failed to generate QR code', 'danger');
            return;
        }
          
    
    
    qrModal.show();
    });
}

function downloadQRCode() {
    if (!currentStudent) return;
    
    const canvas = document.querySelector('#qr-code canvas');
    if (!canvas) return;
    
    const link = document.createElement('a');
    link.download = `attendance-qr-${currentStudent.id}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
}

// Report functions
function viewMyAttendance() {
    if (!currentStudent) return;
    
    const myRecords = attendanceData.filter(
        record => record.studentId === currentStudent.id
    ).sort((a, b) => b.timestamp - a.timestamp);
    
    renderAttendanceTable(myRecords, "My Attendance Records");
    showReportsPanel();
}

function showAllRecords() {
    const sortedData = [...attendanceData].sort((a, b) => b.timestamp - a.timestamp);
    renderAttendanceTable(sortedData, "All Attendance Records");
    showReportsPanel();
}

function showDateFilter() {
    document.getElementById('date-filter').classList.remove('hidden');
}

function hideDateFilter() {
    document.getElementById('date-filter').classList.add('hidden');
}

function filterByDate() {
    const startDate = document.getElementById('start-date').value;
    const endDate = document.getElementById('end-date').value;
    
    if (!startDate || !endDate) {
        showToast('Error', 'Please select both start and end dates', 'danger');
        return;
    }
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (start > end) {
        showToast('Error', 'Start date must be before end date', 'danger');
        return;
    }
    
    const filteredData = attendanceData.filter(record => {
        const recordDate = new Date(record.date);
        return recordDate >= start && recordDate <= end;
    }).sort((a, b) => b.timestamp - a.timestamp);
    
    if (filteredData.length === 0) {
        showToast('No Records', 'No attendance records found for selected dates', 'warning');
        return;
    }
    
    renderAttendanceTable(filteredData, `Records from ${startDate} to ${endDate}`);
    showReportsPanel();
    hideDateFilter();
}

function renderAttendanceTable(data, title) {
    const tableBody = document.getElementById("attendance-records");
    tableBody.innerHTML = "";

    // Calculate pagination
    const totalPages = Math.ceil(data.length / recordsPerPage);
    const startIndex = (currentPage - 1) * recordsPerPage;
    const endIndex = Math.min(startIndex + recordsPerPage, data.length);
    const pageData = data.slice(startIndex, endIndex);

    if (pageData.length === 0) {
        const row = document.createElement("tr");
        row.innerHTML = `<td colspan="8" class="text-center py-4">No attendance records found</td>`;
        tableBody.appendChild(row);
    } else {
        pageData.forEach((record, index) => {
            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${record.studentId}</td>
                <td>${record.studentName}</td>
                <td>${record.course || 'N/A'}</td>
                <td>${record.date}</td>
                <td>${record.time}</td>
                <td>${record.location}</td>
                <td>
                    <span class="badge ${record.status === 'Present' ? 'bg-success' : 'bg-warning'}">
                        ${record.status}
                    </span>
                </td>
                <td>
                    <button class="btn btn-sm btn-outline-danger" onclick="deleteRecord(${startIndex + index})">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            `;
            tableBody.appendChild(row);
        });
    }

    document.getElementById("record-count").textContent = data.length;
    document.getElementById("toast-title").textContent = title;
    
    // Update pagination buttons
    const prevBtn = document.getElementById("prev-btn");
    const nextBtn = document.getElementById("next-btn");
    
    prevBtn.disabled = currentPage === 1;
    nextBtn.disabled = currentPage === totalPages;
    
    prevBtn.onclick = () => {
        if (currentPage > 1) {
            currentPage--;
            renderAttendanceTable(data, title);
        }
    };
    
    nextBtn.onclick = () => {
        if (currentPage < totalPages) {
            currentPage++;
            renderAttendanceTable(data, title);
        }
    };
}

function showReportsPanel() {
    document.getElementById("dashboard").classList.add("hidden");
    document.getElementById("admin-dashboard").classList.add("hidden");
    document.getElementById("reports-panel").classList.remove("hidden");
    document.getElementById("reports-panel").classList.add("fade-in");
}

function goBack() {
    document.getElementById("reports-panel").classList.add("hidden");
    currentPage = 1; // Reset pagination
    
    if (currentAdmin) {
        document.getElementById("admin-dashboard").classList.remove("hidden");
    } else if (currentStudent) {
        document.getElementById("dashboard").classList.remove("hidden");
    } else {
        document.getElementById("login-section").classList.remove("hidden");
    }
}

function deleteRecord(index) {
    if (confirm("Are you sure you want to delete this record?")) {
        attendanceData.splice(index, 1);
        localStorage.setItem("attendanceData", JSON.stringify(attendanceData));
        
        // Refresh the current view
        if (currentAdmin) {
            updateAdminStats();
            showAllRecords();
        } else if (currentStudent) {
            viewMyAttendance();
        }
        
        showToast('Deleted', 'Record removed successfully', 'info');
    }
}

function clearRecords() {
    if (confirm("Are you sure you want to clear ALL attendance records? This cannot be undone.")) {
        attendanceData = [];
        localStorage.removeItem("attendanceData");
        
        if (currentAdmin) {
            updateAdminStats();
            showAllRecords();
        }
        
        showToast('Cleared', 'All records have been removed', 'warning');
    }
}

function exportToCSV() {
    if (attendanceData.length === 0) {
        showToast('Error', 'No records to export', 'warning');
        return;
    }

    // CSV header
    let csv = "Student ID,Student Name,Course,Date,Time,Location,Status\n";
    
    // Add data rows
    attendanceData.forEach(record => {
        csv += `"${record.studentId}","${record.studentName}","${record.course || ''}","${record.date}","${record.time}","${record.location}","${record.status}"\n`;
    });


    // Add "Powered by Amit" and Copyright information in the footer
      csv += `\nPowered by AmitGiri\n`;
      csv += `© ${new Date().getFullYear()}   2023 Gyaat Group. All rights reserved.`;

    // Create download link
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', `attendance_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    showToast('Exported', 'Attendance records downloaded as CSV', 'success');
}

// Dark Mode Toggle
function toggleDarkMode() {
    document.body.classList.toggle("dark-mode");
    document.getElementById("main-container").classList.toggle("bg-dark");
    document.getElementById("main-container").classList.toggle("text-white");

    const btn = document.getElementById("toggle-mode");
    if (document.body.classList.contains("dark-mode")) {
        btn.innerHTML = '<i class="bi bi-sun-fill"></i>';
    } else {
        btn.innerHTML = '<i class="bi bi-moon-fill"></i>';
    }

    let mode = document.body.classList.contains("dark-mode") ? "dark" : "light";
    localStorage.setItem("theme", mode);
    
    showToast('Theme Changed', `Switched to ${mode} mode`, 'info');
}

// Load Dark Mode Preference
function loadTheme() {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "dark") {
        document.body.classList.add("dark-mode");
        document.getElementById("main-container").classList.add("bg-dark", "text-white");
        document.getElementById("toggle-mode").innerHTML = '<i class="bi bi-sun-fill"></i>';
    }
}

// Initialize on page load
window.onload = function() {
    loadTheme();
    
    // Initialize date pickers
    flatpickr("#start-date", {
        dateFormat: "Y-m-d",
        maxDate: "today"
    });
    
    flatpickr("#end-date", {
        dateFormat: "Y-m-d",
        maxDate: "today"
    });
    
    // Hide all panels except login initially
    document.getElementById("dashboard").classList.add("hidden");
    document.getElementById("admin-dashboard").classList.add("hidden");
    document.getElementById("reports-panel").classList.add("hidden");
    document.getElementById("admin-login").classList.add("hidden");
    document.getElementById("date-filter").classList.add("hidden");
};