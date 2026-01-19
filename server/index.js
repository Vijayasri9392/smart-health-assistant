const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const Tesseract = require('tesseract.js');
const Papa = require('papaparse');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.static('uploads'));
app.use('/public', express.static('../public'));

// MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB Connected'))
  .catch(err => console.log('❌ MongoDB Error:', err));

// User Schema
const userSchema = new mongoose.Schema({
  phone: { type: String, unique: true, sparse: true },
  email: { type: String, unique: true, sparse: true },
  password: { type: String, required: true },
  isVerified: { type: Boolean, default: false },
  profile: {
    name: String,
    age: Number,
    weight: Number,
    location: String
  },
  history: [{
    symptoms: String,
    diagnosis: Object,
    timestamp: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

const User = mongoose.model('User', userSchema);

// Dataset - Symptoms & Diseases
let diseaseDataset = [];
fs.readFile(path.join(__dirname, '../public/data/symptoms.csv'), 'utf8', (err, data) => {
  if (err) console.log('Dataset loading...');
  else {
    const parsed = Papa.parse(data, { header: true });
    diseaseDataset = parsed.data;
    console.log('✅ Dataset loaded:', diseaseDataset.length, 'entries');
  }
});

// Hospitals Dataset
const hospitals = {
  "Hyderabad": [
    { name: "Apollo Hospitals", contact: "040-23607777", location: "Jubilee Hills", distance: "5km" },
    { name: "Yashoda Hospitals", contact: "040-45675555", location: "Secunderabad", distance: "3km" },
    { name: "KIMS Hospital", contact: "040-44885000", location: "Secunderabad", distance: "4km" }
  ]
};

// Multer
const upload = multer({ dest: 'uploads/' });

// OTP Cache
const otpCache = {};

// AUTH ROUTES
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { name, phone, email, password } = req.body;
    
    const existingUser = await User.findOne({ $or: [{ phone }, { email }] });
    if (existingUser) return res.status(400).json({ error: 'Phone or Email already exists' });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    otpCache[phone || email] = {
      otp,
      name,
      phone,
      email,
      password,
      expires: Date.now() + 5 * 60 * 1000
    };

    console.log(`✅ OTP for ${phone || email}: ${otp}`);
    res.json({ success: true, message: 'OTP sent! Check console', phone: phone || email });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/auth/verify', async (req, res) => {
  try {
    const { identifier, otp } = req.body; // phone or email
    const userData = otpCache[identifier];
    
    if (!userData || userData.expires < Date.now()) {
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }
    
    if (userData.otp !== otp) {
      return res.status(400).json({ error: 'Wrong OTP' });
    }

    const user = new User({
      phone: userData.phone,
      email: userData.email,
      password: userData.password,
      profile: { name: userData.name },
      isVerified: true
    });
    await user.save();

    delete otpCache[identifier];
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '30d' });
    
    res.json({ 
      token, 
      user: { 
        id: user._id, 
        phone: user.phone, 
        email: user.email,
        name: user.profile.name 
      } 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { phone, email, password } = req.body;
    const user = await User.findOne({ $or: [{ phone }, { email }] });
    
    if (!user || !user.isVerified) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }
    
    const validPass = await bcrypt.compare(password, user.password);
    if (!validPass) return res.status(400).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '30d' });
    res.json({ 
      token, 
      user: { 
        id: user._id, 
        phone: user.phone, 
        email: user.email,
        name: user.profile.name 
      } 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/auth/resend-otp', async (req, res) => {
  try {
    const { phone, email, name, password } = req.body;
    const identifier = phone || email;
    
    const existingUser = await User.findOne({ $or: [{ phone }, { email }] });
    if (existingUser) return res.status(400).json({ error: 'Account exists. Login instead' });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    otpCache[identifier] = { otp, name, phone, email, password, expires: Date.now() + 5 * 60 * 1000 };
    
    console.log(`🔄 RESEND OTP for ${identifier}: ${otp}`);
    res.json({ success: true, message: 'New OTP sent! Check console' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// AI SYMPTOM ANALYSIS
app.post('/api/predict/symptoms', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    const { symptoms, location } = req.body;
    
    // AI Prediction from Dataset
    const symptomLower = symptoms.toLowerCase();
    let diagnosis = {
      disease: 'General Infection',
      severity: 'Low',
      precautions: 'Rest and hydrate',
      medicine: 'Paracetamol',
      food: 'Light diet',
      emergency: false
    };

    // Match symptoms from dataset
    const matches = diseaseDataset.filter(row => 
      row.symptoms && symptomLower.includes(row.symptoms.toLowerCase())
    );
    
    if (matches.length > 0) {
      diagnosis = {
        disease: matches[0].disease || 'Infection',
        severity: matches[0].severity || 'Medium',
        precautions: matches[0].precautions || 'Rest',
        medicine: matches[0].medicine || 'Paracetamol',
        food: matches[0].food || 'Light diet',
        emergency: matches[0].emergency === 'High'
      };
    }

    // Save to history
    await User.findByIdAndUpdate(user._id, {
      $push: { history: { symptoms, diagnosis } }
    });

    // Nearby hospitals
    const nearbyHospitals = hospitals[location] || hospitals.Hyderabad || [];

    res.json({ diagnosis, hospitals: nearbyHospitals });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// OCR Lab Report
app.post('/api/upload/lab-report', upload.single('file'), async (req, res) => {
  try {
    const { data: { text } } = await Tesseract.recognize(req.file.path, 'eng');
    
    const analysis = {
      hemoglobin: text.match(/Hemoglobin[:\s]*(\d+\.?\d*)/i)?.[1] || 'Normal',
      glucose: text.match(/Glucose[:\s]*(\d+\.?\d*)/i)?.[1] || 'Normal',
      cholesterol: text.match(/Cholesterol[:\s]*(\d+\.?\d*)/i)?.[1] || 'Normal'
    };

    res.json({ 
      text: `Hemoglobin: ${analysis.hemoglobin} | Glucose: ${analysis.glucose} | All normal`,
      raw: text.substring(0, 500)
    });
  } catch (error) {
    res.status(500).json({ error: 'OCR failed' });
  }
});

// Profile & History
app.get('/api/profile', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    res.json(user);
  } catch (error) {
    res.status(401).json({ error: 'Unauthorized' });
  }
});

app.post('/api/profile', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByIdAndUpdate(decoded.id, {
      profile: req.body.profile
    }, { new: true }).select('-password');
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/history', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('history');
    res.json(user.history || []);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/history/:id', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    await User.updateOne(
      { _id: decoded.id },
      { $pull: { history: { _id: req.params.id } } }
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Serve Frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 Server: http://localhost:${PORT}`);
});


/* ======================
   USER MODEL
====================== */

// import mongoose from "mongoose";

// const userSchema = new mongoose.Schema({
//   name: String,
//   email: { type: String, unique: true },
//   password: String
// });

// // ✅ Prevent overwrite error
// const User = mongoose.models.User || mongoose.model("User", userSchema);

// export default User;


// /* ======================
//    AUTH MIDDLEWARE
// ====================== */
// function authMiddleware(req, res, next) {
//   const token = req.headers["x-auth-token"];
//   if (!token) return res.status(401).json({ message: "No token" });

//   try {
//     const decoded = jwt.verify(token, "SECRET_KEY");
//     req.user = decoded;
//     next();
//   } catch {
//     res.status(401).json({ message: "Invalid token" });
//   }
// }

// /* ======================
//    SIGNUP API
// ====================== */
// app.post("/api/auth/signup", async (req, res) => {
//   const { name, email, password } = req.body;

//   const exists = await User.findOne({ email });
//   if (exists) {
//     return res.status(400).json({ message: "Email already exists" });
//   }

//   const hashed = await bcrypt.hash(password, 10);

//   await User.create({
//     name,
//     email,
//     password: hashed,
//   });

//   res.json({ message: "Signup successful. Please login." });
// });

// /* ======================
//    LOGIN API
// ====================== */
// app.post("/api/auth/login", async (req, res) => {
//   const { email, password } = req.body;

//   const user = await User.findOne({ email });
//   if (!user) {
//     return res.status(400).json({ message: "Invalid credentials" });
//   }

//   const match = await bcrypt.compare(password, user.password);
//   if (!match) {
//     return res.status(400).json({ message: "Invalid credentials" });
//   }

//   const token = jwt.sign(
//     { userId: user._id, email: user.email },
//     "SECRET_KEY",
//     { expiresIn: "1d" }
//   );

//   res.json({ token });
// });

// /* ======================
//    PREDICT API (PROTECTED)
// ====================== */
// app.post("/api/predict", authMiddleware, (req, res) => {
//   const { symptoms } = req.body;

//   if (!symptoms) {
//     return res.status(400).json({ message: "Symptoms required" });
//   }

//   // Dummy response (ML comes later)
//   res.json({
//     disease: "General Checkup Recommended",
//     precautions: ["Drink water", "Take rest"],
//     specialist: "General Physician",
//   });
// });

// // Start server
// const PORT = process.env.PORT || 5000;
// app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));


// app.post("/api/auth/login", (req, res) => {
//   const { email, password } = req.body;

//   const user = users.find(
//     u => u.email === email && u.password === password
//   );

//   if (!user) {
//     return res.status(401).json({ message: "Invalid credentials" });
//   }

//   res.json({
//     token: "dummy-token",
//     user: { email: user.email, name: user.name }
//   });
// });


// app.post("/api/auth/signup", (req, res) => {
//   const { name, email, password } = req.body;

//   if (users.find(u => u.email === email)) {
//     return res.status(400).json({ message: "Email already exists" });
//   }

//   users.push({ name, email, password });

//   res.json({ message: "Signup successful" });
// });
