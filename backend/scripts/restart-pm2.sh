#!/bin/bash

# Script pour redémarrer PM2 avec les bonnes variables d'environnement
# Usage: ./scripts/restart-pm2.sh

echo "🔄 Redémarrage de PM2 avec les variables d'environnement..."

# Vérifier que le fichier .env existe
if [ ! -f ".env" ]; then
    echo "❌ Fichier .env non trouvé dans le répertoire backend"
    echo "📁 Répertoire actuel: $(pwd)"
    echo "🔍 Fichiers présents:"
    ls -la | grep env
    exit 1
fi

echo "✅ Fichier .env trouvé"

# Tester le chargement des variables d'environnement
echo "🔍 Test du chargement des variables d'environnement..."
node scripts/test-env.js

if [ $? -ne 0 ]; then
    echo "❌ Erreur lors du test des variables d'environnement"
    exit 1
fi

echo "✅ Variables d'environnement chargées correctement"

# Arrêter PM2
echo "🛑 Arrêt de PM2..."
pm2 stop rmmgain-backend 2>/dev/null || echo "⚠️ Aucun processus PM2 à arrêter"

# Redémarrer PM2 avec les variables d'environnement
echo "🚀 Démarrage de PM2 avec les variables d'environnement..."

# Créer un fichier ecosystem temporaire
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'rmmgain-backend',
    script: 'server.js',
    cwd: '$(pwd)',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    env_file: '.env',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    log_file: './logs/combined.log',
    out_file: './logs/out.log',
    error_file: './logs/error.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
  }]
}
EOF

# Créer le dossier logs s'il n'existe pas
mkdir -p logs

# Démarrer PM2
pm2 start ecosystem.config.js

# Vérifier le statut
echo "📊 Statut PM2:"
pm2 list

# Nettoyer le fichier temporaire
rm ecosystem.config.js

echo "✅ PM2 redémarré avec succès !"
echo "📝 Logs disponibles dans le dossier logs/"
echo "🔍 Pour voir les logs: pm2 logs rmmgain-backend" 