const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const Papa = require('papaparse');
//import fs from "fs";
//const nodemailer = require('nodemailer');
//const path = require('path');

const authRoutes = require('./routes/auth');
const healthRoutes = require('./routes/health');

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));

// MongoDB Connection
mongoose.connect('mongodb+srv://Admin:WAhWZb0971Ud0UtQ@s-h-a.c2hqndg.mongodb.net/?appName=S-H-A')
    .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('⚠️ MongoDB error (app still works):', err.message));       

// Load datasets
// let datasets = {};
// console.log('📊 Loading datasets...');
// const datasetFiles = [
//   'symptoms-diseases.csv',
//   'precautions.csv',
//   'suggestions.csv',
//   'medicines.csv',
//   'food-advice.csv',
//   'doctors-hospitals.csv'
// ];

// datasetFiles.forEach(file => {
//    const filePath = path.join(__dirname, '../public/datasets/', file);
//   if (fs.existsSync(filePath)) {
//     console.log(`✅ Loaded: ${file}`);
//   }
// });

// Email transporter
// const transporter = nodemailer.createTransport({
//   service: 'gmail',
//   auth: {
//     user: 'yenugulavijayasri@gmail.com', // Replace with your email
//     pass: 'VijayasriY@2'     // Replace with your app password
//   }
// });


// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/health', healthRoutes);


// ✅ PERFECT ROUTING - Serve ALL HTML files correctly
app.get('/', (_req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.get('/dashboard', (_req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// app.get('/index', (_req, res) => {
//   res.sendFile(path.join(__dirname, '../public/index.html'));
// });

// Serve correct pages
app.get('/login', (_req, res) => {
  res.sendFile(path.join(__dirname, '../public/login.html'));
});

app.get('/signup', (_req, res) => {
  res.sendFile(path.join(__dirname, '../public/signup.html'));
});

app.get('/profile', (_req, res) => {
  res.sendFile(path.join(__dirname, '../public/profile.html'));
});

app.get('/history', (_req, res) => {
  res.sendFile(path.join(__dirname, '../public/history.html'));
});

// Legacy support
app.get('/login.html', (_req, res) => res.redirect('/login'));
app.get('/signup.html', (_req, res) => res.redirect('/signup'));
app.get('/index.html', (_req, res) => res.redirect('/dashboard'));
app.get('/profile.html', (_req, res) => res.redirect('/profile'));
app.get('/history.html', (_req, res) => res.redirect('/history'));
app.get('/dashboard.html', (_req, res) => res.redirect('/dashboard'));

// 404
app.use((_req, res) => {
  res.redirect('/login');
});

// // Dashboard (root) - require login
// app.get('/', (_req, res) => {
//   res.sendFile(path.join(__dirname, '../public/index.html'));
// });

// Catch all other routes
// app.get('*', (_req, res) => {
//   res.redirect('/login.html');
// });

const PORT = 3000;
app.listen(PORT, () => {
  console.log('\n🚀 Server ready!');
  console.log(`📱 Login: http://localhost:${PORT}/login`);
  console.log(`📱 Dashboard: http://localhost:${PORT}/dashboard\n`);
});
