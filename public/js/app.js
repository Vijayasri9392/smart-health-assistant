class HealthAssistant {
    constructor() {
        this.token = localStorage.getItem('token');
        this.user = JSON.parse(localStorage.getItem('user') || '{}');
        this.init();
    }

    init() {
        if (!this.token) {
            window.location.href = '/login.html';
            return;
        }
        this.bindEvents();
        this.loadUserProfile();
    }

    bindEvents() {
        // Profile menu
        document.getElementById('profileBtn').addEventListener('click', () => {
            const dropdown = document.getElementById('profileDropdown');
            dropdown.classList.toggle('hidden');
        });

        // Analyze symptoms
        document.getElementById('analyzeBtn').addEventListener('click', () => this.analyzeSymptoms());
        
        // Voice input
        document.getElementById('voiceBtn').addEventListener('click', () => this.startVoiceInput());
        
        // History
        document.getElementById('historyBtn').addEventListener('click', () => {
            window.location.href = '/history.html';
        });

        // Upload
        document.getElementById('uploadBtn').addEventListener('click', () => {
            document.getElementById('uploadModal').classList.remove('hidden');
        });

        // Upload modal
        document.getElementById('cancelUpload').addEventListener('click', () => {
            document.getElementById('uploadModal').classList.add('hidden');
        });

        document.getElementById('submitReport').addEventListener('click', () => this.uploadReport());

        // Logout
        document.getElementById('logoutBtn').addEventListener('click', () => this.logout());
    }

    async apiCall(endpoint, options = {}) {
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.token}`
        };
        
        const response = await fetch(`/api/health${endpoint}`, {
            headers,
            ...options
        });
        
        if (!response.ok) {
            if (response.status === 401) {
                this.logout();
                return;
            }
            throw new Error(await response.text());
        }
        return response.json();
    }

    async analyzeSymptoms() {
        const symptomsText = document.getElementById('symptomsInput').value.trim();
        if (!symptomsText) {
            alert('Please enter your symptoms');
            return;
        }

        const symptoms = symptomsText.split(',').map(s => s.trim()).filter(s => s);
        
        try {
            document.getElementById('analyzeBtn').textContent = 'Analyzing...';
            document.getElementById('analyzeBtn').disabled = true;

            const result = await this.apiCall('/predict', {
                method: 'POST',
                body: JSON.stringify({ symptoms })
            });

            this.displayResults(result);
        } catch (error) {
            alert('Error analyzing symptoms: ' + error.message);
        } finally {
            document.getElementById('analyzeBtn').textContent = '🔍 Analyze Symptoms';
            document.getElementById('analyzeBtn').disabled = false;
        }
    }

    async uploadReport() {
        const fileInput = document.getElementById('reportFile');
        const file = fileInput.files[0];
        
        if (!file) {
            alert('Please select a file');
            return;
        }

        const formData = new FormData();
        formData.append('report', file);

        try {
            document.getElementById('submitReport').textContent = 'Analyzing...';
            document.getElementById('submitReport').disabled = true;

            const result = await fetch('/api/health/analyze-report', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${this.token}` },
                body: formData
            }).then(r => r.json());

            this.displayReportResults(result);
        } catch (error) {
            alert('Error analyzing report: ' + error.message);
        } finally {
            document.getElementById('submitReport').textContent = 'Analyze';
            document.getElementById('submitReport').disabled = false;
            document.getElementById('uploadModal').classList.add('hidden');
            fileInput.value = '';
        }
    }

    displayResults(result) {
        const resultsDiv = document.getElementById('results');
        const content = document.getElementById('resultContent');

        let html = `
            <div class="text-center mb-8">
                <div class="w-24 h-24 bg-gradient-to-r from-red-400 to-pink-400 rounded-full mx-auto mb-4 flex items-center justify-center text-3xl">
                    ${result.severity === 'high' ? '🚨' : '⚕️'}
                </div>
                <h2 class="text-3xl font-bold text-gray-800 mb-2">${result.disease}</h2>
                <p class="text-xl text-gray-600 mb-8">Severity: <span class="font-semibold ${result.severity === 'high' ? 'text-red-600' : 'text-yellow-600'}">${result.severity.toUpperCase()}</span></p>
            </div>
        `;

        if (result.precautions) {
            html += `<div class="mb-6 p-6 bg-yellow-50 border-l-4 border-yellow-400 rounded-r-xl"><h3 class="font-bold text-lg mb-3">🛡️ Precautions</h3><p>${result.precautions}</p></div>`;
        }

        if (result.suggestions) {
            html += `<div class="mb-6 p-6 bg-blue-50 border-l-4 border-blue-400 rounded-r-xl"><h3 class="font-bold text-lg mb-3">💡 Suggestions</h3><p>${result.suggestions}</p></div>`;
        }

        if (result.medicines) {
            html += `<div class="mb-6 p-6 bg-green-50 border-l-4 border-green-400 rounded-r-xl"><h3 class="font-bold text-lg mb-3">💊 Safe OTC Medicines</h3><p class="text-sm">${result.medicines}</p></div>`;
        }

        if (result.foodAdvice) {
            html += `<div class="mb-6 p-6 bg-purple-50 border-l-4 border-purple-400 rounded-r-xl"><h3 class="font-bold text-lg mb-3">🍎 Food Advice</h3><p>${result.foodAdvice}</p></div>`;
        }

        if (result.isCritical && result.nearbyDoctors && result.nearbyDoctors.length > 0) {
            html += `
                <div class="mb-6 p-6 bg-red-50 border-l-4 border-red-400 rounded-r-xl">
                    <h3 class="font-bold text-xl mb-4 text-red-800">🚨 EMERGENCY - Nearby Hospitals</h3>
                    <div class="grid md:grid-cols-2 gap-4">
            `;
            
            result.nearbyDoctors.slice(0, 4).forEach((hospital, i) => {
                html += `
                    <div class="p-4 bg-white rounded-lg shadow-sm border">
                        <h4 class="font-semibold text-lg">${hospital.hospital_name}</h4>
                        <p class="text-sm text-gray-600">${hospital.location}</p>
                        <p class="font-mono text-sm mt-2">${hospital.contact}</p>
                        <a href="${hospital.booking_url}" target="_blank" class="mt-3 inline-block bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-red-700">Book Now</a>
                    </div>
                `;
            });
            
            html += `</div></div>`;
        }

        content.innerHTML = html;
        resultsDiv.classList.remove('hidden');
        resultsDiv.scrollIntoView({ behavior: 'smooth' });
    }

    displayReportResults(result) {
        const resultsDiv = document.getElementById('results');
        const content = document.getElementById('resultContent');
        
        content.innerHTML = `
            <div class="text-center mb-8">
                <div class="w-24 h-24 bg-gradient-to-r from-blue-400 to-indigo-400 rounded-full mx-auto mb-4 flex items-center justify-center text-3xl">📋</div>
                <h2 class="text-3xl font-bold text-gray-800 mb-2">Report Analysis Complete</h2>
            </div>
            <div class="p-6 bg-blue-50 border-l-4 border-blue-400 rounded-r-xl">
                <h3 class="font-bold text-lg mb-3">🔍 Analysis</h3>
                <p class="text-lg mb-4">${result.analysis}</p>
                ${result.keywordsDetected.length > 0 ? `<p class="text-sm text-gray-600 mb-4">Keywords detected: ${result.keywordsDetected.join(', ')}</p>` : ''}
                <div class="text-center">
                    <a href="#" onclick="window.location.reload()" class="bg-green-600 text-white px-8 py-3 rounded-xl font-semibold hover:bg-green-700">Analyze New Symptoms</a>
                </div>
            </div>
        `;
        
        resultsDiv.classList.remove('hidden');
        resultsDiv.scrollIntoView({ behavior: 'smooth' });
    }

    async loadUserProfile() {
        try {
            const profile = await this.apiCall('/profile');
            document.getElementById('profileBtn').textContent = profile.name?.[0]?.toUpperCase() || 'U';
            localStorage.setItem('user', JSON.stringify(profile));
        } catch (error) {
            console.error('Failed to load profile:', error);
        }
    }

    async startVoiceInput() {
        if (!('webkitSpeechRecognition' in window)) {
            alert('Voice input not supported in this browser');
            return;
        }

        const recognition = new webkitSpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-IN';

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            document.getElementById('symptomsInput').value = transcript;
        };

        recognition.onerror = () => alert('Voice recognition error');
        recognition.start();
    }


    
    logout() {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login.html';
    }
}

// Initialize when DOM loads
document.addEventListener('DOMContentLoaded', () => {
    if (navigator.serviceWorker) {
        navigator.serviceWorker.register('/sw.js');
    }
    new HealthAssistant();
});
