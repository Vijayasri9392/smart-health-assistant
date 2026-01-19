const express = require('express');
const twilio = require('twilio');
const router = express.Router();

const client = twilio(process.env.TW_SID, process.env.TW_TOKEN);

router.post('/', async (req, res) => {
  const { lat, lng, hr, bp } = req.body;
  const msg = `🆘 SOS from Smart Health Assistant\nLocation: https://maps.google.com/?q=${lat},${lng}\nHR:${hr}  BP:${bp}`;
  await client.messages.create({
    body: msg,
    from: process.env.TW_PHONE,
    to: process.env.EMERGENCY_CONTACT
  });
  res.json({ ok: true });
});
module.exports = router;