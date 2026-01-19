// import express from 'express';
// import bcrypt from 'bcryptjs';
// import jwt from 'jsonwebtoken';
// import { body, validationResult } from 'express-validator';
// import User from '../models/User.js';
// const router = express.Router();
// const JWT_SECRET = process.env.JWT_SECRET || 'topsecret';


// /* ===================== SIGNUP ===================== */
// router.post('/signup', async (req, res) => {
//   try {
//     const { name, email, password } = req.body;

//     const existing = await User.findOne({ email });
//     if (existing) {
//       return res.status(400).json({ msg: 'User already exists' });
//     }

//     const hashed = await bcrypt.hash(password, 10);
//     const user = new User({ name, email, password: hashed });
//     await user.save();

//     res.json({ msg: 'Account created successfully. Please login.' });
//   } catch (err) {
//     res.status(500).json({ msg: 'Server error' });
//   }
// });

// /* ===================== LOGIN ===================== */
// router.post('/login', async (req, res) => {
//   try {
//     const { email, password } = req.body;

//     const user = await User.findOne({ email });
//     if (!user) {
//       return res.status(400).json({ msg: 'Invalid credentials' });
//     }

//     const isMatch = await bcrypt.compare(password, user.password);
//     if (!isMatch) {
//       return res.status(400).json({ msg: 'Invalid credentials' });
//     }

//     const token = jwt.sign({ id: user._id }, JWT_SECRET, {
//       expiresIn: '7d'
//     });

//     res.json({
//       token,
//       user: {
//         id: user._id,
//         name: user.name,
//         email: user.email
//       }
//     });
//   } catch (err) {
//     res.status(500).json({ msg: 'Server error' });
//   }
// });

// export default router;


const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const User = require('../models/User');
const router = express.Router();

// Add at top after imports
let users = new Map(); // Fallback if MongoDB fails

// Email transporter (configure your credentials)
// Skip email setup for now - use dummy OTP
// const transporter = nodemailer.createTransport({
//   service: 'gmail',
//   auth: {
//     user: 'yenugulavijayasri@gmail.com',
//     pass: 'VijayasriY@2'
//   }
// });

let verificationCodes = new Map();

// Generate OTP
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Signup
router.post('/signup', async (req, res) => {
  try {
    const { email, password, phone, name } = req.body;
    
    // In signup route, after User.findOne:
    let existingUser;
    try {
      existingUser = await User.findOne({ email });
    } catch {
      existingUser = users.has(email) ? { email } : null;
    }
    
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Send verification code
    const code = generateOTP();
    verificationCodes.set(email, { code, expires: Date.now() + 300000,
      phone: phone || '',
      name: name || 'User',
      password
     }); // 5 min expiry

     console.log(`✅ OTP ${code} generated for ${email} (Check signup.html for code)`);
    res.json({ message: 'Verification code generated! Check console or use 123456 for testing' });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: error.message });
  }
});


//     // Send email
//     await transporter.sendMail({
//       from: 'yenugulavijayasri@gmail.com',
//       to: email,
//       subject: 'Smart Health Assistant - Verification Code',
//      html: `
//         <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
//           <h2 style="color: #10b981;">Welcome to Smart Health Assistant! 🩺</h2>
//           <p>Your verification code is:</p>
//           <div style="background: #10b981; color: white; font-size: 32px; font-weight: bold; padding: 20px; text-align: center; border-radius: 10px; letter-spacing: 5px;">
//             ${code}
//           </div>
//           <p style="margin-top: 20px;">This code expires in 5 minutes.</p>
//           <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
//           <p style="color: #666; font-size: 12px;">This is an automated message. Please do not reply.</p>
//         </div>
//       `
//     });

//     console.log(`OTP ${code} sent to ${email}`);
//     res.json({ message: 'Verification code sent to email' });
//   } catch (error) {
//     console.error('Email error:', error);
//     res.status(500).json({ error: 'Failed to send verification code. Check email configuration.' });
//   }
// });

// Verify OTP
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, code } = req.body;
    
    const stored = verificationCodes.get(email);
    if (!stored || stored.code !== code || stored.expires < Date.now()) {
      return res.status(400).json({ error: 'Invalid or expired code' });
    }

    // Create user
    const hashedPassword = await bcrypt.hash(stored.password, 10);
    const user = new User({ email, 
      password: hashedPassword, 
      phone: stored.phone,
      name: stored.name 
    });
    await user.save();

    // Delete verification code
    verificationCodes.delete(email);

    // Generate JWT
    const token = jwt.sign({ userId: user._id }, 'supersecretkey123', { expiresIn: '7d' });

    res.json({ token, user: { id: user._id, email, name: user.name } });
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    
    if (!user || !await bcrypt.compare(password, user.password)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ userId: user._id }, 'supersecretkey123', { expiresIn: '7d' });
    res.json({ token, user: { id: user._id, email: user.email, name: user.name } });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

