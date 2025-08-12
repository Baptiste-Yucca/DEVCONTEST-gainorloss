const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

console.log('🔍 Test du chargement des variables d\'environnement...\n');

// Variables importantes à vérifier
const importantVars = [
  'PORT',
  'NODE_ENV',
  'THEGRAPH_API_KEY',
  'GNOSISSCAN_API_KEY',
  'CORS_ORIGIN'
];

console.log('📋 Variables d\'environnement chargées :');
console.log('=====================================');

importantVars.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    // Masquer les clés API pour la sécurité
    if (varName.includes('API_KEY')) {
      console.log(`✅ ${varName}: ${value.substring(0, 10)}...${value.substring(value.length - 4)}`);
    } else {
      console.log(`✅ ${varName}: ${value}`);
    }
  } else {
    console.log(`❌ ${varName}: NON DÉFINIE`);
  }
});

console.log('\n🔧 Configuration du serveur :');
console.log('============================');
console.log(`Port: ${process.env.PORT || 3001}`);
console.log(`Mode: ${process.env.NODE_ENV || 'development'}`);
console.log(`CORS Origin: ${process.env.CORS_ORIGIN || 'http://localhost:3000'}`);

// Vérifier si le fichier .env existe
const fs = require('fs');
const envPath = path.join(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  console.log('\n✅ Fichier .env trouvé');
  const stats = fs.statSync(envPath);
  console.log(`📁 Taille: ${stats.size} bytes`);
  console.log(`📅 Modifié: ${stats.mtime}`);
} else {
  console.log('\n❌ Fichier .env NON TROUVÉ');
  console.log(`🔍 Chemin recherché: ${envPath}`);
}

console.log('\n🎯 Test terminé !'); 