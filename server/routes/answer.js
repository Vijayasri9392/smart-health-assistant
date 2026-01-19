const express = require('express');
const router  = express.Router();
const csv     = require('csv-parser');
const fs      = require('fs');
const path    = require('path');
const HealthAnswer = require('../models/HealthAnswer');

let DATA = [];
const csvPath = path.resolve(__dirname, '../data/diseases.csv');

// load once at startup
fs.createReadStream(csvPath)
  .pipe(csv())
  .on('data', row => DATA.push(row))
  .on('end', () => console.log('Dataset loaded:', DATA.length, 'rows'));

router.post('/', async (req, res) => {
  const { query, userId } = req.body;
  const txt = query.toLowerCase().trim();
  if (!txt) return res.json({ error: 'Empty query' });

  // broader fuzzy match
  const match = DATA.find(d => d.symptom.toLowerCase().includes(txt) || txt.includes(d.symptom.toLowerCase()));
  if (!match) return res.json({ error: 'No matching record found. Try shorter keywords like "fever", "headache", "chest pain"' });

  await HealthAnswer.create({ userId, ...match });
  res.json(match);
});

module.exports = router;