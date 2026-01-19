const mongoose = require('mongoose');
const HealthAnswerSchema = new mongoose.Schema({
  userId: String,
  query: String,
  disease: String,
  chance: Number,
  precaution: String,
  food: String,
  doctor: String,
  timestamp: { type: Date, default: Date.now }
});
module.exports = mongoose.model('HealthAnswer', HealthAnswerSchema);