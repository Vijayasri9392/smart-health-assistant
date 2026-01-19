// const users = []; // temporary storage (later DB)


// const express = require("express");
// const app = express();
// const cors = require("cors");

// app.use(cors());
// app.use(express.json());


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

//   users.push({ name, email, password, verified: false });

//   res.json({ message: "Signup successful. Verify email." });
// });


// const express = require('express');
// const cors = require('cors');
// const mongoose = require('mongoose');
// const dotenv = require('dotenv');

// dotenv.config();

// const app = express();

// // Middleware
// app.use(cors({ origin: 'http://localhost:3000' }));
// app.use(express.json());
// app.use('/uploads', express.static('uploads'));

// // MongoDB
// mongoose.connect(process.env.MONGO_URI)
//   .then(() => console.log('✅ MongoDB connected'))
//   .catch(err => console.log('❌ MongoDB error:', err));

// // Routes
// app.use('/api/auth', require('./routes/auth'));
// app.use('/api/predict', require('./routes/predict'));
// app.use('/api/upload', require('./routes/upload'));

// module.exports = app;
