let token = localStorage.getItem('token');
let user = JSON.parse(localStorage.getItem('user') || '{}');

if (token && window.location.pathname.includes('dashboard')) {
    document.body.style.display = 'block';
} else if (window.location.pathname.includes('dashboard')) {
    window.location.href = '/';
}

// Signup/Login functions
async function signup() {
    const data = {
        name: document.getElementById('signup-name').value,
        email: document.getElementById('signup-email').value,
        password: document.getElementById('signup-password').value
    };
    const res = await fetch('/api/signup', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(data)});
    const result = await res.json();
    if (result.success) {
        document.getElementById('signup-form').classList.add('hidden');
        document.getElementById('verify-form').classList.remove('hidden');
        localStorage.setItem('tempEmail', data.email);
    } else {
        alert(result.msg);
    }
}

async function verify() {
    const data = {
        email: localStorage.getItem('tempEmail'),
        code: document.getElementById('verify-code').value,
        password: document.getElementById('signup-password').value // Get from previous form
    };
    const res = await fetch('/api/verify', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(data)});
    const result = await res.json();
    if (result.success) window.location.href = '/dashboard.html';
}

async function login() {
    const data = {
        email: document.getElementById('login-email').value,
        password: document.getElementById('login-password').value
    };
    const res = await fetch('/api/login', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(data)});
    const result = await res.json();
    if (result.success) {
        localStorage.setItem('token', result.token);
        localStorage.setItem('user', JSON.stringify(result.user));
        window.location.href = '/dashboard.html';
    } else {
        alert(result.msg);
    }
}

async function predict() {
    const symptoms = document.getElementById('symptoms').value;
    const res = await fetch('/api/predict', {
        method: 'POST',
        headers: {'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`},
        body: JSON.stringify({symptoms})
    });
    const result = await res.json();
    document.getElementById('results').innerHTML = `
        <h3>Predicted Disease: ${result.disease}</h3>
        <p><strong>Precautions:</strong> ${result.precautions}</p>
        <p><strong>Suggestions:</strong> ${result.suggestions}</p>
        <p><strong>Severity:</strong> ${result.severity}</p>
    `;
    document.getElementById('results').classList.remove('hidden');
}

// Voice input (Web Speech API)
function startVoice() {
    const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    recognition.onresult = (e) => {
        document.getElementById('symptoms').value = e.results[0][0].transcript;
    };
    recognition.start();
}

async function uploadReport() {
    const file = document.getElementById('report').files[0];
    const formData = new FormData();
    formData.append('report', file);
    const res = await fetch('/api/upload-report', {
        method: 'POST',
        headers: {'Authorization': `Bearer ${token}`},
        body: formData
    });
    const result = await res.json();
    alert(result.message);
}


// Open file dialog when user clicks visible button
const openLabUploadBtn = document.getElementById('openLabUploadBtn');
const labInput = document.getElementById('labReportUpload');

openLabUploadBtn.addEventListener('click', () => {
  labInput.click(); // this will open the real file chooser
});

// When user actually selects a file
labInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    const text = event.target.result.toLowerCase();
    const findings = analyzeLabReport(text); // your function from previous code

    const result = findings.length
      ? `<p>Lab analysis result:</p>${findings
          .map(f => `<p><b>${f.english}</b><br>${f.severity}</p>`)
          .join('')}`
      : '<p>No major issues detected. Please consult a doctor for confirmation.</p>';

    document.getElementById('reportResult').innerHTML = result;
  };
  reader.readAsText(file);
});



function logout() {
    localStorage.clear();
    window.location.href = '/';
}



let map, service;
function initMap() {
  map = new google.maps.Map(document.getElementById('map'), {
    center: {lat: 19.0967, lng: 72.8780}, // Airoli default
    zoom: 12
  });
  service = new google.maps.places.PlacesService(map);
}

function findNearbyDoctors(query, lat=19.0967, lng=72.8780) { // Airoli coords
  service.nearbySearch({
    location: {lat, lng},
    radius: 10000,
    type: ['hospital'],
    keyword: query
  }, (results, status) => {
    if (status === 'OK') {
      results.slice(0,5).forEach(place => {
        const info = `<div>${place.name}<br>${place.vicinity}<br>Rating: ${place.rating}<br><a href="tel:${place.formatted_phone_number || 'N/A'}">Call</a></div>`;
        // For slot booking, integrate external API like Practo (add later)
        console.log(info); // Display in modal or list
      });
    }
  });
}

// In your symptom check function, after detecting disease:
const criticalSymptoms = ['heart', 'skin', 'cancer', 'stroke'];
if (criticalSymptoms.some(s => predictedDisease.toLowerCase().includes(s))) {
  document.getElementById('map').style.display = 'block'; // Add <div id="map" style="height:400px;display:none;"></div> to dashboard
  findNearbyDoctors(predictedDisease);
}
