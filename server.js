import dotenv from 'dotenv';
dotenv.config();
import express from "express";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import nodemailer from "nodemailer";
import multer from "multer";
import ExcelJS from "exceljs";
import cors from "cors";
import jwt from "jsonwebtoken";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

// Fix __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static('public'));
app.use('/datasets', express.static(path.join(__dirname, '../datasets')));

app.use('/uploads', express.static('uploads'));

// MongoDB Atlas Connection (YOUR .env)
console.log("DEBUG MONGO_URI:", process.env.MONGO_URI);

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Atlas Connected"))
  .catch(err => {
      console.error("❌ MongoDB Connection Failed:", err.message);
      process.exit(1);
  });


// User Schema
const userSchema = new mongoose.Schema({
    email: { type: String, unique: true, required: true },
    password: { type: String, required: true },
    verified: { type: Boolean, default: false },
    profile: { name: String, age: Number, weight: Number, phone: String },
    history: [{ symptom: String, disease: String, date: { type: Date, default: Date.now } }]
});
const User = mongoose.model('User', userSchema);

const verificationSchema = new mongoose.Schema({
    email: String, code: String, expires: Date
});
const Verification = mongoose.model('Verification', verificationSchema);

// Global data storage
let diseaseModel = {};
let diseaseInfo = {};
let medicines = {};

// SAFE Dataset Loader
async function loadModel() {
    try {
        console.log('🔄 Loading datasets...');
        fs.mkdirSync('datasets', { recursive: true });
        
        // Sample data if no datasets
        if (!fs.existsSync('datasets/medicines.xlsx')) {
            const workbook = new ExcelJS.Workbook();
            const sheet = workbook.addWorksheet('Medicines');
            sheet.addRow(['Disease', 'Medicine', 'Dosage']);
            sheet.addRow(['Fever', 'Paracetamol', '500mg twice daily']);
            sheet.addRow(['Common Cold', 'Cetirizine', '10mg once daily']);
            sheet.addRow(['Diabetes', 'Metformin', '500mg twice daily']);
            await workbook.xlsx.writeFile('datasets/medicines.xlsx');
        }

        // Load medicines
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile('datasets/medicines.xlsx');
        const worksheet = workbook.worksheets[0];
        worksheet.eachRow((row, rowNumber) => {
            if (rowNumber === 1) return;
            const disease = row.getCell(1).value;
            const medicine = row.getCell(2).value;
            const dosage = row.getCell(3).value;
            if (disease && medicine) {
                if (!medicines[disease]) medicines[disease] = [];
                medicines[disease].push(`${medicine} (${dosage})`);
            }
        });

        // Sample symptom mapping
        diseaseModel['fever'] = 'Fever';
        diseaseModel['cough'] = 'Common Cold';
        diseaseModel['headache'] = 'Fever';
        diseaseModel['fatigue'] = 'Diabetes';

        diseaseInfo['Fever'] = {
            description: 'High body temperature',
            precaution: 'Rest, drink water, avoid exertion',
            severity: 'medium'
        };
        diseaseInfo['Common Cold'] = {
            description: 'Viral respiratory infection',
            precaution: 'Steam inhalation, warm fluids',
            severity: 'low'
        };
        diseaseInfo['Diabetes'] = {
            description: 'High blood sugar levels',
            precaution: 'Monitor sugar, balanced diet',
            severity: 'high'
        };

        console.log('✅ Datasets loaded successfully!');
        console.log('📊 Sample diseases ready');
    } catch (err) {
        console.log('⚠️ Using sample data (no datasets needed)');
    }
}
loadModel();

// Email Setup (UPDATE THESE TWO LINES)
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'yenugulavijayasri@gmail.com',        // ← YOUR EMAIL
        pass: 'VijayasriY@2'      // ← YOUR APP PASSWORD
    }
});

// File Upload
const storage = multer.diskStorage({
    destination: 'uploads/',
    filename: (_req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

// Auth Middleware
const authenticateToken = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) return res.status(401).json({ success: false, msg: 'No token' });
    jwt.verify(token, process.env.JWT_SECRET || 'supersecretkey123', (err, user) => {
        if (err) return res.status(403).json({ success: false, msg: 'Invalid token' });
        req.user = user;
        next();
    });
};

// API Routes
app.post('/api/signup', async (req, res) => {
    try {
        const { email, password, name } = req.body;
        const existingUser = await User.findOne({ email });
        if (existingUser) return res.json({ success: false, msg: 'Email already exists' });

        const code = Math.floor(100000 + Math.random() * 900000).toString();
        await Verification.create({ email, code, expires: new Date(Date.now() + 300000) });

        // Email sending (works even if Gmail not configured)
        try {
            await transporter.sendMail({
                to: email,
                subject: 'Smart Health Assistant - Verify Email',
                html: `<h2>Your verification code: <b>${code}</b></h2><p>Valid for 5 minutes.</p>`
            });
        } catch (emailErr) {
            console.log('Email service not configured - code:', code);
        }

        res.json({ success: true, msg: `Verification code: ${code} (check email or console)` });
    } catch (err) {
        res.json({ success: false, msg: err.message });
    }
});

app.post('/api/verify', async (req, res) => {
    try {
        const { email, code, password } = req.body;
        const verification = await Verification.findOne({ email, code, expires: { $gt: new Date() } });
        if (!verification) return res.json({ success: false, msg: 'Invalid/expired code' });

        const hashedPw = await bcrypt.hash(password, 10);
        await User.create({ email, password: hashedPw, verified: true, profile: { name } });
        await Verification.deleteOne({ email });
        res.json({ success: true, msg: 'Account created successfully!' });
    } catch (err) {
        res.json({ success: false, msg: err.message });
    }
});

app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email, verified: true });
        if (!user || !await bcrypt.compare(password, user.password)) {
            return res.json({ success: false, msg: 'Invalid credentials' });
        }
        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'supersecretkey123');
        res.json({ 
            success: true, 
            token, 
            user: { email: user.email, profile: user.profile } 
        });
    } catch (err) {
        res.json({ success: false, msg: err.message });
    }
});

app.post('/api/predict', authenticateToken, async (req, res) => {
    try {
        const { symptoms } = req.body;
        let predictedDisease = 'Unknown';

        // Match symptoms
        for (let symptom of symptoms.toLowerCase().split(',')) {
            symptom = symptom.trim();
            if (diseaseModel[symptom]) {
                predictedDisease = diseaseModel[symptom];
                break;
            }
        }

        const info = diseaseInfo[predictedDisease] || {};
        const meds = medicines[predictedDisease] || [];

        // Save to history
        await User.findByIdAndUpdate(req.user.id, {
            $push: { history: { symptom: symptoms, disease: predictedDisease } }
        });

        res.json({
            disease: predictedDisease,
            description: info.description || '',
            precautions: info.precaution || 'Consult a doctor',
            severity: info.severity || 'low',
            medicines: meds,
            message: `Predicted disease: ${predictedDisease}`
        });
    } catch (err) {
        res.json({ error: err.message });
    }
});

app.get('/api/profile', authenticateToken, async (req, res) => {
    const user = await User.findById(req.user.id).select('profile history');
    res.json(user || { profile: {}, history: [] });
});

app.get('/api/history', authenticateToken, async (req, res) => {
    const user = await User.findById(req.user.id).select('history');
    res.json(user?.history || []);
});

app.post('/api/upload-report', authenticateToken, upload.single('report'), (req, res) => {
    res.json({ success: true, message: 'File uploaded!', filename: req.file.filename });
});

// Serve frontend files
app.get('/', (_req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/dashboard.html', (_req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// Start Server
app.listen(PORT, () => {
    console.log(`✅ Server running on http://localhost:${PORT}`);
    console.log(`📱 Open: http://localhost:${PORT}`);
});

