let token = localStorage.getItem('token');
let isAdmin = false;

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM fully loaded and parsed');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const adminLoginForm = document.getElementById('admin-login-form');
    const logoutButton = document.getElementById('logout-button');
    const reservationSection = document.getElementById('reservation-section');
    const adminDashboard = document.getElementById('admin-dashboard');
    const reservationForm = document.getElementById('reservation-form');
    const userReservationsList = document.getElementById('user-reservations-list');
    const allReservationsList = document.getElementById('all-reservations-list');
    const courtStats = document.getElementById('court-stats');

    const dateSelect = document.getElementById('date-select');
    const timeSelect = document.getElementById('time-select');

    // Add event listener to update time slots when date is selected
    dateSelect.addEventListener('change', updateTimeSlots);

    function updateTimeSlots() {
        const selectedDate = dateSelect.value;
        const today = new Date().toISOString().split('T')[0];
        
        timeSelect.innerHTML = ''; // Clear existing options

        const startHour = selectedDate === today ? new Date().getHours() + 1 : 8; // Start from next hour if today, else 8 AM
        const endHour = 22; // End at 10 PM

        for (let hour = startHour; hour < endHour; hour++) {
            const option = document.createElement('option');
            option.value = `${hour}:00`;
            option.textContent = `${hour}:00 - ${hour + 1}:00`;
            timeSelect.appendChild(option);
        }
    }

    // Set min date to today for date picker
    const today = new Date().toISOString().split('T')[0];
    dateSelect.min = today;

    // Initially populate time slots
    updateTimeSlots();

    function updateUI() {
        if (token) {
            document.getElementById('auth-forms').style.display = 'none';
            logoutButton.style.display = 'block';
            if (isAdmin) {
                adminDashboard.style.display = 'block';
                reservationSection.style.display = 'none';
            } else {
                reservationSection.style.display = 'block';
                adminDashboard.style.display = 'none';
            }
        } else {
            document.getElementById('auth-forms').style.display = 'block';
            reservationSection.style.display = 'none';
            adminDashboard.style.display = 'none';
            logoutButton.style.display = 'none';
        }
        if (token && !isAdmin) {
            fetchUserReservations();
        }
        if (isAdmin) {
            fetchAllReservations();
            fetchCourtStats();
        }
    }

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('login-username').value;
        const password = document.getElementById('login-password').value;

        try {
            const response = await fetch('/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            if (response.ok) {
                const data = await response.json();
                token = data.token;
                localStorage.setItem('token', token);
                isAdmin = false;
                updateUI();
                fetchUserReservations();
            } else {
                const data = await response.json();
                alert(data.error || 'Login failed. Please check your credentials.');
            }
        } catch (error) {
            console.error('Error:', error);
            alert('An error occurred while logging in');
        }
    });

    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('register-username').value;
        const password = document.getElementById('register-password').value;

        try {
            const response = await fetch('/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            if (response.ok) {
                alert('Registration successful. Please log in.');
                document.getElementById('register-username').value = '';
                document.getElementById('register-password').value = '';
            } else {
                const data = await response.json();
                alert(data.error || 'Registration failed. Please try again.');
            }
        } catch (error) {
            console.error('Error:', error);
            alert('An error occurred while registering');
        }
    });

    adminLoginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('admin-username').value;
        const password = document.getElementById('admin-password').value;
        console.log('Attempting admin login with:', username, password);

        try {
            const response = await fetch('/admin/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            if (response.ok) {
                const data = await response.json();
                token = data.token;
                localStorage.setItem('token', token);
                isAdmin = true;
                updateUI();
                fetchAllReservations();
            } else {
                const data = await response.json();
                alert(data.error);
            }
        } catch (error) {
            console.error('Error:', error);
            alert('An error occurred while logging in as admin');
        }
    });

    logoutButton.addEventListener('click', () => {
        token = null;
        localStorage.removeItem('token');
        isAdmin = false;
        updateUI();
    });

    reservationForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const court = document.getElementById('court-select').value;
        const date = dateSelect.value;
        const time = timeSelect.value;

        try {
            const response = await fetch('/reservations', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': token
                },
                body: JSON.stringify({ court, date, time })
            });

            if (response.ok) {
                alert('Reservation created successfully');
                fetchUserReservations();
            } else {
                const data = await response.json();
                alert(data.error);
            }
        } catch (error) {
            console.error('Error:', error);
            alert('An error occurred while creating the reservation');
        }
    });

    async function fetchUserReservations() {
        try {
            const response = await fetch('/reservations', {
                headers: { 'Authorization': token }
            });

            if (response.ok) {
                const reservations = await response.json();
                displayUserReservations(reservations);
            } else {
                console.error('Failed to fetch user reservations');
            }
        } catch (error) {
            console.error('Error:', error);
        }
    }

    function displayUserReservations(reservations) {
        userReservationsList.innerHTML = '';
        reservations.forEach(reservation => {
            const li = document.createElement('li');
            li.textContent = `Court ${reservation.court}, ${reservation.date}, ${reservation.time}`;
            const cancelButton = document.createElement('button');
            cancelButton.textContent = 'Cancel';
            cancelButton.onclick = () => cancelReservation(reservation.id);
            li.appendChild(cancelButton);
            userReservationsList.appendChild(li);
        });
    }

    async function cancelReservation(id) {
        try {
            const response = await fetch(`/reservations/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': token }
            });

            if (response.ok) {
                alert('Reservation cancelled successfully');
                fetchUserReservations();
            } else {
                const data = await response.json();
                alert(data.error);
            }
        } catch (error) {
            console.error('Error:', error);
            alert('An error occurred while cancelling the reservation');
        }
    }

    async function fetchAllReservations() {
        try {
            const response = await fetch('/admin/reservations', {
                headers: { 'Authorization': token }
            });

            if (response.ok) {
                const reservations = await response.json();
                displayAllReservations(reservations);
            } else {
                console.error('Failed to fetch all reservations');
            }
        } catch (error) {
            console.error('Error:', error);
        }
    }

    function displayAllReservations(reservations) {
        allReservationsList.innerHTML = '';
        reservations.forEach(reservation => {
            const li = document.createElement('li');
            li.textContent = `Court ${reservation.court}, ${reservation.date}, ${reservation.time}, User ID: ${reservation.user_id}`;
            const cancelButton = document.createElement('button');
            cancelButton.textContent = 'Cancel';
            cancelButton.onclick = () => adminCancelReservation(reservation.id);
            li.appendChild(cancelButton);
            allReservationsList.appendChild(li);
        });
    }

    async function adminCancelReservation(id) {
        try {
            const response = await fetch(`/admin/reservations/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': token }
            });

            if (response.ok) {
                alert('Reservation cancelled successfully');
                fetchAllReservations();
                fetchCourtStats();
            } else {
                const data = await response.json();
                alert(data.error);
            }
        } catch (error) {
            console.error('Error:', error);
            alert('An error occurred while cancelling the reservation');
        }
    }

    async function fetchCourtStats() {
        try {
            const response = await fetch('/admin/court-stats', {
                headers: { 'Authorization': token }
            });

            if (response.ok) {
                const stats = await response.json();
                displayCourtStats(stats);
            } else {
                console.error('Failed to fetch court stats');
            }
        } catch (error) {
            console.error('Error:', error);
        }
    }

    function displayCourtStats(stats) {
        courtStats.innerHTML = '';
        for (const [court, occupancy] of Object.entries(stats)) {
            const div = document.createElement('div');
            div.textContent = `${court}: ${occupancy}%`;
            courtStats.appendChild(div);
        }
    }

    // Initial setup
    updateUI();
});