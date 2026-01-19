// Dashboard interactions: profile dropdown, logout, medicine reminders, nearby doctors
document.addEventListener("DOMContentLoaded", () => {
  // -------- Profile dropdown + logout --------
  const profileBtn = document.getElementById("profileBtn");
  const dropdown = document.getElementById("profileDropdown");
  const logoutBtn = document.getElementById("logoutBtn");
  
  function safeAddListener(el, event, fn) {
    if (el) el.addEventListener(event, fn);
  }

  if (profileBtn && dropdown) {
    profileBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      dropdown.classList.toggle("hidden");
    });

    // Close dropdown on outside click
    document.addEventListener("click", () => dropdown.classList.add("hidden"));
    dropdown.addEventListener("click", (e) => e.stopPropagation());
  }

  // Fill profile initial from saved user (fallback to "U")
  try {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const name = (user.name || user.fullName || user.username || user.email || "U").toString().trim();
    if (profileBtn) profileBtn.textContent = name[0].toUpperCase();
  } catch (_) { }

  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "login.html"; // change if your login page name is different
    });
  }

  // -------- Nearby doctors (Google Maps) --------
  const findDoctorsBtn = document.getElementById("findDoctorsBtn");
  if (findDoctorsBtn) {
    findDoctorsBtn.addEventListener("click", () => {
      const openMaps = (lat, lng) => {
        const q = encodeURIComponent("hospitals near me");
        const url = (lat && lng)
          ? `https://www.google.com/maps/search/${q}/@${lat},${lng},14z`
          : `https://www.google.com/maps/search/${q}`;
        window.open(url, "_blank");
      };

      if (!navigator.geolocation) return openMaps();

      navigator.geolocation.getCurrentPosition(
        (pos) => openMaps(pos.coords.latitude, pos.coords.longitude),
        () => openMaps(),
        { enableHighAccuracy: true, timeout: 8000 }
      );
    });
  }

  // -------- Medicine reminders (modal) --------
  const medicineReminderBtn = document.getElementById("medicineReminderBtn");
  const medicineModal = document.getElementById("medicineModal");
  const closeMedicineModal = document.getElementById("closeMedicineModal");
  const addReminderBtn = document.getElementById("addReminderBtn");
  const remindersList = document.getElementById("remindersList");

  const medName = document.getElementById("medicineName");
  const medDosage = document.getElementById("medicineDosage");
  const medTime = document.getElementById("medicineTime");

  const STORAGE_KEY = "medicineReminders_v1";

  function loadReminders() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); }
    catch { return []; }
  }

  function saveReminders(reminders) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(reminders));
  }

  function escapeHtml(str) {
    return String(str ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function renderReminders() {
    if (!remindersList) return;
    const reminders = loadReminders();

    if (reminders.length === 0) {
      remindersList.innerHTML = `<p class="text-gray-600">No reminders yet. Add one above.</p>`;
      return;
    }

    reminders.sort((a, b) => (a.time || "").localeCompare(b.time || ""));
    remindersList.innerHTML = reminders.map(r => `
      <div class="p-4 bg-white rounded-xl shadow-md mb-3 flex justify-between items-center">
        <div>
          <h4 class="font-bold text-lg">${escapeHtml(r.medicine)}</h4>
          <p class="text-sm text-gray-600">${escapeHtml(r.dosage || "")} at ${escapeHtml(r.time)}</p>
        </div>
        <button data-id="${r.id}" class="deleteReminder px-3 py-2 rounded-lg bg-red-100 hover:bg-red-200">🗑️</button>
      </div>
    `).join("");

    remindersList.querySelectorAll(".deleteReminder").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-id");
        saveReminders(loadReminders().filter(x => x.id !== id));
        renderReminders();
      });
    });
  }

  function openMedicineModal() {
    if (!medicineModal) return;
    medicineModal.classList.remove("hidden");
    renderReminders();
  }

  function closeModal() {
    if (medicineModal) medicineModal.classList.add("hidden");
  }

  safeAddListener(medicineReminderBtn, "click", openMedicineModal);
  // if (dropdown && dropdown.classList) {
  //   dropdown.classList.add("hidden");
  // }


  safeAddListener(closeMedicineModal, "click", closeModal);

  if (medicineModal) {
    medicineModal.addEventListener("click", (e) => {
      if (e.target === medicineModal) closeModal();
    });
  }

  if (addReminderBtn) {
    addReminderBtn.addEventListener("click", async () => {
      const medicine = (medName?.value || "").trim();
      const dosage = (medDosage?.value || "").trim();
      const time = (medTime?.value || "").trim();

      if (!medicine || !time) return alert("Please enter medicine name and time.");

      const reminders = loadReminders();
      reminders.push({
        id: crypto?.randomUUID ? crypto.randomUUID() : String(Date.now()),
        medicine,
        dosage,
        time
      });
      saveReminders(reminders);

      if (medName) medName.value = "";
      if (medDosage) medDosage.value = "";
      if (medTime) medTime.value = "";

      renderReminders();

      if ("Notification" in window && Notification.permission === "default") {
        try { await Notification.requestPermission(); } catch (_) { }
      }
    });
  }

  renderReminders();



  // ✅ Alarm sound + reminder trigger (runs every 20 seconds)
  (function startReminderAlarmWatcher() {
    const STORAGE_KEY = "medicineReminders_v1";
    const FIRED_KEY = "medicineReminders_firedToday";

    function beep() {
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = 880; // beep tone
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.2);
        osc.stop(ctx.currentTime + 1.2);
      } catch (e) {
        alert("🔔 Time to take your medicine!");
      }
    }

    function nowHHMM() {
      const d = new Date();
      const hh = String(d.getHours()).padStart(2, "0");
      const mm = String(d.getMinutes()).padStart(2, "0");
      return `${hh}:${mm}`;
    }

    function todayKey() {
      const d = new Date();
      return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
    }

    setInterval(async () => {
      let reminders = [];
      try { reminders = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch { }

      if (!reminders.length) return;

      let fired = {};
      try { fired = JSON.parse(localStorage.getItem(FIRED_KEY) || "{}"); } catch { }

      const today = todayKey();
      if (!fired[today]) fired[today] = {}; // store by reminderId

      const current = nowHHMM();

      for (const r of reminders) {
        if (!r.time || !r.id) continue;
        if (r.time === current && !fired[today][r.id]) {
          fired[today][r.id] = true;
          localStorage.setItem(FIRED_KEY, JSON.stringify(fired));

          // ✅ Sound + Notification
          beep();

          if ("Notification" in window) {
            if (Notification.permission === "default") {
              try { await Notification.requestPermission(); } catch { }
            }
            if (Notification.permission === "granted") {
              new Notification("💊 Medicine Reminder", {
                body: `${r.medicine || "Medicine"} - ${r.dosage || ""}`.trim(),
              });
            }
          }

          alert(`💊 Time to take: ${r.medicine || "Medicine"} ${r.dosage || ""}`.trim());
        }
      }
    }, 20000);
  })();

});
