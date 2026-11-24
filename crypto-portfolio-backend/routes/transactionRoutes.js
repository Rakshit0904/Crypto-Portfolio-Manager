const express = require('express');
const router = express.Router();
const {
  addTransaction,
  getPortfolioTransactions,
  updateTransaction,
  deleteTransaction,
} = require('../controllers/transactionController');
const { protect } = require('../middleware/authMiddleware');

// Protect all transaction routes
router.use(protect);

router.post('/', addTransaction);
router.get('/portfolio/:portfolioId', getPortfolioTransactions);
router.route('/:id').put(updateTransaction).delete(deleteTransaction);

module.exports = router;