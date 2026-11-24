const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const { startCronJobs } = require('./jobs/cronJobs');

const authRoutes = require('./routes/authRoutes');
const portfolioRoutes = require('./routes/portfolioRoutes');
const transactionRoutes = require('./routes/transactionRoutes');
const marketRoutes = require('./routes/marketRoutes');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Mount API Routes
app.use('/api/auth', authRoutes);
app.use('/api/portfolios', portfolioRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/market', marketRoutes);

app.get('/', (req, res) => {
  res.send('Crypto Portfolio Tracker API is running...');
});

const PORT = process.env.PORT || 5000;

// Connect to DB first, then start server and background cron jobs
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    startCronJobs();
  });
});