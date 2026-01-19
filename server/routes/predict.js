// // server/routes/prediction.js
// import express from "express";
// import Prediction from "../models/prediction.js";

// const router = express.Router();

// /**
//  * conditionInfo: map each condition -> its precautions & doctorAdvice (and optional default confidence)
//  * Extend this map as you add more conditions.
//  */
// const conditionInfo = {
//   "Gastritis": {
//     precautions: ["Stay hydrated", "Avoid spicy / oily food", "Eat small frequent meals"],
//     doctorAdvice: "If severe or with blood in vomit / black stool, see a gastroenterologist immediately.",
//     confidence: 0.65
//   },
//   "Food Poisoning": {
//     precautions: ["Maintain hydration (ORS)", "Avoid solid heavy food", "Rest"],
//     doctorAdvice: "If vomiting/diarrhea > 48 hours or high fever, consult a physician.",
//     confidence: 0.45
//   },
//   "Peptic Ulcer": {
//     precautions: ["Avoid NSAIDs and alcohol", "Eat bland food", "Avoid late-night meals"],
//     doctorAdvice: "If you have persistent burning pain, consult a gastroenterologist for tests.",
//     confidence: 0.35
//   },
//   "Migraine": {
//     precautions: ["Rest in a dark, quiet room", "Avoid triggers (strong smells, flashing lights)"],
//     doctorAdvice: "If headaches are severe/frequent or with visual changes, see a neurologist.",
//     confidence: 0.7
//   },
//   "Tension Headache": {
//     precautions: ["Take breaks from screen", "Perform neck stretches", "Manage stress"],
//     doctorAdvice: "If headaches worsen or are not relieved by OTC meds, consult a doctor.",
//     confidence: 0.5
//   },
//   "Sinusitis": {
//     precautions: ["Steam inhalation", "Stay hydrated", "Use saline nasal rinse"],
//     doctorAdvice: "If symptoms last >10 days or show severe facial pain/fever, consult ENT.",
//     confidence: 0.4
//   },
//   "Viral Infection": {
//     precautions: ["Rest", "Hydrate", "Paracetamol for fever"],
//     doctorAdvice: "If fever persists >3 days or breathing difficulty occurs, see a physician.",
//     confidence: 0.6
//   },
//   "Common Cold": {
//     precautions: ["Rest", "Fluids", "Steam inhalation"],
//     doctorAdvice: "Usually self-limited; consult doctor if worsening or high fever.",
//     confidence: 0.5
//   },
//   // fallback
//   "General Illness": {
//     precautions: ["Monitor symptoms", "Maintain hydration"],
//     doctorAdvice: "If symptoms persist or worsen, consult a doctor.",
//     confidence: 0.2
//   }
// };

// // Helper: build structured prediction object
// function makePredictionObj(name) {
//   const info = conditionInfo[name] || conditionInfo["General Illness"];
//   return {
//     disease: name,
//     confidence: info.confidence ?? 0.3,
//     precautions: info.precautions ?? [],
//     doctorAdvice: info.doctorAdvice ?? ""
//   };
// }

// // POST /api/predict
// router.post("/", async (req, res) => {
//   try {
//     const { symptoms } = req.body;
//     if (!symptoms) return res.status(400).json({ error: "No symptoms provided" });

//     const s = symptoms.toLowerCase();

//     // Simple rule-based detection (replace with ML later)
//     let names = [];
//     if (s.includes("stomach") || s.includes("abdomen") || s.includes("pain")) {
//       names = ["Gastritis", "Food Poisoning", "Peptic Ulcer"];
//     } else if (s.includes("headache") || s.includes("migraine")) {
//       names = ["Migraine", "Tension Headache", "Sinusitis"];
//     } else if (s.includes("fever")) {
//       names = ["Viral Infection", "Common Cold"];
//     } else {
//       names = ["General Illness"];
//     }

//     // Build structured predictions
//     const predictions = names.map(makePredictionObj);

//     // Save to DB
//     const doc = new Prediction({ symptoms, predictions });
//     await doc.save();

//     // Response: send structured predictions (and also expose 'conditions' array for convenience)
//     res.json({
//       _id: doc._id,
//       symptoms,
//       predictions,
//       conditions: predictions.map(p => p.disease),
//       createdAt: doc.createdAt
//     });
//   } catch (err) {
//     console.error("Prediction API error:", err);
//     res.status(500).json({ error: "Server error", details: err.message });
//   }
// });

// // GET /api/predict/history
// router.get("/history", async (req, res) => {
//   try {
//     const recs = await Prediction.find().sort({ createdAt: -1 });

//     // Normalize older records that might have stored array of strings
//     const formatted = recs.map(r => {
//       // if r.predictions is array of strings (old), map to objects
//       if (Array.isArray(r.predictions) && r.predictions.length && typeof r.predictions[0] === "string") {
//         const preds = r.predictions.map(name => makePredictionObj(name));
//         return {
//           _id: r._id,
//           symptoms: r.symptoms,
//           predictions: preds,
//           conditions: preds.map(p => p.disease),
//           createdAt: r.createdAt
//         };
//       }

//       // already structured
//       return {
//         _id: r._id,
//         symptoms: r.symptoms,
//         predictions: r.predictions || [],
//         conditions: (r.predictions || []).map(p => (p && p.disease) ? p.disease : String(p)),
//         createdAt: r.createdAt
//       };
//     });

//     res.json(formatted);
//   } catch (err) {
//     console.error("History fetch error:", err);
//     res.status(500).json({ error: "Server error", details: err.message });
//   }
// });

// // DELETE routes (keep as before)
// router.delete("/history/:id", async (req, res) => {
//   try {
//     await Prediction.findByIdAndDelete(req.params.id);
//     res.json({ message: "Deleted" });
//   } catch (err) {
//     res.status(500).json({ error: "Server error" });
//   }
// });
// router.delete("/history", async (req, res) => {
//   try {
//     await Prediction.deleteMany({});
//     res.json({ message: "Cleared" });
//   } catch (err) {
//     res.status(500).json({ error: "Server error" });
//   }
// });

// export default router;

// import express from 'express';
// import Prediction from '../models/prediction.js';

// const router = express.Router();

// /**
//  * POST /api/predict
//  * Saves prediction results from client
//  */
// router.post('/', async (req, res) => {
//   try {
//     const { symptoms, conditions } = req.body;

//     // basic validation
//     if (!symptoms || !conditions) {
//       return res.status(400).json({ error: 'Missing data' });
//     }

//     const pred = new Prediction({
//       symptoms,
//       conditions
//     });

//     await pred.save();
//     res.json(pred);
//   } catch (err) {
//     console.error('Prediction save error:', err);
//     res.status(500).json({ error: 'Server error' });
//   }
// });


// import authMiddleware from '../middleware/auth.js';

// router.post('/', authMiddleware, async (req, res) => {
//   const { symptoms, conditions } = req.body;

//   const pred = new Prediction({
//     user: req.user.id,
//     symptoms,
//     conditions
//   });

//   await pred.save();
//   res.json(pred);
// });


// /**
//  * GET /api/predict/history
//  */
// router.get('/history', async (req, res) => {
//   const history = await Prediction.find().sort({ createdAt: -1 });
//   res.json(history);
// });

// /**
//  * DELETE /api/predict/history/:id
//  */
// router.delete('/history/:id', async (req, res) => {
//   await Prediction.findByIdAndDelete(req.params.id);
//   res.json({ success: true });
// });

// export default router;

const express = require('express');
const auth = require('../middleware/auth');
const User = require('../models/User').default;
const axios = require('axios');
const router = express.Router();

// Symptom prediction (mock AI for now)
router.post('/symptoms', auth, async (req, res) => {
  try {
    const { symptoms, location } = req.body;
    
    // Mock AI prediction (replace with real TF.js later)
    const predictions = {
      'fever cough': { disease: 'Flu', severity: 'Medium', precautions: 'Rest, hydrate', medicine: 'Paracetamol', emergency: false },
      'chest pain': { disease: 'Heart Issue', severity: 'High', precautions: 'Call ambulance', medicine: 'None', emergency: true },
      'headache': { disease: 'Migraine', severity: 'Low', precautions: 'Rest in dark room', medicine: 'Ibuprofen', emergency: false }
    };

    const diagnosis = predictions[symptoms.toLowerCase()] || { disease: 'General Infection', severity: 'Low', emergency: false };

    // Save to history
    await User.findByIdAndUpdate(req.user._id, {
      $push: { 'history': { symptoms, diagnosis: diagnosis.disease } }
    });

    // Nearby hospitals (Hyderabad mock data)
    const hospitals = location === 'Hyderabad' ? [
      { name: 'Apollo Hospital', contact: '040-23607777', distance: '5km' },
      { name: 'Yashoda Hospital', contact: '040-45675555', distance: '3km' }
    ] : [];

    res.json({ diagnosis, hospitals });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
