const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const timetracker = require('./middleware/timetracker');

// Charger les variables d'environnement depuis le fichier .env
require('dotenv').config({ path: path.join(__dirname, '.env') });

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

// Middleware de tracking des performances
app.use(timetracker);

// Routes API
app.use('/api/health', require('./routes/health'));
app.use('/api/rmm', require('./routes/rmm'));
app.use('/api/rmm/v2', require('./routes/rmm-v2'));
app.use('/api/balances', require('./routes/balances'));

// Route racine
app.get('/', (req, res) => {
  res.json({
    name: 'RMM Gain API',
    version: '1.0.0',
    description: 'API pour analyser les données du protocole RMM',
    endpoints: {
      health: '/api/health',
      rmm: '/api/rmm/v3/:address1/:address2?/:address3?',
      'rmm-v2': '/api/rmm/v2/:address',
      balances: '/api/balances/v3/:address'
    },
    example: 'GET /api/rmm/v3/0x3f3994bb23c48204ddeb99aa6bf6dd275abf7a3f'
  });
});

// Gestion des erreurs 404
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint non trouvé',
    message: `L'endpoint ${req.originalUrl} n'existe pas`,
    availableEndpoints: [
      'GET /',
      'GET /api/health',
      'GET /api/rmm/v3/:address1/:address2?/:address3?',
      'GET /api/rmm/v2/:address',
      'GET /api/rmm/v2/:address/:type',
      'GET /api/balances/v3/:address',
      'POST /api/balances/v3/batch'
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
  console.log(`🔍 Test: curl http://localhost:${PORT}/api/rmm/v3/0x3f3994bb23c48204ddeb99aa6bf6dd275abf7a3f`);
});

module.exports = app; 