// const mongoose = require('mongoose');
// const userSchema = new mongoose.Schema({
//   email: { type: String, unique: true },
//   password: String,
// });
// module.exports = mongoose.model('User', userSchema);

const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: String,
  name: String,

  // ✅ ADD THESE
  phone: { type: String, default: "" },
  age: { type: Number, default: null },
  weight: { type: Number, default: null },

  history: [{
    symptoms: String,
    disease: String,
    details: String,
    severity: { type: String, default: "low" },     // ✅ add
    isCritical: { type: Boolean, default: false },  // ✅ add
    timestamp: { type: Date, default: Date.now }
  }]
});

module.exports = mongoose.model('User', userSchema);
