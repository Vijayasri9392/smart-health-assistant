const express = require('express');
const router = express.Router();
router.post('/', (req, res) => {
  // extract userId from JWT (later add auth middleware)
  res.json({ message: 'Report saved (stub)' });
});
module.exports = router;