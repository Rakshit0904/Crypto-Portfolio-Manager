const express = require('express');
const router = express.Router();
const {
  createPortfolio,
  getPortfolios,
  getPortfolioById,
  updatePortfolio,
  deletePortfolio,
  getPortfolioDashboard,
  getPortfolioSnapshots,
} = require('../controllers/portfolioController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.route('/').post(createPortfolio).get(getPortfolios);

router
  .route('/:id')
  .get(getPortfolioById)
  .put(updatePortfolio)
  .delete(deletePortfolio);

router.get('/:id/dashboard', getPortfolioDashboard);
router.get('/:id/snapshots', getPortfolioSnapshots);

module.exports = router;