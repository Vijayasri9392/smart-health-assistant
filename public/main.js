let model;
let symptomList = [];
let labels = [];
let precautionMap = {};
let specialistMap = {};
let descriptionMap = {};


// client/app.js
const apiBase = "http://localhost:5000/api";

// Attach listeners after DOM loaded
window.addEventListener("DOMContentLoaded", () => {
  document.getElementById("predictBtn").addEventListener("click", handlePredictClick);
  document.getElementById("clearHistoryBtn").addEventListener("click", clearHistory);
  document.getElementById("uploadBtn").addEventListener("click", uploadReportHandler);
  document.getElementById("loginBtn")?.addEventListener("click", () => {
  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value.trim();

  if (!email || !password) {
    alert("Enter email and password");
    return;
  }

  loginUser(email, password);
});

  loadHistory();
  loadMedicalCSVs();   // ✅ ADD THIS LINE
});

async function loginUser() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  const res = await fetch("http://127.0.0.1:8080/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });

  const data = await res.json();

  if (!res.ok) {
    alert(data.message);
    return;
  }

  localStorage.setItem("token", data.token);
  document.getElementById("loginPage").style.display = "none";
  document.getElementById("mainPage").style.display = "block";
}


// ================= STEP 5 – LOAD MODEL + METADATA =================
async function loadModelAndData() {
  model = await tf.loadLayersModel('tf-model/model.json');
  console.log("✅ Model loaded");

  symptomList = await fetch('tf-model/symptoms.json').then(r => r.json());
  console.log("✅ Symptoms loaded:", symptomList.length);

  labels = await fetch('tf-model/labels.json').then(r => r.json());
  console.log("✅ Labels loaded:", labels.length);
}
window.onload = loadModelAndData;

// ================= STEP 5 – ENCODE SYMPTOMS =================
function encodeSymptoms(userSymptomsArray) {
  if (!Array.isArray(userSymptomsArray)) {
    console.error("encodeSymptoms expected array, got:", userSymptomsArray);
    return tf.tensor2d([new Array(symptomList.length).fill(0)]);
  }

  const vector = new Array(symptomList.length).fill(0);

  userSymptomsArray.forEach(symptom => {
    const idx = symptomList.indexOf(symptom.toLowerCase().trim());
    if (idx !== -1) vector[idx] = 1;
  });

  return tf.tensor2d([vector]);
}

// ================= STEP 5 – PREDICT =================
async function predictDisease(userSymptoms) {
  const inputTensor = encodeSymptoms(userSymptoms);

  const preds = model.predict(inputTensor);
  const probs = Array.from(await preds.data());

  console.log("Probabilities:", probs);

  // 🔥 MAP probabilities to disease labels
  const results = probs.map((p, i) => ({
    disease: labels[i],
    confidence: p
  }));

  results.sort((a, b) => b.confidence - a.confidence);

// 🔹 SAVE to history
await saveToHistory(userSymptoms.join(", "), results);

// 🔹 SHOW prediction
showPrediction(results);

// 🔹 RELOAD history sidebar
loadHistory();


}



// ================= STEP 5 – CONNECT UI =================
async function handlePredictClick() {
  const inputEl = document.getElementById("symptomInput");

  if (!inputEl) {
    console.error("❌ Input element with id='symptoms' not found");
    alert("Input box not found. Check HTML id.");
    return;
  }

  const input = inputEl.value.trim();

  if (!input) {
    alert("Please enter symptoms");
    return;
  }

  const symptomInput = input.split(",").map(s => s.trim().toLowerCase());
  await predictDisease(symptomInput);
}




function loadMedicalCSVs() {

  Papa.parse("data/disease_precautions.csv", {
    download: true,
    header: true,
    complete: res => {
      res.data.forEach(r => {
        if (!r.disease) return;
        precautionMap[r.disease.toLowerCase()] = [
          r.precaution_1,
          r.precaution_2,
          r.precaution_3,
          r.precaution_4
        ].filter(Boolean);
      });
    }
  });

  Papa.parse("data/disease_specialist.csv", {
    download: true,
    header: true,
    complete: res => {
      res.data.forEach(r => {
        if (!r.disease) return;
        specialistMap[r.disease.toLowerCase()] = r.specialist;
      });
    }
  });

  Papa.parse("data/disease_description.csv", {
    download: true,
    header: true,
    complete: res => {
      res.data.forEach(r => {
        if (!r.disease) return;
        descriptionMap[r.disease.toLowerCase()] = r.description;
      });
    }
  });

}


// Render a prediction object or a history record
function showPrediction(results) {
  const resultDiv = document.getElementById("result");
  resultDiv.innerHTML = "";

  if (!results || results.length === 0) {
    resultDiv.innerHTML = "<p>No predictions found</p>";
    return;
  }

  const topN = results.slice(0, 3);


  const mainDisease = results[0].disease.toLowerCase();

  const precautions = precautionMap[mainDisease] || ["Consult a doctor"];
  const specialist = specialistMap[mainDisease] || "General Physician";
  const description = descriptionMap[mainDisease] || "";


  topN.forEach(r => {
    const percent = (r.confidence * 100).toFixed(2);
    resultDiv.innerHTML += `
      <div class="p-2 border-b">
        <strong>${r.disease}</strong> — ${percent}%
      </div>
    `;
  });

  resultDiv.innerHTML += `
  <div class="mt-4 p-3 bg-gray-50 rounded">
    <h3 class="font-bold">About</h3>
    <p>${description}</p>

    <h3 class="font-bold mt-2">Precautions</h3>
    <ul>
      ${precautions.map(p => `<li>• ${p}</li>`).join("")}
    </ul>

    <h3 class="font-bold mt-2">Recommended Specialist</h3>
    <p>${specialist}</p>
  </div>
`;

}


// helper: escape HTML to be safe
function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// Load history into sidebar list
async function loadHistory() {
  try {
    
    const res = await fetch(`${apiBase}/predict/history`, {
  headers: {
    // 🔐 ADD THIS HEADER
    'x-auth-token': localStorage.getItem('token')
  }
});

    const history = await res.json();
    const list = document.getElementById("historyList"); // your sidebar container
    list.innerHTML = "";

    history.forEach(item => {
      const li = document.createElement("div");
      li.className = "p-2 mb-2 bg-gray-50 rounded flex justify-between items-center";
      // clicking the text should show full prediction
      const left = document.createElement("button");
      left.className = "text-left text-blue-700 hover:underline flex-1";
      left.textContent = item.symptoms;
      left.onclick = () => showPrediction(item.predictions);


      const del = document.createElement("button");
      del.className = "text-red-500 ml-2";
      del.textContent = "🗑";
      del.onclick = async (e) => {
        e.stopPropagation();
        await fetch(`${apiBase}/predict/history/${item._id}`, { method: "DELETE" });
        loadHistory();
      };

      li.appendChild(left);
      li.appendChild(del);
      list.appendChild(li);
    });
  } catch (err) {
    console.error("Error loading history:", err);
  }
}



async function saveToHistory(symptomsText, results) {
  try {
    await fetch(`${apiBase}/predict`, {
      method: "POST",
      headers: { "Content-Type": "application/json" ,  
    'x-auth-token': localStorage.getItem('token') },

      body: JSON.stringify({
        symptoms: symptomsText,
        predictions: results
      })
    });
  } catch (err) {
    console.error("Failed to save history:", err);
  }
}

const token = localStorage.getItem("token");

fetch("http://localhost:5000/api/predict", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token}`
  },
  body: JSON.stringify({ symptoms })
});


// clear all history
async function clearHistory() {
  if (!confirm("Clear all history?")) return;
  await fetch(`${apiBase}/predict/history`, { method: "DELETE" });
  loadHistory();
}

// async function uploadReport() {
//   const file = document.getElementById("reportInput").files[0];
//   if (!file) return alert("Please upload a lab report image!");

//   const { createWorker } = Tesseract;
//   const worker = await createWorker('eng');

//   console.log("🔍 Processing image...");
//   const { data: { text } } = await worker.recognize(file);
//   console.log("Extracted text:", text);

//   document.getElementById("predictions").innerHTML = `<h3 class="font-semibold">OCR Extracted Data:</h3><pre>${text}</pre>`;
//   await worker.terminate();
// }




// ---------------- Enhanced OCR parsing + interpretation ----------------

// convert mmol/L -> mg/dL (glucose)
function mmolToMgdl(value) {
  return Number(value) * 18;
}

// Robust extraction of lab values from OCR text
function extractLabValues(text) {
  if (!text) return {};

  // normalize spacing and punctuation
  const t = text.replace(/\r/g, "\n").replace(/\u00A0/g, " ").trim();

  const res = {};

  // 1) HbA1c (many forms: HbA1c, HBA1C, Hb A1c, A1c)
  let m = t.match(/\b(?:h\s*b\s*a\s*1\s*c|hba1c|a1c)[:\s\-]*([\d.,]{1,4})\s*%?/i);
  if (m) {
    const v = parseFloat(m[1].replace(",", "."));
    if (!Number.isNaN(v)) res.hba1c = { value: v, unit: "%" };
  }

  // 2) Fasting blood sugar (Fasting Blood Sugar, FBS, Fasting glucose)
  m = t.match(/(?:fasting\s*blood\s*sugar|fasting\s*glucose|fbs)[:\s\-]*([\d.,]{2,6})\s*(mg\/dl|mgdl|mmol\/l|mmol)?/i);
  if (m) {
    let v = parseFloat(m[1].replace(",", "."));
    const unit = (m[2] || "mg/dl").toLowerCase();
    if (unit.includes("mmol")) v = mmolToMgdl(v);
    if (!Number.isNaN(v)) res.fasting = { value: Math.round(v * 10) / 10, unit: "mg/dL" };
  } else {
    // generic fallback: "Fasting ... number"
    m = t.match(/fasting[^\d]{0,10}([\d.]{2,6})\s*(mg\/dl|mmol\/l|mmol)?/i);
    if (m) {
      let v = parseFloat(m[1].replace(",", "."));
      const unit = (m[2] || "mg/dl").toLowerCase();
      if (unit.includes("mmol")) v = mmolToMgdl(v);
      if (!Number.isNaN(v)) res.fasting = { value: Math.round(v * 10) / 10, unit: "mg/dL" };
    }
  }

  // 3) Random blood sugar (RBS)
  m = t.match(/(?:random\s*blood\s*sugar|rbs|random\s*glucose)[:\s\-]*([\d.,]{2,6})\s*(mg\/dl|mmol\/l|mmol)?/i);
  if (m) {
    let v = parseFloat(m[1].replace(",", "."));
    const unit = (m[2] || "mg/dl").toLowerCase();
    if (unit.includes("mmol")) v = mmolToMgdl(v);
    if (!Number.isNaN(v)) res.random = { value: Math.round(v * 10) / 10, unit: "mg/dL" };
  }

  // 4) LDL / HDL / Total Cholesterol - allow noisy spacing
  m = t.match(/ldl[:\s\-]*([\d.,]{2,6})\s*mg\/dl/i) || t.match(/ldl[^\d]{0,8}([\d.]{2,6})\s*mg\/dl/i);
  if (m) res.ldl = parseFloat(m[1].replace(",", "."));

  m = t.match(/hdl[:\s\-]*([\d.,]{2,6})\s*mg\/dl/i) || t.match(/hdl[^\d]{0,8}([\d.]{2,6})\s*mg\/dl/i);
  if (m) res.hdl = parseFloat(m[1].replace(",", "."));

  m = t.match(/(?:total\s+cholesterol|cholesterol)[:\s\-]*([\d.,]{2,6})\s*mg\/dl/i) || t.match(/chol[:\s\-]*([\d.,]{2,6})\s*mg\/dl/i);
  if (m) res.totalChol = parseFloat(m[1].replace(",", "."));

  // 5) Fallback: first mg/dL numeric value (if nothing else found)
  if (!res.fasting && !res.random && !res.hba1c) {
    const mgMatches = Array.from(t.matchAll(/([\d.]{2,6})\s*(mg\/dl|mgdl)/ig));
    if (mgMatches.length) {
      const val = parseFloat(mgMatches[0][1].replace(",", "."));
      if (!Number.isNaN(val)) res.unknown_mgdl = val;
    }
  }

  return res;
}

// Provide interpretation + short precautions + doctor advice for parsed results
function interpretLabsEnhanced(vals) {
  const notes = [];
  const precautions = new Set();
  const doctorAdvice = new Set();

  // HbA1c
  if (vals.hba1c) {
    const v = vals.hba1c.value;
    if (v >= 6.5) {
      notes.push(`HbA1c ${v}% — diabetes range (≥6.5%).`);
      precautions.add("Start glucose monitoring, follow diabetic diet, consult doctor.");
      doctorAdvice.add("See endocrinologist for diagnosis and management.");
    } else if (v >= 5.7) {
      notes.push(`HbA1c ${v}% — prediabetes (5.7–6.4%).`);
      precautions.add("Lifestyle changes: diet and exercise.");
      doctorAdvice.add("Consider follow-up testing; consult a physician for guidance.");
    } else {
      notes.push(`HbA1c ${v}% — within normal range.`);
    }
  }

  // Fasting glucose
  if (vals.fasting) {
    const f = vals.fasting.value;
    if (f >= 126) {
      notes.push(`Fasting glucose ${f} mg/dL — high (diabetes range).`);
      precautions.add("Avoid sugary food; stay hydrated; check diet.");
      doctorAdvice.add("Urgent follow-up with physician; consider fasting repeat test and HbA1c.");
    } else if (f >= 100) {
      notes.push(`Fasting glucose ${f} mg/dL — impaired fasting glucose (prediabetes).`);
      precautions.add("Lifestyle changes: reduce carbs, exercise.");
      doctorAdvice.add("Discuss repeat testing and lifestyle interventions with your physician.");
    } else {
      notes.push(`Fasting glucose ${f} mg/dL — normal.`);
    }
  }

  // Random glucose
  if (vals.random) {
    const r = vals.random.value;
    if (r >= 200) {
      notes.push(`Random glucose ${r} mg/dL — high (possible diabetes).`);
      precautions.add("Measure fasting glucose and/or HbA1c for confirmation.");
      doctorAdvice.add("See a doctor for confirmatory testing if symptomatic.");
    } else {
      notes.push(`Random glucose ${r} mg/dL — check fasting/HbA1c for confirmation.`);
    }
  }

  // LDL
  if (vals.ldl !== undefined) {
    const l = vals.ldl;
    if (l >= 160) {
      notes.push(`LDL ${l} mg/dL — high (cardiovascular risk).`);
      precautions.add("Reduce saturated fat; consider diet and exercise.");
      doctorAdvice.add("Consult cardiologist/physician for lipid management.");
    } else {
      notes.push(`LDL ${l} mg/dL.`);
    }
  }

  // HDL
  if (vals.hdl !== undefined) {
    const h = vals.hdl;
    if (h < 40) {
      notes.push(`HDL ${h} mg/dL — low (lower protective effect).`);
      precautions.add("Increase physical activity; improve diet.");
      doctorAdvice.add("Discuss lifestyle measures with physician.");
    } else {
      notes.push(`HDL ${h} mg/dL.`);
    }
  }

  // Total cholesterol fallback
  if (vals.totalChol) {
    notes.push(`Total cholesterol ${vals.totalChol} mg/dL.`);
  }

  // If only unknown mg/dL found
  if (vals.unknown_mgdl) {
    notes.push(`Found numeric value ${vals.unknown_mgdl} mg/dL but label unclear.`);
  }

  return {
    notes,
    precautions: Array.from(precautions),
    doctorAdvice: Array.from(doctorAdvice).join(" ")
  };
}


// Safe upload handler (attach after DOM is loaded)
async function uploadReportHandler(event) {
  event?.preventDefault?.();

  const fileInput = document.getElementById("reportFile");
  const progressEl = document.getElementById("ocrProgress");
  const textEl = document.getElementById("ocrText");
  const resultEl = document.getElementById("ocrResult");

  if (!fileInput) {
    alert("Missing file input element (#reportFile). Check your HTML.");
    return;
  }
  if (!fileInput.files || fileInput.files.length === 0) {
    alert("Please choose an image file first.");
    return;
  }

  // Clear UI
  textEl.textContent = "";
  resultEl.innerHTML = "";
  if (progressEl) progressEl.textContent = "Starting OCR...";

  const file = fileInput.files[0];

  try {
    // Use Tesseract.recognize with a logger callback
    const workerOptions = {
      lang: 'eng',
      logger: m => {
        // m: { status, progress }
        if (progressEl) {
          try {
            const pct = m.progress ? Math.round(m.progress * 100) : 0;
            progressEl.textContent = `${m.status || ""} ${pct}%`;
          } catch (e) { /* ignore logging errors */ }
        }
      }
    };

    // Recognize — this returns a Promise
    const { data: { text } } = await Tesseract.recognize(file, 'eng', workerOptions);

    // show raw OCR text
    textEl.textContent = text || "(no text extracted)";

    // after `text` is obtained from OCR:
const parsed = extractLabValues(text);
const interp = interpretLabsEnhanced(parsed);

// Build HTML
let html = `<h4 class="font-semibold">Parsed Values</h4><ul>`;
if (parsed.hba1c) html += `<li>HbA1c: ${parsed.hba1c.value}%</li>`;
if (parsed.fasting) html += `<li>Fasting Glucose: ${parsed.fasting.value} mg/dL</li>`;
if (parsed.random) html += `<li>Random Glucose: ${parsed.random.value} mg/dL</li>`;
if (parsed.ldl) html += `<li>LDL: ${parsed.ldl} mg/dL</li>`;
if (parsed.hdl) html += `<li>HDL: ${parsed.hdl} mg/dL</li>`;
if (parsed.totalChol) html += `<li>Total Cholesterol: ${parsed.totalChol} mg/dL</li>`;
if (parsed.unknown_mgdl) html += `<li>Unlabeled value: ${parsed.unknown_mgdl} mg/dL</li>`;
html += `</ul>`;

html += `<h4 class="font-semibold mt-2">Interpretation</h4>`;
if (interp.notes.length) html += `<ul>${interp.notes.map(n => `<li>${n}</li>`).join("")}</ul>`;
else html += `<p>No clear lab metrics found to interpret.</p>`;

if (interp.precautions && interp.precautions.length) {
  html += `<h4 class="font-semibold mt-2">Precautions</h4><ul>${interp.precautions.map(p => `<li>${p}</li>`).join("")}</ul>`;
}
if (interp.doctorAdvice) {
  html += `<h4 class="font-semibold mt-2">Doctor Advice</h4><p>${interp.doctorAdvice}</p>`;
}

// Add Use OCR result button
html += `<div class="mt-3"><button id="useOcrBtn" class="bg-blue-600 text-white px-3 py-1 rounded">Use OCR result for Prediction</button></div>`;

document.getElementById("ocrResult").innerHTML = html;
document.getElementById("useOcrBtn").style.display = "inline-block";

// attach handler to inline button
document.getElementById("useOcrBtn").addEventListener("click", () => {
  const summary = [];
  if (parsed.hba1c) summary.push(`HbA1c ${parsed.hba1c.value}%`);
  if (parsed.fasting) summary.push(`Fasting ${parsed.fasting.value} mg/dL`);
  if (parsed.random) summary.push(`Random ${parsed.random.value} mg/dL`);
  if (parsed.ldl) summary.push(`LDL ${parsed.ldl} mg/dL`);
  // put into your main symptom input and call prediction
  document.getElementById("symptomInput").value = summary.join('; ');
  if (typeof predictDisease === 'function') predictDisease();
});




  } catch (err) {
    console.error("OCR error", err);
    if (progressEl) progressEl.textContent = "OCR failed: " + (err.message || err);
    resultEl.innerHTML = "<p class='text-red-500'>OCR failed. See console for error.</p>";
  } finally {
    // clear progress after a short delay
    setTimeout(() => { const p = document.getElementById("ocrProgress"); if (p) p.textContent = ""; }, 1200);
  }
}
