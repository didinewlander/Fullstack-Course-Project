const express = require('express');
const cors = require('cors');
const path = require('path');
const productsRoutes = require('./routes/productsRoutes');
const inventoryRoutes = require('./routes/inventoryRoutes');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

app.get('/api/v1/health', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.use('/api/v1/products', productsRoutes);
app.use('/api/v1/inventory', inventoryRoutes);

app.use((req, res) => {
  res.status(404).json({ message: `Route not found: ${req.originalUrl}` });
});

app.use((error, _req, res, _next) => {
  const statusCode = error.statusCode || 500;
  res.status(statusCode).json({
    message: error.message || 'Server error',
  });
});

module.exports = app;
