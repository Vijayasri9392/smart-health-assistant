// Lab Report Analyzer
document.addEventListener("DOMContentLoaded", () => {
  const uploadBtn = document.getElementById("uploadBtn");
  const labInput = document.getElementById("labReportUpload");
  const resultDiv = document.getElementById("resultContent"); // use existing UI
  const resultsBox = document.getElementById("results");

  if (!uploadBtn || !labInput) return;

  uploadBtn.addEventListener("click", () => labInput.click());

  labInput.addEventListener("change", async () => {
    const file = labInput.files?.[0];
    if (!file) return;

    uploadBtn.textContent = `📁 ${file.name}`;

    const token = localStorage.getItem("token");
    if (!token) return alert("Please login again.");

    const form = new FormData();
    form.append("report", file);

    try {
      const res = await fetch("/api/health/analyze-report", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: form
      });

      const data = await res.json();

      if (resultsBox) resultsBox.classList.remove("hidden");

      if (!res.ok) {
        resultDiv.innerHTML = `<p class="text-red-600 font-semibold">❌ ${data.error || "Upload failed"}</p>`;
        return;
      }

      const findingsHTML = (data.findings || []).map(f => {
        const msg = (typeof f === "string") ? f : (f.english || JSON.stringify(f));
        const sev = (typeof f === "object" && f !== null) ? (f.severity || "") : "";
        return `
          <div class="p-4 bg-yellow-50 rounded-xl border border-yellow-200 mb-3">
            <p class="font-bold">${msg}</p>
            ${sev ? `<p class="text-sm text-gray-600">${sev}</p>` : ""}
          </div>
        `;
      }).join("");


      resultDiv.innerHTML = `
        <h3 class="text-2xl font-bold mb-3">🔬 Report Analysis</h3>
        <p class="mb-4">${data.summary || ""}</p>
        ${findingsHTML || "<p>No keyword findings.</p>"}
        <p class="mt-4 font-semibold">${data.recommendation || ""}</p>
      `;

      // ✅ use data only here
      if (data.history && typeof renderHistory === "function") {
        renderHistory(data.history);
      }
    } catch (e) {
      alert("Error analyzing report");
      console.error(e);
    }
  });

  

  

});



// function analyzeLabReport(text) {
//     const findings = [];
//     const textLower = text.toLowerCase();
    
//     // Simple keyword matching
//     const keywords = {
//         'hgb': { low: 'Low Hemoglobin - Anemia risk', high: 'High Hemoglobin' },
//         'rbc': { low: 'Low Red Blood Cells - Anemia', high: 'High RBC' },
//         'wbc': { low: 'Low WBC - Infection risk', high: 'High WBC - Infection' },
//         'plt': { low: 'Low Platelets - Bleeding risk', high: 'High Platelets' },
//         'glucose': 'High sugar - Diabetes risk',
//         'pressure': 'Blood pressure issue - Heart risk'
//     };
    
//     Object.keys(keywords).forEach(key => {
//         if (textLower.includes(key)) {
//             findings.push({ english: typeof keywords[key] === 'string' ? keywords[key] : keywords[key].low, severity: 'Medium' });
//         }
//     });
    
//     showResults(findings);
// }

// function showResults(findings) {
//     const resultDiv = document.getElementById('reportResult');
//     if (findings.length) {
//         resultDiv.innerHTML = `
//             <div class="alert alert-warning">
//                 <h5>🔬 Lab Analysis Results:</h5>
//                 ${findings.map(f => `<p><strong>${f.english}</strong></p>`).join('')}
//                 <button onclick="showNearbyDoctors()" class="btn btn-danger mt-2">Contact Nearby Doctors</button>
//             </div>
//         `;
//     } else {
//         resultDiv.innerHTML = '<div class="alert alert-success">No critical issues detected.</div>';
//     }
// }

// window.showNearbyDoctors = function() {
//     alert('Nearby doctors feature coming soon!');
// };
