const express = require('express');
const cron = require('node-cron');
const nodemailer = require('nodemailer');
const router = express.Router();

// Demo transport (replace with real SMTP later)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: process.env.MAIL_USER, pass: process.env.MAIL_PASS }
});

// POST /api/reminder
router.post('/', (req, res) => {
  const { medicine, dosage, time, email } = req.body;
  const [h, m] = time.split(':');
  cron.schedule(`${m} ${h} * * *`, () => {
    transporter.sendMail({
      to: email,
      subject: 'Medicine Reminder',
      text: `Time to take ${dosage} of ${medicine}.`
    });
  });
  res.json({ message: 'Reminder scheduled' });
});
module.exports = router;