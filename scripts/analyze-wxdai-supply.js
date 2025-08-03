#!/usr/bin/env node

// Données des transactions WXDAI supply
const transactions = [
  { txHash: "0xefdd65b6e11c30a56188cf7446f50fc44ba648d7be1b1edc93fbc58c8ad1aeb1", amount: "727795000000000000", timestamp: 1709886920, type: "supply" },
  { txHash: "0x1d10ddb6f72c24dbb7c59c513e96c92b9ad8e3352c6493c840d2971374a6adbb", amount: "1413013215517778000", timestamp: 1711958410, type: "supply" },
  { txHash: "0x1ac226abd8574755397883a5c102f3dcc26a6a750deb1b1a769910f77269898d", amount: "2145520270146190724", timestamp: 1711958550, type: "withdraw" },
  { txHash: "0xa00ecaa69742b245323138268c19cd96e733270da6180e5eacc409cf2acc364d", amount: "2145520270146190724", timestamp: 1711958615, type: "supply" },
  { txHash: "0x2a44add80ffbf6b197067c62f115ce9c16a96128bd482ad4eb3f5c0f83ecc4ad", amount: "1374419049610085000", timestamp: 1713255225, type: "supply" },
  { txHash: "0xd639fea9cf23295af30abc5d2a10d4d933d6fddf346223123b44c4b8215c386d", amount: "3000000000000000000", timestamp: 1717587915, type: "supply" },
  { txHash: "0x637665753363b597db900399b7b3d5aaaf5bbee0a729e6f93a40036993e54412", amount: "2500000000000000000", timestamp: 1719556415, type: "supply" },
  { txHash: "0x2fc7c3564708137137e866aeed2efd793c9f44baf483d2a55d2a4079797d018f", amount: "1500000000000000000", timestamp: 1720527635, type: "supply" },
  { txHash: "0x9d408eb2e8ec27d1bb35c4779eb5235741192af13e5dc353945353c1f4ffcb1c", amount: "3000000000000000000", timestamp: 1722417980, type: "supply" },
  { txHash: "0xeb0f3f9185b4b9ac3b6a7a79d118465c5f77c6f5336b40ca2f2d85c201b7c397", amount: "1097699448359554000", timestamp: 1723022705, type: "supply" },
  { txHash: "0x11d7f3b72a0ce8560ea960bf9429af5ee7622b798090dac933db431bba44eb53", amount: "2000000000000000000", timestamp: 1724424140, type: "supply" },
  { txHash: "0x0d491ceeff8847bdb5b8801688dd7ae0b574ea2283cd7be829f5fe758051a02e", amount: "1370731296533270500", timestamp: 1724918190, type: "supply" },
  { txHash: "0x7d96ad4729cb7b863751153c1b6468e6bfe06ebbd2125fa0995102b85bdd76e6", amount: "1370731296533270500", timestamp: 1725915325, type: "supply" },
  { txHash: "0xe00c2650ceba09edf4ed904932b31eaac4bf70aca420d81f66015348ed0c9320", amount: "20952011169714950000", timestamp: 1738086475, type: "supply" },
  { txHash: "0xf82cde34a49931da84ccdf3a58377f0e20d6c14c7a0d5e0b347ae1ff9fc17ac9", amount: "11225544475938595000", timestamp: 1743406990, type: "supply" }
];

// Fonction pour convertir wei en WXDAI
function weiToWxdai(wei) {
  return parseFloat(wei) / Math.pow(10, 18);
}

// Fonction pour analyser les transactions
function analyzeTransactions() {
  console.log('🔍 ANALYSE DES TRANSACTIONS WXDAI SUPPLY');
  console.log('=' .repeat(80));
  
  let totalSupply = 0;
  let totalWithdraw = 0;
  let netBalance = 0;
  
  // Trier par timestamp
  const sortedTransactions = [...transactions].sort((a, b) => a.timestamp - b.timestamp);
  
  console.log('📊 Transactions chronologiques:');
  console.log('-' .repeat(80));
  
  sortedTransactions.forEach((tx, index) => {
    const amount = weiToWxdai(tx.amount);
    const date = new Date(tx.timestamp * 1000).toLocaleDateString('fr-FR');
    
    if (tx.type === 'supply') {
      totalSupply += amount;
      netBalance += amount;
      console.log(`${index + 1}. ${date} | SUPPLY  | +${amount.toFixed(6)} | Balance: ${netBalance.toFixed(6)}`);
    } else if (tx.type === 'withdraw') {
      totalWithdraw += amount;
      netBalance -= amount;
      console.log(`${index + 1}. ${date} | WITHDRAW| -${amount.toFixed(6)} | Balance: ${netBalance.toFixed(6)}`);
    }
  });
  
  console.log('-' .repeat(80));
  console.log(`📈 Total Supplies: ${totalSupply.toFixed(6)} WXDAI`);
  console.log(`📉 Total Withdraws: ${totalWithdraw.toFixed(6)} WXDAI`);
  console.log(`💰 Balance nette: ${netBalance.toFixed(6)} WXDAI`);
  
  return { totalSupply, totalWithdraw, netBalance };
}

// Fonction pour détecter les doublons
function detectDuplicates() {
  console.log('\n🔍 DÉTECTION DE DOUBLONS');
  console.log('=' .repeat(80));
  
  const amounts = transactions.map(tx => weiToWxdai(tx.amount));
  const duplicates = [];
  
  for (let i = 0; i < amounts.length; i++) {
    for (let j = i + 1; j < amounts.length; j++) {
      if (Math.abs(amounts[i] - amounts[j]) < 0.000001) { // Tolérance pour les erreurs de précision
        duplicates.push({
          amount: amounts[i],
          tx1: transactions[i],
          tx2: transactions[j]
        });
      }
    }
  }
  
  if (duplicates.length > 0) {
    console.log('🚨 DOUBLONS DÉTECTÉS:');
    duplicates.forEach((dup, index) => {
      console.log(`${index + 1}. Montant: ${dup.amount.toFixed(6)} WXDAI`);
      console.log(`   TX1: ${dup.tx1.txHash} (${dup.tx1.type})`);
      console.log(`   TX2: ${dup.tx2.txHash} (${dup.tx2.type})`);
      console.log('');
    });
  } else {
    console.log('✅ Aucun doublon détecté');
  }
  
  return duplicates;
}

// Fonction pour analyser les patterns suspects
function analyzePatterns() {
  console.log('\n🔍 ANALYSE DES PATTERNS SUSPECTS');
  console.log('=' .repeat(80));
  
  // Chercher des transactions consécutives avec le même montant
  const sorted = [...transactions].sort((a, b) => a.timestamp - b.timestamp);
  
  for (let i = 0; i < sorted.length - 1; i++) {
    const current = sorted[i];
    const next = sorted[i + 1];
    
    const currentAmount = weiToWxdai(current.amount);
    const nextAmount = weiToWxdai(next.amount);
    
    if (Math.abs(currentAmount - nextAmount) < 0.000001) {
      const timeDiff = next.timestamp - current.timestamp;
      console.log(`🚨 Montants identiques consécutifs:`);
      console.log(`   ${current.txHash} (${current.type}) -> ${next.txHash} (${next.type})`);
      console.log(`   Montant: ${currentAmount.toFixed(6)} WXDAI`);
      console.log(`   Délai: ${timeDiff} secondes`);
      console.log('');
    }
  }
}

// Exécution
const { totalSupply, totalWithdraw, netBalance } = analyzeTransactions();
detectDuplicates();
analyzePatterns();

console.log('\n📊 RÉSUMÉ FINAL');
console.log('=' .repeat(80));
console.log(`💰 Balance calculée: ${netBalance.toFixed(6)} WXDAI`);
console.log(`🌐 Balance réelle (selon l'utilisateur): 33.41 WXDAI`);
console.log(`🔍 Différence: ${(netBalance - 33.41).toFixed(6)} WXDAI`);

if (Math.abs(netBalance - 33.41) > 0.01) {
  console.log('\n❌ PROBLÈME: Les montants ne correspondent pas !');
  console.log('💡 Causes possibles:');
  console.log('   - Transactions manquées');
  console.log('   - Doublons dans les données');
  console.log('   - Problème de calcul backend');
  console.log('   - Balance réelle incorrecte');
} else {
  console.log('\n✅ SUCCÈS: Les montants correspondent !');
} 