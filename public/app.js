// window.addEventListener('DOMContentLoaded', () => {
//   const token = localStorage.getItem('token');
//   if (token) {
//     showApp();
//   } else {
//     showAuth();
//   }
// });

// function showApp() {
//   document.getElementById('authContainer').style.display = 'none';
//   document.getElementById('appContainer').style.display = 'block';
//   loadHistory();
// }

// function showAuth() {
//   document.getElementById('authContainer').style.display = 'none';
//   document.getElementById('appContainer').style.display = 'block';
// }

// async function signupUser() {
//   const name = signupName.value;
//   const email = signupEmail.value;
//   const password = signupPassword.value;
//   const confirm = signupConfirm.value;

//   if (password !== confirm) {
//     alert('Passwords do not match');
//     return;
//   }

//   const res = await fetch('http://localhost:5000/api/auth/signup', {
//     method: 'POST',
//     headers: { 'Content-Type': 'application/json' },
//     body: JSON.stringify({ name, email, password })
//   });

//   const data = await res.json();
//   alert(data.msg);
// }

// async function loginUser() {
//   const email = document.getElementById("loginEmail").value.trim();
//   const password = document.getElementById("loginPassword").value.trim();

//   if (!email || !password) {
//     alert("Email and password required");
//     return;
//   }

//   const res = await fetch("http://localhost:5000/api/auth/login", {
//     method: "POST",
//     headers: { "Content-Type": "application/json" },
//     body: JSON.stringify({ email, password })
//   });

//   const data = await res.json();

//   if (!res.ok) {
//     alert(data.msg || "Login failed");
//     return;
//   }

//   localStorage.setItem("token", data.token);

//   showApp();   // 🔥 THIS switches UI
// }




// console.log("PUBLIC APP.JS LOADED");
// document.getElementById("signupBtn").addEventListener("click", signup);
// document.getElementById("loginBtn").addEventListener("click", login);

// async function signup() {
//   const name = document.getElementById("name").value;
//   const email = document.getElementById("email").value;
//   const password = document.getElementById("password").value;

//   const res = await fetch("http://localhost:5000/api/auth/signup", {
//     method: "POST",
//     headers: { "Content-Type": "application/json" },
//     body: JSON.stringify({ name, email, password })
//   });

//   const data = await res.json();
//   alert(data.message);
// }

// async function login() {
//   const email = document.getElementById("loginEmail").value;
//   const password = document.getElementById("loginPassword").value;

//   const res = await fetch("http://localhost:5000/api/auth/login", {
//     method: "POST",
//     headers: { "Content-Type": "application/json" },
//     body: JSON.stringify({ email, password })
//   });

//   const data = await res.json();

//   if (data.token) {
//     localStorage.setItem("token", data.token);
//     window.location.href = "main.html"; // ✅ redirect
//   } else {
//     alert("Login failed");
//   }
// }


const API_BASE = 'http://localhost:5000/api';
let currentPhone = '', signupData = {};

// Show forms
function showLogin() {
    document.getElementById('login').classList.add('active');
    document.getElementById('signup').classList.remove('active');
    document.getElementById('verify').style.display = 'none';
}

function showSignup() {
    document.getElementById('signup').classList.add('active');
    document.getElementById('login').classList.remove('active');
    document.getElementById('verify').style.display = 'none';
}

function showVerify(phone) {
    currentPhone = phone;
    document.getElementById('verifyPhone').textContent = `OTP sent to ${phone}`;
    document.getElementById('verify').style.display = 'block';
    document.getElementById('signup').classList.remove('active');
}

function showAlert(message, type = 'error') {
    const alert = document.createElement('div');
    alert.className = `alert ${type}`;
    alert.textContent = message;
    document.querySelector('.container').insertBefore(alert, document.querySelector('.form-container.active'));
    setTimeout(() => alert.remove(), 4000);
}

// SIGNUP → SEND OTP
document.getElementById('signupForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('signupName').value;
    const phone = document.getElementById('signupPhone').value;
    const password = document.getElementById('signupPassword').value;
    
    signupData = { name, phone, password };

    try {
        const btn = e.target.querySelector('button[type="submit"]');
        btn.innerHTML = 'Sending... <div class="loading"></div>';
        btn.disabled = true;

        const res = await fetch(`${API_BASE}/auth/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, phone, password })
        });

        const data = await res.json();
        
        if (res.ok) {
            showVerify(phone);
            showAlert('OTP sent! Check server console for code.', 'success');
        } else {
            showAlert(data.error || 'Signup failed');
        }
    } catch (error) {
        showAlert('Network error - Is server running?');
    } finally {
        const btn = e.target.querySelector('button[type="submit"]');
        btn.innerHTML = 'Send OTP <i class="fas fa-sms"></i>';
        btn.disabled = false;
    }
});

// VERIFY OTP → DASHBOARD
document.getElementById('verifyForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const otp = document.getElementById('verifyOtp').value;

    try {
        const btn = e.target.querySelector('button[type="submit"]');
        btn.innerHTML = 'Verifying... <div class="loading"></div>';
        btn.disabled = true;

        const res = await fetch(`${API_BASE}/auth/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone: currentPhone, otp })
        });

        const data = await res.json();
        
        if (res.ok) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            window.location.href = 'client-index.html';
        } else {
            showAlert(data.error || 'Invalid OTP');
            document.getElementById('verifyOtp').value = '';
        }
    } catch (error) {
        showAlert('Network error');
    } finally {
        const btn = e.target.querySelector('button[type="submit"]');
        btn.innerHTML = 'Verify & Continue <i class="fas fa-check"></i>';
        btn.disabled = false;
    }
});

// RESEND OTP
async function resendOtp() {
    try {
        const btn = document.getElementById('resendBtn');
        btn.innerHTML = 'Sending...';
        btn.disabled = true;

        const res = await fetch(`${API_BASE}/auth/resend`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(signupData)
        });

        const data = await res.json();
        showAlert('New OTP sent! Check server console.', 'success');
    } catch (error) {
        showAlert('Resend failed');
    } finally {
        document.getElementById('resendBtn').innerHTML = 'Resend OTP';
        document.getElementById('resendBtn').disabled = false;
    }
}

// LOGIN
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const phone = document.getElementById('loginPhone').value;
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    try {
        const btn = e.target.querySelector('button');
        btn.innerHTML = 'Logging in... <div class="loading"></div>';
        btn.disabled = true;

        const res = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await res.json();
        
        if (res.ok) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            window.location.href = 'client-index.html';
        } else {
            showAlert(data.error || 'Login failed');
        }
    } catch (error) {
        showAlert('Network error');
    } finally {
        const btn = e.target.querySelector('button');
        btn.innerHTML = 'Login <i class="fas fa-sign-in-alt"></i>';
        btn.disabled = false;
    }
});

// Auto-login check
if (localStorage.getItem('token')) {
    window.location.href = 'client-index.html';
}

