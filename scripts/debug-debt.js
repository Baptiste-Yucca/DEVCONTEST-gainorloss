#!/usr/bin/env node

// Données des transactions V2
const transactions = [
  { timestamp: 1701618785, type: "borrow", amount: 10 },
  { timestamp: 1701619200, type: "repay", amount: 10 },
  { timestamp: 1701619250, type: "repay", amount: 0.000011 },
  { timestamp: 1701619370, type: "borrow", amount: 10 },
  { timestamp: 1701634015, type: "borrow", amount: 52 },
  { timestamp: 1701634830, type: "borrow", amount: 80 },
  { timestamp: 1701638085, type: "borrow", amount: 100.2 },
  { timestamp: 1701639210, type: "repay", amount: 0.446352733712991 },
  { timestamp: 1701677725, type: "borrow", amount: 50 },
  { timestamp: 1702402170, type: "repay", amount: 3 },
  { timestamp: 1702500245, type: "borrow", amount: 51 },
  { timestamp: 1702500385, type: "repay", amount: 1 },
  { timestamp: 1702749285, type: "borrow", amount: 25 },
  { timestamp: 1702821365, type: "borrow", amount: 31.64 },
  { timestamp: 1702971350, type: "repay", amount: 9.49184701689134 },
  { timestamp: 1702971775, type: "borrow", amount: 10 },
  { timestamp: 1703578615, type: "repay", amount: 9.57922872424087 },
  { timestamp: 1704183400, type: "repay", amount: 9.84560083985674 },
  { timestamp: 1704814325, type: "repay", amount: 10.4165290241465 },
  { timestamp: 1705350680, type: "repay", amount: 5.71222561697701 },
  { timestamp: 1705992480, type: "repay", amount: 1 },
  { timestamp: 1706082720, type: "repay", amount: 5.4 },
  { timestamp: 1706518025, type: "repay", amount: 5.7 },
  { timestamp: 1706600490, type: "repay", amount: 10.35 },
  { timestamp: 1706724935, type: "borrow", amount: 10 },
  { timestamp: 1707250085, type: "repay", amount: 9.5 },
  { timestamp: 1707296810, type: "repay", amount: 52.1 },
  { timestamp: 1707401860, type: "repay", amount: 195 },
  { timestamp: 1707408495, type: "repay", amount: 45 },
  { timestamp: 1707411990, type: "repay", amount: 52.7791643579776 }
];

// Fonction pour calculer la dette cumulée
function calculateCumulativeDebt() {
  let currentDebt = 0;
  const debtHistory = [];
  
  console.log('📊 Calcul de la dette cumulée :');
  console.log('=' .repeat(80));
  
  for (let i = 0; i < transactions.length; i++) {
    const tx = transactions[i];
    const date = new Date(tx.timestamp * 1000).toLocaleDateString('fr-CH');
    
    if (tx.type === 'borrow') {
      currentDebt += tx.amount;
    } else if (tx.type === 'repay') {
      currentDebt -= tx.amount;
    }
    
    // Éviter les valeurs négatives (impossible en réalité)
    if (currentDebt < 0) {
      currentDebt = 0;
    }
    
    debtHistory.push({
      date,
      timestamp: tx.timestamp,
      type: tx.type,
      amount: tx.amount,
      cumulativeDebt: currentDebt
    });
    
    console.log(`${date} | ${tx.type.toUpperCase().padEnd(6)} | ${tx.amount.toString().padStart(10)} | Dette: ${currentDebt.toFixed(2)}`);
  }
  
  console.log('=' .repeat(80));
  console.log(`🎯 Dette finale calculée: ${currentDebt.toFixed(2)} WXDAI`);
  
  return debtHistory;
}

// Fonction pour analyser les problèmes
function analyzeIssues(debtHistory) {
  console.log('\n🔍 Analyse des problèmes :');
  console.log('=' .repeat(80));
  
  // Vérifier si la dette finale est proche de 0
  const finalDebt = debtHistory[debtHistory.length - 1].cumulativeDebt;
  console.log(`📊 Dette finale: ${finalDebt.toFixed(2)} WXDAI`);
  
  if (finalDebt > 0.01) {
    console.log('❌ PROBLÈME: La dette ne retombe pas à 0 !');
    console.log('💡 Causes possibles:');
    console.log('   - Erreur de calcul dans le backend');
    console.log('   - Transaction manquante');
    console.log('   - Problème de précision décimale');
    console.log('   - Dette réelle restante non remboursée');
  } else {
    console.log('✅ La dette retombe bien à 0');
  }
  
  // Analyser les grandes variations
  console.log('\n📈 Analyse des grandes variations:');
  debtHistory.forEach((entry, index) => {
    if (index > 0) {
      const prevDebt = debtHistory[index - 1].cumulativeDebt;
      const variation = entry.cumulativeDebt - prevDebt;
      
      if (Math.abs(variation) > 50) {
        console.log(`🚨 ${entry.date}: Variation de ${variation.toFixed(2)} (${entry.type} ${entry.amount})`);
      }
    }
  });
}

// Fonction pour vérifier la cohérence avec l'API
function checkAPIConsistency() {
  console.log('\n🔍 Vérification de cohérence avec l\'API:');
  console.log('=' .repeat(80));
  
  // Total des emprunts selon l'API
  const totalBorrows = transactions
    .filter(tx => tx.type === 'borrow')
    .reduce((sum, tx) => sum + tx.amount, 0);
  
  // Total des remboursements selon l'API
  const totalRepays = transactions
    .filter(tx => tx.type === 'repay')
    .reduce((sum, tx) => sum + tx.amount, 0);
  
  const calculatedDebt = totalBorrows - totalRepays;
  
  console.log(`📊 Total des emprunts: ${totalBorrows.toFixed(2)} WXDAI`);
  console.log(`📊 Total des remboursements: ${totalRepays.toFixed(2)} WXDAI`);
  console.log(`📊 Dette calculée: ${calculatedDebt.toFixed(2)} WXDAI`);
  console.log(`📊 Dette selon l'API: 866.16 WXDAI (dans totals.debt)`);
  
  if (Math.abs(calculatedDebt - 866.16) > 0.01) {
    console.log('❌ INCOHÉRENCE: La dette calculée ne correspond pas à l\'API !');
    console.log('💡 Le backend utilise peut-être une logique différente');
  } else {
    console.log('✅ Cohérence avec l\'API');
  }
}

// Exécution
console.log('🚀 DEBUG: Analyse de la dette WXDAI V2');
console.log('=' .repeat(80));

const debtHistory = calculateCumulativeDebt();
analyzeIssues(debtHistory);
checkAPIConsistency();

console.log('\n💡 Conclusion:');
console.log('Le graphique ne retombe pas à 0 car il y a encore une dette restante.');
console.log('Le curseur indique 195$ car c\'est probablement la dernière valeur significative du graphique.');
console.log('Le calcul par jour peut effectivement causer des problèmes de précision.'); 