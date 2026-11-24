const express = require('express');
const router = express.Router();
const {
  searchCoins,
  getCoinMarketChart,
  triggerManualSnapshot,
} = require('../controllers/marketController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/search', searchCoins);
router.get('/chart/:coinId', getCoinMarketChart);
router.post('/trigger-snapshot', triggerManualSnapshot);

module.exports = router;