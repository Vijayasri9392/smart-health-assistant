const API = 'http://localhost:5000/api/auth';

document.addEventListener('DOMContentLoaded', () => {
  // Register handler
  const regBtn = document.getElementById('regBtn');
  if (regBtn) {
    regBtn.onclick = async () => {
      const email = document.getElementById('email').value;
      const password = document.getElementById('password').value;
      const res = await fetch(`${API}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const json = await res.json();
      alert(json.message || json.error);
      if (json.userId) location.href = 'login.html';
    };
  }

  // Login handler
  const loginBtn = document.getElementById('loginBtn');
  if (loginBtn) {
    loginBtn.onclick = async () => {
      const email = document.getElementById('email').value;
      const password = document.getElementById('password').value;
      const res = await fetch(`${API}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const json = await res.json();
      if (json.token) {
        localStorage.setItem('token', json.token);
        location.href = 'dashboard.html';
      } else {
        alert(json.error);
      }
    };
  }

  localStorage.setItem('userId', userId); // keep user id for history
});