import * as dotenv from 'dotenv';
import { fetchAddressData } from '../utils/services/address';

// Charger les variables d'environnement depuis .env.local
dotenv.config({ path: '.env.local' });

const testAddress = async () => {
  try {
    const address = '0x3f3994bb23c48204ddeb99aa6bf6dd275abf7a3f';
    console.log('Test de fetchAddressData pour l\'adresse:', address);
    await fetchAddressData(address);
  } catch (error) {
    console.error('❌ Erreur lors du test:', error);
  }
};

testAddress(); 