// class MedicineReminder {
//     constructor() {
//         this.reminders = JSON.parse(localStorage.getItem('medicineReminders') || '[]');
//         this.init();
//     }

//     init() {
//         this.renderReminders();
//         document.getElementById('medicineReminderBtn').onclick = () => this.showModal();
//     }

//     showModal() {
//         document.getElementById('medicineModal').classList.remove('hidden');
//     }

//     addReminder(medicine, time, dosage) {
//         const reminder = {
//             id: Date.now(),
//             medicine,
//             time,
//             dosage,
//             active: true
//         };
//         this.reminders.unshift(reminder);
//         localStorage.setItem('medicineReminders', JSON.stringify(this.reminders));
//         this.renderReminders();
//         this.scheduleNotification(reminder);
//     }

//     renderReminders() {
//         const container = document.getElementById('remindersList');
//         if (!container) return;
        
//         container.innerHTML = this.reminders.map(r => `
//             <div class="p-4 bg-white rounded-xl shadow-md mb-3 flex justify-between items-center">
//                 <div>
//                     <h4 class="font-bold text-lg">${r.medicine}</h4>
//                     <p class="text-sm text-gray-600">${r.dosage} at ${r.time}</p>
//                 </div>
//                 <div class="flex gap-2">
//                     <button onclick="reminderManager.toggle('${r.id}')" class="p-2 rounded-lg ${r.active ? 'bg-green-500' : 'bg-gray-400'} text-white">
//                         ${r.active ? '🔔' : '💤'}
//                     </button>
//                     <button onclick="reminderManager.delete('${r.id}')" class="p-2 bg-red-500 text-white rounded-lg">🗑️</button>
//                 </div>
//             </div>
//         `).join('') || '<p class="text-gray-500 text-center py-8">No reminders set</p>';
//     }

//     toggle(id) {
//         const reminder = this.reminders.find(r => r.id == id);
//         if (reminder) {
//             reminder.active = !reminder.active;
//             localStorage.setItem('medicineReminders', JSON.stringify(this.reminders));
//             this.renderReminders();
//         }
//     }

//     delete(id) {
//         if (confirm('Delete reminder?')) {
//             this.reminders



// Medicine Reminders - Complete Logic
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Medicine Reminders - Smart Health Assistant</title>
    <link href="style.css" rel="stylesheet">
    <link href="dashboard.css" rel="stylesheet">
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gradient-to-br from-blue-50 to-indigo-100 min-h-screen">
    
    <!-- Navbar -->
    <nav class="bg-white shadow-lg sticky top-0 z-50">
        <div class="max-w-6xl mx-auto px-4">
            <div class="flex justify-between items-center py-4">
                <a href="index.html" class="text-2xl font-bold text-blue-600">🏥 Smart Health</a>
                <div class="flex space-x-4">
                    <a href="index.html" class="btn-hover">Dashboard</a>
                    <a href="profile.html" class="btn-hover">Profile</a>
                    <a href="#" onclick="logout()" class="text-red-500 font-semibold">Logout</a>
                </div>
            </div>
        </div>
    </nav>

    <div class="max-w-4xl mx-auto px-6 py-8">
        <!-- Header -->
        <div class="text-center mb-12">
            <h1 class="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
                💊 Medicine Reminders
            </h1>
            <p class="text-xl text-gray-600">Set dosage, timing & get smart alarms</p>
        </div>

        <!-- Add Medicine Form -->
        <div class="bg-white rounded-2xl shadow-xl p-8 mb-8">
            <h2 class="text-2xl font-bold mb-6 text-gray-800">Add New Medicine</h2>
            <div class="grid md:grid-cols-2 gap-6">
                <input type="text" id="medName" placeholder="Medicine Name (e.g., Paracetamol)" 
                       class="input-field">
                <input type="number" id="medDose" placeholder="Dosage (e.g., 500)" 
                       class="input-field">
                <input type="time" id="medTime" class="input-field">
                <select id="medFrequency" class="input-field">
                    <option>Frequency</option>
                    <option value="1">Once Daily</option>
                    <option value="2">Twice Daily</option>
                    <option value="3">Thrice Daily</option>
                </select>
                <input type="date" id="startDate" class="input-field">
            </div>
            <button id="addMedicine" class="btn-primary w-full mt-6 py-4 text-lg">
                ➕ Add Medicine
            </button>
        </div>

        <!-- Current Time & Reminders -->
        <div class="grid md:grid-cols-2 gap-8">
            <div class="bg-gradient-to-r from-green-400 to-blue-500 text-white rounded-2xl p-8 text-center">
                <h3 class="text-2xl font-bold mb-2">⏰ Current Time</h3>
                <div id="currentTime" class="text-4xl font-black mb-2"></div>
                <div id="nextReminder" class="text-xl opacity-90"></div>
            </div>

            <div class="bg-white rounded-2xl shadow-xl p-8">
                <h3 class="text-2xl font-bold mb-6 text-gray-800">📋 Today's Reminders</h3>
                <div id="reminderList" class="space-y-3 max-h-96 overflow-y-auto"></div>
            </div>
        </div>
    </div>

    <script>
        // Medicine Reminder Logic
        let medicines = JSON.parse(localStorage.getItem('medicines')) || [];
        
        document.getElementById('addMedicine').onclick = addMedicine;
        
        function addMedicine() {
            const med = {
                id: Date.now(),
                name: document.getElementById('medName').value,
                dose: document.getElementById('medDose').value,
                time: document.getElementById('medTime').value,
                frequency: document.getElementById('medFrequency').value,
                startDate: document.getElementById('startDate').value,
                status: 'pending'
            };
            
            if (med.name && med.dose && med.time) {
                medicines.push(med);
                localStorage.setItem('medicines', JSON.stringify(medicines));
                displayReminders();
                clearForm();
            }
        }
        
        function displayReminders() {
            const list = document.getElementById('reminderList');
            list.innerHTML = medicines.map(m => `
                <div class="p-4 bg-gray-50 rounded-xl flex justify-between items-center">
                    <div>
                        <h4 class="font-bold text-lg">${m.name}</h4>
                        <p>${m.dose}mg @ ${m.time} (${m.frequency}x/day)</p>
                    </div>
                    <div class="flex space-x-2">
                        <button onclick="takeMedicine(${m.id})" class="px-4 py-2 bg-green-500 text-white rounded-lg text-sm">✅ Taken</button>
                        <button onclick="deleteMedicine(${m.id})" class="px-4 py-2 bg-red-500 text-white rounded-lg text-sm">🗑️ Delete</button>
                    </div>
                </div>
            `).join('');
        }
        
        function clearForm() {
            document.querySelectorAll('input, select').forEach(el => el.value = '');
        }
        
        // Clock & Alarms
        setInterval(() => {
            const now = new Date();
            document.getElementById('currentTime').textContent = now.toLocaleTimeString();
            
            // Check reminders
            medicines.forEach(m => {
                if (m.time === now.toTimeString().slice(0,5) && m.status === 'pending') {
                    alert(`⏰ Time for ${m.name}! Take ${m.dose}mg now.`);
                }
            });
        }, 1000);
        
        // Utils
        window.takeMedicine = (id) => {
            medicines = medicines.map(m => m.id === id ? {...m, status: 'taken'} : m);
            localStorage.setItem('medicines', JSON.stringify(medicines));
            displayReminders();
        };
        
        window.deleteMedicine = (id) => {
            medicines = medicines.filter(m => m.id !== id);
            localStorage.setItem('medicines', JSON.stringify(medicines));
            displayReminders();
        };
        
        displayReminders();
    </script>
    
    <style>
        .input-field { @apply w-full p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent; }
        .btn-primary { @apply bg-gradient-to-r from-blue-500 to-purple-600 text-white font-bold hover:shadow-xl transition-all; }
        .btn-hover { @apply text-gray-700 hover:text-blue-600 font-semibold transition-colors; }
    </style>
</body>
</html>
