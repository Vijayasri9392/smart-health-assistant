// server/models/Prediction.js
import mongoose from "mongoose";

const predictionSubSchema = new mongoose.Schema({
  disease: { type: String, required: true },
  confidence: { type: Number, default: 0 }, // 0-1 range, optional
  precautions: [{ type: String }],
  doctorAdvice: { type: String, default: "" }
}, { _id: false });

const predictionSchema = new mongoose.Schema({
  symptoms: { type: String, required: true },
  // new: array of structured prediction objects
  predictions: { type: [predictionSubSchema], default: [] }
}, { timestamps: true });

export default mongoose.model("Prediction", predictionSchema);

