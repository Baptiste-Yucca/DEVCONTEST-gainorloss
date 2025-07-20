const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware de sécurité
app.use(helmet());

// Configuration CORS
const corsOptions = {
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Middleware pour parser le JSON
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Routes API
app.use('/api/rates', require('./routes/rates'));
app.use('/api/transactions', require('./routes/transactions'));
app.use('/api/balances', require('./routes/balances'));
app.use('/api/health', require('./routes/health'));

// Route racine
app.get('/', (req, res) => {
  res.json({
    name: 'RMM Gain API',
    version: '1.0.0',
    description: 'API pour analyser les données du protocole RMM',
    endpoints: {
      rates: '/api/rates',
      transactions: '/api/transactions',
      balances: '/api/balances',
      health: '/api/health'
    },
    documentation: '/api/docs'
  });
});

// Gestion des erreurs 404
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint non trouvé',
    message: `L'endpoint ${req.originalUrl} n'existe pas`,
    availableEndpoints: [
      'GET /',
      'POST /api/rates',
      'GET /api/transactions/:address',
      'GET /api/balances/:address',
      'GET /api/health'
    ]
  });
});

// Middleware de gestion d'erreurs global
app.use((err, req, res, next) => {
  console.error('Erreur serveur:', err);
  
  res.status(err.status || 500).json({
    error: 'Erreur interne du serveur',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Une erreur est survenue',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Démarrage du serveur
app.listen(PORT, () => {
  console.log(`🚀 Serveur RMM Gain API démarré sur le port ${PORT}`);
  console.log(`📊 Mode: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 URL: http://localhost:${PORT}`);
  console.log(`📚 Documentation: http://localhost:${PORT}/api/docs`);
});

module.exports = app; 