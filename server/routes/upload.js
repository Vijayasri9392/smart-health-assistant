// const express = require('express');
// const multer  = require('multer');
// const Tesseract = require('tesseract.js');
// const fs = require('fs');
// const router = express.Router();

// const upload = multer({ dest: 'uploads/' });

// // POST /api/upload
// router.post('/', upload.single('report'), async (req, res) => {
//   try {
//     const { data: { text } } = await Tesseract.recognize(req.file.path, 'eng');
//     fs.unlinkSync(req.file.path);        // delete temp file
//     res.json({ text: text.trim().substring(0, 1500) }); // first 1.5 KB
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// });
// module.exports = router;


const express = require('express');
const multer = require('multer');
const Tesseract = require('tesseract.js');
const auth = require('../middleware/auth');
const router = express.Router();

const upload = multer({ dest: 'uploads/' });

router.post('/lab-report', auth, upload.single('file'), async (req, res) => {
  try {
    const { data: { text } } = await Tesseract.recognize(req.file.path, 'eng');
    
    // Extract key values
    const results = {
      hemoglobin: text.match(/Hemoglobin[:\s]*(\d+\.?\d*)/)?.[1] || 'Not found',
      glucose: text.match(/Glucose[:\s]*(\d+\.?\d*)/)?.[1] || 'Not found'
    };

    res.json({ 
      text: results.hemoglobin !== 'Not found' ? `Hemoglobin: ${results.hemoglobin}g/dL (Normal: 12-16)` : 'Normal values detected',
      raw: text 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
