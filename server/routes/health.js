const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User'); // ← FIXED IMPORT
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const Papa = require('papaparse');
const router = express.Router();

const allowedExt = ["pdf", "txt", "csv", "docx", "png", "jpg", "jpeg"];

const upload = multer({
  dest: "uploads/",
  fileFilter: (_req, file, cb) => {
    const ext = (file.originalname.split(".").pop() || "").toLowerCase();
    if (!allowedExt.includes(ext)) {
      return cb(new Error("Unsupported file type"), false);
    }
    cb(null, true);
  }
});



// Load datasets
const loadDatasets = () => {
  const datasets = {};
  const files = ['symptoms-diseases', 'precautions', 'suggestions', 'medicines', 'food-advice', 'doctors-hospitals'];

  files.forEach(fileName => {
    try {
      const filePath = path.join(__dirname, '../../public/datasets/', `${fileName}.csv`);
      if (fs.existsSync(filePath)) {
        const csv = fs.readFileSync(filePath, 'utf8');
        const parsed = Papa.parse(csv, { header: true, skipEmptyLines: true });
        datasets[fileName] = parsed.data.filter(row => row && Object.keys(row).length > 0);
      }
    } catch (e) {
      console.log(`Dataset load error ${fileName}.csv`);
    }
  });
  return datasets;
};

// ✅ 2. getDatasetValue (ADD AFTER loadDatasets)
const getDatasetValue = (datasets, datasetName, disease, columnName) => {
  const dataset = datasets[datasetName];
  if (!dataset) return '';
  const match = dataset.find(row =>
    row.Disease === disease || row.disease === disease || row.Disease_name === disease
  );
  return match ? match[columnName] || '' : '';
};

// Auth middleware
// FIXED Auth middleware
const authenticateToken = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, 'supersecretkey123');
    req.user = decoded;
    next();
  } catch (error) {
    console.error('Token error:', error.message);
    return res.status(403).json({ error: 'Invalid token' });
  }
};

// Predict disease
router.post('/predict', authenticateToken, (req, res) => {
  try {
    const { symptoms } = req.body;
    console.log('🔍 Predicting:', symptoms);

    if (!symptoms || !Array.isArray(symptoms)) {
      return res.json({
        disease: 'Enter symptoms',
        suggestions: 'Try: fever, cough, headache, chest pain, nausea'
      });
    }

    // Load ALL datasets
    const datasets = loadDatasets();
    const symptomData = datasets['symptoms-diseases'] || [];

    console.log(`🔍 Matching ${symptoms.length} symptoms:`, symptoms);

    // PERFECT symptom matching
    let bestMatch = null;
    let maxScore = 0;

    // INSIDE your existing symptomData.forEach(row => {
    symptomData.forEach(row => {
      if (!row.disease) return;

      let score = 0;
      const rowSymptoms = [];

      // ✅ BETTER CSV column matching
      const symptomCols = [
        'symptom_1', 'symptom_2', 'symptom_3', 'symptom_4', 'symptom_5',
        'symptom1', 'symptom2', 'symptom3', 'symptom4', 'symptom5',
        'Symptom_1', 'Symptom_2', 'Symptom_3', 'Symptom_4', 'Symptom_5'
      ];

      symptomCols.forEach(col => {
        if (row[col] && typeof row[col] === 'string') {
          rowSymptoms.push(row[col].toLowerCase().trim());
        }
      });

      // ✅ FUZZY MATCHING
      symptoms.forEach(symptom => {
        const cleanSymptom = symptom.toString().toLowerCase().trim();
        rowSymptoms.forEach(rowSymptom => {
          if (rowSymptom.includes(cleanSymptom) ||
            cleanSymptom.includes(rowSymptom.split(' ')[0]) ||
            rowSymptom.includes('fever') && cleanSymptom.includes('fever')) {
            score++;
          }
        });
      });

      console.log(`📊 ${row.disease}: score ${score}/${symptoms.length}`);

      if (score > maxScore) {
        maxScore = score;
        bestMatch = row;
      }
    });


    console.log(`✅ Best match: ${bestMatch?.disease} (score: ${maxScore})`);

    if (bestMatch && maxScore > 0) {
      const disease = bestMatch.disease;

      res.json({
        disease,
        severity: bestMatch.severity_level || 'low',
        precautions: getDatasetValue(datasets, 'precautions', disease, 'Precaution') || 'Rest and monitor symptoms',
        suggestions: getDatasetValue(datasets, 'suggestions', disease, 'Suggestion') || 'Consult doctor if symptoms persist',
        medicines: getDatasetValue(datasets, 'medicines', disease, 'Medication') || 'Paracetamol (consult doctor)',
        foodAdvice: getDatasetValue(datasets, 'food-advice', disease, 'Diet') || 'Light diet, plenty of fluids',
        doctors: getDatasetValue(datasets, 'doctors-hospitals', disease, 'Doctor') || 'Visit nearest clinic',
        isCritical: maxScore >= 3 || disease.toLowerCase().includes('heart')
      });
    } else {
      res.json({
        disease: 'Common Viral Infection',
        suggestions: 'Rest, hydration, paracetamol. Consult doctor if fever > 3 days.',
        precautions: 'Avoid crowded places, wash hands frequently',
        medicines: 'Paracetamol 500mg (max 4/day)',
        severity: 'low'
      });
    }
  } catch (error) {
    console.error('Predict error:', error);
    res.json({
      disease: 'Processing Error',
      suggestions: 'Try: fever cough headache'
    });
  }
});

// // Helper function
// function loadDatasets() {
//   const datasets = {};
//   const files = {
//     'symptoms-diseases': 'symptoms-diseases.csv',
//     'precautions': 'precautions.csv',
//     'suggestions': 'suggestions.csv',
//     'medicines': 'medicines.csv',
//     'food-advice': 'food-advice.csv',
//     'doctors-hospitals': 'doctors-hospitals.csv'
//   };

//   Object.entries(files).forEach(([key, filename]) => {
//     try {
//       const filePath = path.join(__dirname, '../../public/datasets', filename);
//       if (fs.existsSync(filePath)) {
//         const csv = fs.readFileSync(filePath, 'utf8');
//         const parsed = Papa.parse(csv, { 
//           header: true, 
//           skipEmptyLines: true,
//           dynamicTyping: false
//         });
//         datasets[key] = parsed.data.filter(row => row && Object.keys(row).length > 1);
//         console.log(`✅ Loaded ${key}: ${datasets[key].length} rows`);
//       }
//     } catch (e) {
//       console.log(`⚠️ Missing: ${filename}`);
//     }
//   });
//   return datasets;
// }






// Report analysis (simplified)
// ✅ NEW - SINGLE RESPONSE ONLY
router.post('/analyze-report', authenticateToken, upload.single('report'), async (req, res) => {
  try {
    let responsePayload = null;

    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const fs = require("fs");
    const path = require("path");
    const User = require("../models/User");
    const Papa = require("papaparse");
    const pdfParse = require("pdf-parse");
    const mammoth = require("mammoth");
    const Tesseract = require("tesseract.js");

    const filePath = req.file.path;
    const allowed = ["pdf", "txt", "csv", "doc", "docx", "png", "jpg", "jpeg"];
    const ext = (req.file.originalname.split(".").pop() || "").toLowerCase();
    if (!allowed.includes(ext)) return res.status(400).json({ error: "Unsupported file type" });



    // 1) read content (txt/csv supported)
    let text = "";

    if (ext === "txt" || ext === "csv") {
      text = fs.readFileSync(filePath, "utf8");
    }

    else if (ext === "pdf") {
      const dataBuffer = fs.readFileSync(filePath);
      const pdfData = await pdfParse(dataBuffer);
      text = pdfData.text || "";
    }

    else if (ext === "docx") {
      const dataBuffer = fs.readFileSync(filePath);
      const docData = await mammoth.extractRawText({ buffer: dataBuffer });
      text = docData.value || "";
    }

    else if (ext === "png" || ext === "jpg" || ext === "jpeg") {
      const result = await Tesseract.recognize(
        filePath,
        "eng",
        { logger: m => console.log("OCR:", m.status, m.progress) }
      );
      text = result?.data?.text || "";
    }


    else {
      text = "";
    }

    text = (text || "").toLowerCase();



    // 2) load keyword dataset (your existing JSON)
    const keywordsPath = path.join(__dirname, "../../datasets/lab_keywords.json");
    const keywords = fs.existsSync(keywordsPath)
      ? JSON.parse(fs.readFileSync(keywordsPath, "utf8"))
      : {};

    // 3) Analyze report properly (TXT keyword + CSV numeric comparison)
    let findings = [];
    let isCritical = false;
    let severity = "low";
    let predictedDisease = "Lab Report Analysis";

    // ✅ (A) If CSV uploaded -> parse + compare numbers using ranges JSON
    if (ext === "csv") {
      const rangesPath = path.join(__dirname, "../../datasets/lab_reference_ranges.json");
      const ranges = fs.existsSync(rangesPath)
        ? JSON.parse(fs.readFileSync(rangesPath, "utf8"))
        : {};

      const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
      const rows = parsed.data;
      const headers = parsed.meta.fields || [];

      function normalizeHeader(h) {
        return String(h || "")
          .replace(/\(.*?\)/g, "")
          .replace(/[^a-zA-Z0-9]/g, "")
          .toLowerCase();
      }

      function checkRange(label, value, range) {
        if (!range || !Number.isFinite(value)) return;
        const low = Number(range.low);
        const high = Number(range.high);

        if (Number.isFinite(low) && value < low) {
          findings.push(`${label} is LOW (${value}). This may indicate deficiency.`);
          severity = "high";
          isCritical = true;
          predictedDisease = "Abnormal CBC values detected";
        } else if (Number.isFinite(high) && value > high) {
          findings.push(`${label} is HIGH (${value}). This may indicate infection/inflammation.`);
          severity = "high";
          isCritical = true;
          predictedDisease = "Abnormal CBC values detected";
        }
      }

      // ✅ Compare every numeric lab column found in uploaded CSV
      rows.forEach(row => {
        headers.forEach(h => {
          const key = normalizeHeader(h);     // "MCV (fL)" -> "mcv"
          const val = parseFloat(row[h]);

          if (!Number.isFinite(val)) return;

          const range = ranges[key];          // ranges["mcv"]
          if (range) checkRange(h, val, range); // use original header for display
        });
      });

      if (!findings.length) {
        findings.push("All detected lab values look within a normal range.");
        severity = "normal";
        isCritical = false;
        predictedDisease = "Likely normal lab report";
      }
    }


    // ✅ (B) If it becomes text (txt/pdf/docx/png/jpg/jpeg) -> run keyword/BP matching
    else if (["txt", "pdf", "docx", "png", "jpg", "jpeg"].includes(ext)) {

      // Example: detect BP like 150/90
      const bpMatch = text.match(/(\d{2,3})\s*\/\s*(\d{2,3})/);
      if (bpMatch) {
        const sys = parseInt(bpMatch[1], 10);
        const dia = parseInt(bpMatch[2], 10);
        if (sys >= 140 || dia >= 90) {
          findings.push(`High BP detected (${sys}/${dia}). This may be risky for heart health.`);
          predictedDisease = "Possible Hypertension";
          severity = "high";
          isCritical = true;
        }
      }

      // keyword matching (uses lab_keywords.json)
      for (const key of Object.keys(keywords)) {
        if (text.includes(key.toLowerCase())) {
          const rule = keywords[key];
          if (rule.english) findings.push(rule.english);
        }
      }

      if (!findings.length) {
        findings.push("No major keywords detected in the uploaded report.");
        severity = "normal";
      }
    }

    // ✅ (C) Actually unsupported (rare, because multer already blocks others)
    else {
      return res.status(400).json({ error: "Unsupported file type" });
    }



    const hasRealFinding = findings.some(f =>
      typeof f === "string" && !f.toLowerCase().includes("unsupported")
    );

    summary: hasRealFinding
      ? "✅ Report analyzed. Here’s a simple explanation."
      : "No major keywords detected in the uploaded report.",
      severity,
      isCritical
      ;

    // ✅ SAVE TO HISTORY automatically
    const historyEntry = {
      symptoms: `Lab report uploaded: ${req.file.originalname}`,
      disease: predictedDisease,
      details: JSON.stringify(responsePayload),
      severity,
      isCritical,
      timestamp: new Date()
    };

    const updatedUser = await User.findByIdAndUpdate(
      req.user.userId,
      { $push: { history: historyEntry } },
      { new: true } // ✅ returns updated document
    );

    // cleanup
    fs.unlinkSync(filePath);

    return res.json({
      ...responsePayload,
      savedHistoryEntry: historyEntry,
      history: updatedUser?.history || []
    });



  } catch (error) {
    console.error("Analyze report error FULL:", error);
    console.error("STACK:", error && error.stack);
    return res.status(500).json({
      error: "Could not analyze report",
      details: error && error.message ? error.message : String(error)
    });
  }




});




// // History endpoints
// router.get('/history', authenticateToken, async (req, res) => {
//   try {
//     const user = await User.findById(req.user.userId);
//     res.json(user?.history || []);
//   } catch {
//     res.json([]);
//   }
// });

// FIXED History POST - Proper data format
router.post('/history', authenticateToken, async (req, res) => {
  try {
    const { symptoms, disease, details } = req.body;

    const historyEntry = {
      symptoms: symptoms || 'Symptoms checked',
      disease: disease || 'Analyzed',
      details: JSON.stringify(details || {}),
      timestamp: new Date(),
      severity: details?.severity || 'low',
      isCritical: details?.isCritical || false
    };

    console.log('💾 SAVING:', historyEntry.symptoms, '→', historyEntry.disease);

    await User.findByIdAndUpdate(
      req.user.userId,
      { $push: { history: historyEntry } },
      { upsert: true }
    );

    res.json({ success: true });
  } catch (error) {
    console.error('History POST error:', error);
    res.json({ success: false });
  }
});



function renderHistory(history) {
  const container = document.getElementById("historyList");
  if (!container) return;

  container.innerHTML = history.map(h => {
    const title = h.symptoms?.startsWith("Lab report uploaded:")
      ? "📄 Lab Report"
      : "🩺 Symptoms";

    const details = h.symptoms?.startsWith("Lab report uploaded:")
      ? `File: ${h.symptoms.replace("Lab report uploaded: ", "")}`
      : `Symptoms: ${h.symptoms || "-"}`;

    return `
      <div class="p-4 bg-white rounded-xl shadow mb-3">
        <h3 class="font-bold">${title}</h3>
        <p>${details}</p>
        <p><b>Disease:</b> ${h.disease || "-"}</p>
        <p class="text-sm text-gray-600">${new Date(h.timestamp).toLocaleString()}</p>
      </div>
    `;
  }).join("");
}


// FIXED Clear All
router.delete('/history', authenticateToken, async (req, res) => {
  try {
    console.log('🗑️ CLEARING ALL history for:', req.user.userId);
    await User.findByIdAndUpdate(req.user.userId, { history: [] });
    res.json({ success: true });
  } catch (error) {
    console.error('Clear history error:', error);
    res.json({ success: false });
  }
});


router.delete('/history/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const historyId = req.params.id;

    const user = await User.findById(userId);
    if (user && user.history) {
      user.history = user.history.filter(item =>
        JSON.stringify(item._id) !== JSON.stringify(historyId)
      );
      await user.save();
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Delete history error:', error);
    res.json({ success: false });
  }
});


// FIXED History GET - Clean data structure
router.get('/history', authenticateToken, async (req, res) => {
  try {
    console.log('🔍 HISTORY REQUEST from user:', req.user.userId);
    console.log('🔍 Full req.user:', req.user);

    const user = await User.findById(req.user.userId);
    console.log('🔍 Found user:', user ? 'YES' : 'NO');
    console.log('🔍 User history length:', user?.history?.length || 0);

    const history = user?.history || [];
    console.log('🔍 RETURNING history:', history.length, 'items');

    res.json(history);
  } catch (error) {
    console.error('❌ History GET ERROR:', error);
    res.json([]);
  }
});






// Profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    res.json(user || { email: 'User', name: 'User' });
  } catch {
    res.json({ email: 'User', name: 'User' });
  }
});

router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const updates = req.body;
    const user = await User.findByIdAndUpdate(req.user.userId, updates, { new: true }).select('-password');
    res.json({ message: 'Profile updated', ...req.body });
  } catch (error) {
    res.json({ message: 'Update failed' });
  }
});

module.exports = router;
