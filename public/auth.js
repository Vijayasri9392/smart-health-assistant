const API = "http://localhost:5000/api/auth";

async function signup() {
  const res = await fetch(`${API}/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: signupName.value,
      email: signupEmail.value,
      password: signupPassword.value
    })
  });

  const data = await res.json();
  alert(data.message);
}

async function login() {
  const res = await fetch(`${API}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: loginEmail.value,
      password: loginPassword.value
    })
  });

  const data = await res.json();

  if (data.token) {
    localStorage.setItem("token", data.token);
    window.location.href = "app.html"; // 🔥 IMPORTANT
  } else {
    alert("Login failed");
  }
}
