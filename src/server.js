require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const extractRoute = require('./routes/extract');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

const allowedOrigins =
  process.env.ALLOWED_ORIGINS && process.env.ALLOWED_ORIGINS !== '*'
    ? process.env.ALLOWED_ORIGINS.split(',')
    : true; // true = reflect any origin (fine for a mobile app with no browser CORS concerns)

app.use(cors({ origin: allowedOrigins }));

// Rate limit per IP to avoid hammering upstream platforms (which would get the
// server's own IP blocked) and to prevent abuse of your backend.
const extractLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // 20 requests per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many requests. Please wait a moment and try again.',
  },
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api', extractLimiter, extractRoute);

app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Not found.' });
});

app.listen(PORT, () => {
  console.log(`Govid backend listening on port ${PORT}`);
});
