import type { NextApiRequest, NextApiResponse } from 'next';
import * as path from 'path';
import * as fs from 'fs';

// Utiliser dynamic import pour sqlite3 côté serveur
let sqlite3: any;
let db: any;

const initDatabase = async () => {
  if (!sqlite3) {
    sqlite3 = require('sqlite3').verbose();
  }
  
  if (!db) {
    const dbPath = path.join(process.cwd(), 'data', 'rates.db');
    
    // Vérifier que la base de données existe
    if (!fs.existsSync(dbPath)) {
      throw new Error(`Base de données non trouvée: ${dbPath}. Veuillez exécuter le script d'initialisation.`);
    }
    
    db = new sqlite3.Database(dbPath);
  }
  
  return db;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Méthode non autorisée' });
  }

  try {
    const { from } = req.query;

    if (!from) {
      return res.status(400).json({ message: 'Paramètre manquant: from requis' });
    }

    // Initialiser la base de données
    const database = await initDatabase();

    // Construire la requête SQL pour récupérer tous les taux depuis la date donnée
    const sql = `
      SELECT * FROM interest_rates 
      WHERE date >= ?
      ORDER BY date ASC
    `;
    const params: any[] = [from];

    console.log(`API /rates: Requête depuis ${from}`);

    // Exécuter la requête
    const rows = await new Promise<any[]>((resolve, reject) => {
      database.all(sql, params, (err: any, rows: any[]) => {
        if (err) {
          console.error('Erreur lors de la récupération des taux:', err);
          reject(err);
          return;
        }
        resolve(rows || []);
      });
    });

    console.log(`API /rates: ${rows.length} taux trouvés`);

    // Retourner les résultats
    res.status(200).json(rows);

  } catch (error) {
    console.error('Erreur dans l\'API /rates:', error);
    res.status(500).json({ 
      message: 'Erreur lors de la récupération des taux', 
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
} 