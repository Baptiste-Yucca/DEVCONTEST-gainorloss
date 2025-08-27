import React, { useState, useMemo } from 'react';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { TOKENS } from '../utils/constants';

interface FinancialSummaryProps {
  // Données V3
  usdcData?: {
    borrow: { dailyDetails: any[]; totalInterest: string };
    supply: { dailyDetails: any[]; totalInterest: string };
    summary: { netInterest: string };
  };
  wxdaiData?: {
    borrow: { dailyDetails: any[]; totalInterest: string };
    supply: { dailyDetails: any[]; totalInterest: string };
    summary: { netInterest: string };
  };
  
  // Données V2
  v2Data?: {
    borrow: { dailyDetails: any[]; totalInterest: string };
    supply: { dailyDetails: any[]; totalInterest: string };
    summary: { netInterest: string };
  };
  
  // Adresse utilisateur
  userAddress: string;
  
  transactions: any[];
}

const FinancialSummary: React.FC<FinancialSummaryProps> = ({
  usdcData,
  wxdaiData,
  v2Data,
  userAddress,
  transactions
}) => {
  // Calculer la période dynamiquement avec useMemo
  const defaultPeriod = useMemo(() => {
    const allDates: string[] = [];
    
    // Collecter toutes les dates des données V3
    if (usdcData?.borrow?.dailyDetails) {
      usdcData.borrow.dailyDetails.forEach(detail => allDates.push(detail.date));
    }
    if (usdcData?.supply?.dailyDetails) {
      usdcData.supply.dailyDetails.forEach(detail => allDates.push(detail.date));
    }
    if (wxdaiData?.borrow?.dailyDetails) {
      wxdaiData.borrow.dailyDetails.forEach(detail => allDates.push(detail.date));
    }
    if (wxdaiData?.supply?.dailyDetails) {
      wxdaiData.supply.dailyDetails.forEach(detail => allDates.push(detail.date));
    }
    
    // Collecter toutes les dates des données V2
    if (v2Data?.borrow?.dailyDetails) {
      v2Data.borrow.dailyDetails.forEach(detail => allDates.push(detail.date));
    }
    if (v2Data?.supply?.dailyDetails) {
      v2Data.supply.dailyDetails.forEach(detail => allDates.push(detail.date));
    }
    
    // Collecter toutes les dates des transactions
    if (transactions) {
      transactions.forEach(tx => {
        const date = new Date(tx.timestamp * 1000);
        const dateString = date.toISOString().split('T')[0];
        allDates.push(dateString);
      });
    }
    
    // Trouver la date la plus ancienne
    if (allDates.length > 0) {
      const oldestDate = allDates.sort()[0]; // Tri alphabétique YYYYMMDD
      console.log(`📅 Date de départ calculée: ${oldestDate} (plus ancien événement)`);
      return {
        start: oldestDate,
        end: new Date().toISOString().split('T')[0] // Aujourd'hui
      };
    }
    
    // Fallback : 1er janvier de l'année en cours
    return {
      start: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
      end: new Date().toISOString().split('T')[0]
    };
  }, [usdcData, wxdaiData, v2Data, transactions]);

  // Utiliser la période calculée dynamiquement
  const [selectedPeriod, setSelectedPeriod] = useState<{ start: string; end: string }>(defaultPeriod);

  // État pour les filtres
  const [selectedTokens, setSelectedTokens] = useState<string[]>(['USDC', 'WXDAI', 'WXDAI_V2']);

  const calculateInterestForCustomPeriod = (
    dailyDetails: any[], 
    startTimestamp: number, 
    endTimestamp: number
  ) => {
    if (dailyDetails.length < 2) return 0;
    
    let totalInterest = 0;
    
    // Parcourir tous les points et sommer les periodInterest dans la plage
    for (const point of dailyDetails) {
      if (point.timestamp >= startTimestamp && point.timestamp <= endTimestamp) {
        totalInterest += parseFloat(point.periodInterest || '0');
      }
    }
    
    return totalInterest;
  };


  const financialData = useMemo(() => {
    const data: any = {};
    

    const isCustomPeriod = selectedPeriod.start !== defaultPeriod.start || selectedPeriod.end !== defaultPeriod.end;
    
    if (isCustomPeriod) {
      const startTimestamp = new Date(selectedPeriod.start).getTime() / 1000;
      const endTimestamp = new Date(selectedPeriod.end).getTime() / 1000;
      
      // USDC V3 interpolation
      if (usdcData && selectedTokens.includes('USDC')) {
        const debtInterest = calculateInterestForCustomPeriod(
          usdcData.borrow?.dailyDetails || [], 
          startTimestamp, 
          endTimestamp
        ) / Math.pow(10, 6);
        
        const supplyInterest = calculateInterestForCustomPeriod(
          usdcData.supply?.dailyDetails || [], 
          startTimestamp, 
          endTimestamp
        ) / Math.pow(10, 6);
        
        data.USDC = {
          debt: debtInterest,
          supply: supplyInterest,
          net: supplyInterest - debtInterest,
          version: 'V3',
          contract: TOKENS.USDC.debtAddress
        };
      }
      
      // WXDAI V3 interpolation
      if (wxdaiData && selectedTokens.includes('WXDAI')) {
        const debtInterest = calculateInterestForCustomPeriod(
          wxdaiData.borrow?.dailyDetails || [], 
          startTimestamp, 
          endTimestamp
        ) / Math.pow(10, 18);
        
        const supplyInterest = calculateInterestForCustomPeriod(
          wxdaiData.supply?.dailyDetails || [], 
          startTimestamp, 
          endTimestamp
        ) / Math.pow(10, 18);
        
        data.WXDAI = {
          debt: debtInterest,
          supply: supplyInterest,
          net: supplyInterest - debtInterest,
          version: 'V3',
          contract: TOKENS.WXDAI.debtAddress
        };
      }
      
      // WXDAI V2 interpolation
      if (v2Data && selectedTokens.includes('WXDAI_V2')) {
        const debtInterest = calculateInterestForCustomPeriod(
          v2Data.borrow?.dailyDetails || [], 
          startTimestamp, 
          endTimestamp
        ) / Math.pow(10, 18);
        
        const supplyInterest = calculateInterestForCustomPeriod(
          v2Data.supply?.dailyDetails || [], 
          startTimestamp, 
          endTimestamp
        ) / Math.pow(10, 18);
        
        data.WXDAI_V2 = {
          debt: debtInterest,
          supply: supplyInterest,
          net: supplyInterest - debtInterest,
          version: 'V2',
          contract: TOKENS.WXDAI.debtV2Address
        };
      }
      
    } else {
      // USDC V3
      if (usdcData && selectedTokens.includes('USDC')) {
        const lastDebtPoint = usdcData.borrow?.dailyDetails?.[usdcData.borrow.dailyDetails.length - 1];
        const lastSupplyPoint = usdcData.supply?.dailyDetails?.[usdcData.supply.dailyDetails.length - 1];
        
        const debtInterest = lastDebtPoint ? parseFloat(lastDebtPoint.totalInterest) / Math.pow(10, 6) : 0;
        const supplyInterest = lastSupplyPoint ? parseFloat(lastSupplyPoint.totalInterest) / Math.pow(10, 6) : 0;
        const netInterest = supplyInterest - debtInterest;
        
        data.USDC = {
          debt: debtInterest,
          supply: supplyInterest,
          net: netInterest,
          version: 'V3',
          contract: TOKENS.USDC.debtAddress
        };
      }
      
      // WXDAI V3
      if (wxdaiData && selectedTokens.includes('WXDAI')) {
        const lastDebtPoint = wxdaiData.borrow?.dailyDetails?.[wxdaiData.borrow.dailyDetails.length - 1];
        const lastSupplyPoint = wxdaiData.supply?.dailyDetails?.[wxdaiData.supply.dailyDetails.length - 1];
        
        const debtInterest = lastDebtPoint ? parseFloat(lastDebtPoint.totalInterest) / Math.pow(10, 18) : 0;
        const supplyInterest = lastSupplyPoint ? parseFloat(lastSupplyPoint.totalInterest) / Math.pow(10, 18) : 0;
        const netInterest = supplyInterest - debtInterest;
        
        data.WXDAI = {
          debt: debtInterest,
          supply: supplyInterest,
          net: netInterest,
          version: 'V3',
          contract: TOKENS.WXDAI.debtAddress
        };
      }
      
      // WXDAI V2
      if (v2Data && selectedTokens.includes('WXDAI_V2')) {
        const lastDebtPoint = v2Data.borrow?.dailyDetails?.[v2Data.borrow.dailyDetails.length - 1];
        const lastSupplyPoint = v2Data.supply?.dailyDetails?.[v2Data.supply.dailyDetails.length - 1];
        
        const debtInterest = lastDebtPoint ? parseFloat(lastDebtPoint.totalInterest) / Math.pow(10, 18) : 0;
        const supplyInterest = lastSupplyPoint ? parseFloat(lastSupplyPoint.totalInterest) / Math.pow(10, 18) : 0;
        const netInterest = supplyInterest - debtInterest;
        
        data.WXDAI_V2 = {
          debt: debtInterest,
          supply: supplyInterest,
          net: netInterest,
          version: 'V2',
          contract: TOKENS.WXDAI.debtV2Address
        };
      }
    }
    
    return data;
  }, [usdcData, wxdaiData, v2Data, selectedTokens, selectedPeriod, defaultPeriod]);

  // Calculs totaux
  const totals = useMemo(() => {
    const totalDebt = Object.values(financialData).reduce((sum: number, token: any) => sum + token.debt, 0);
    const totalSupply = Object.values(financialData).reduce((sum: number, token: any) => sum + token.supply, 0);
    const totalNet = Object.values(financialData).reduce((sum: number, token: any) => sum + token.net, 0);
    
    return { debt: totalDebt, supply: totalSupply, net: totalNet };
  }, [financialData]);

  const filteredTransactions = useMemo(() => {
    if (!transactions || transactions.length === 0) return [];
    
    return transactions.filter(tx => {
      // Filtre par token
      const tokenMatch = selectedTokens.some(selectedToken => {
        if (selectedToken === 'USDC') return tx.token === 'USDC';
        if (selectedToken === 'WXDAI') return tx.token === 'WXDAI' && tx.version === 'V3';
        if (selectedToken === 'WXDAI_V2') return tx.token === 'WXDAI' && tx.version === 'V2';
        return false;
      });
      
      if (!tokenMatch) return false;

      const txDate = new Date(tx.timestamp * 1000);
      const startDate = new Date(selectedPeriod.start);
      const endDate = new Date(selectedPeriod.end);
      
      return txDate >= startDate && txDate <= endDate;
    });
  }, [transactions, selectedTokens, selectedPeriod]);

  const exportToCSV = () => {
    const financialHeaders = ['Token', 'Version', 'Debt Interest', 'Supply Interest', 'PnL Net'];
    const financialDataRows = Object.entries(financialData).map(([tokenKey, data]) => [
      getDisplayTokenName(tokenKey),
      data.version,
      data.debt.toFixed(2),
      data.supply.toFixed(2),
      data.net.toFixed(2)
    ]);
    

    const transactionHeaders = ['Date', 'Type', 'Token', 'Version', 'Montant', 'Hash'];
    const transactionData = filteredTransactions.map(tx => [
      new Date(tx.timestamp * 1000).toLocaleDateString('fr-CH'),
      tx.type,
      tx.token,
      tx.version,
      (parseFloat(tx.amount) / Math.pow(10, tx.token === 'USDC' ? 6 : 18)).toFixed(2),
      tx.txHash || 'N/A'
    ]);
    
    // Combiner les deux sections avec des séparateurs
    const csvContent = [

      `RMM Analytics - Financial Summary`,
      `Address: ${userAddress}`,
      `Period: ${new Date(selectedPeriod.start).toLocaleDateString('fr-CH')} to ${new Date(selectedPeriod.end).toLocaleDateString('fr-CH')}`,
      `Generated on: ${new Date().toLocaleDateString('fr-CH')}`,
      ``, 
      financialHeaders.join(','),
      ...financialDataRows.map(row => row.join(',')), 
      ``, 
      
 
      ...(filteredTransactions.length > 0 ? [
        `TRANSACTION DETAILS`,
        transactionHeaders.join(','),
        ...transactionData.map(row => row.join(','))
      ] : [])
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `rmm_analytics_${userAddress}_${selectedPeriod.start}_${selectedPeriod.end}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };


  const exportToJSON = () => {
    const exportData = {
      metadata: {
        title: 'RMM Analytics - Rapport Financier',
        address: userAddress,
        period: {
          start: selectedPeriod.start,
          end: selectedPeriod.end,
        },
        generatedAt: new Date().toISOString(),
      },
      financialSummary: Object.entries(financialData).map(([tokenKey, data]) => ({
        token: getDisplayTokenName(tokenKey),
        version: data.version,
        debtInterest: data.debt,
        supplyInterest: data.supply,
        netInterest: data.net,
        contract: data.contract
      })),
      totals: {
        totalDebt: totals.debt,
        totalSupply: totals.supply,
        netTotal: totals.net
      },
      transactions: filteredTransactions.map(tx => ({
        date: new Date(tx.timestamp * 1000).toISOString(),
        dateFormatted: new Date(tx.timestamp * 1000).toLocaleDateString('fr-CH'),
        type: tx.type,
        token: tx.token,
        version: tx.version,
        amount: parseFloat(tx.amount) / Math.pow(10, tx.token === 'USDC' ? 6 : 18),
        amountRaw: tx.amount,
        decimals: tx.token === 'USDC' ? 6 : 18,
        txHash: tx.txHash || null,
      }))
    };
    
    const jsonContent = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `rmm_analytics_${userAddress}_${selectedPeriod.start}_${selectedPeriod.end}.json`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
  };
  const exportToPDF = () => {
    const doc = new jsPDF();
    

    doc.setFontSize(20);
    doc.setTextColor(59, 130, 246);
    doc.text('RMM Analytics - Financial Summary', 105, 30, { align: 'center' });
    
    // Informations
    doc.setFontSize(12);
    doc.setTextColor(75, 85, 99);
    doc.text(`Address: ${userAddress}`, 20, 45);
    doc.text(`Period: ${new Date(selectedPeriod.start).toLocaleDateString('fr-CH')} à ${new Date(selectedPeriod.end).toLocaleDateString('fr-CH')}`, 20, 55);
    doc.text(`Generated on: ${new Date().toLocaleDateString('fr-CH')}`, 20, 65);
    doc.setFontSize(16);
    doc.setTextColor(59, 130, 246);
    doc.text('Financial Summary', 105, 85, { align: 'center' });
    
    const tableData = Object.entries(financialData).map(([tokenKey, data]) => [
      getDisplayTokenName(tokenKey),
      data.version,
      `${data.debt.toFixed(2)} ${tokenKey.includes('USDC') ? 'USDC' : 'WXDAI'}`,
      `${data.supply.toFixed(2)} ${tokenKey.includes('USDC') ? 'USDC' : 'WXDAI'}`,
      `${data.net.toFixed(2)} ${tokenKey.includes('USDC') ? 'USDC' : 'WXDAI'}`
    ]);
    
    tableData.push([
      'TOTAL',
      '-',
      `${totals.debt.toFixed(2)} USD`,
      `${totals.supply.toFixed(2)} USD`,
      `${totals.net.toFixed(2)} USD`
    ]);
    

    autoTable(doc, {
      startY: 95,
      head: [['Token', 'Version', 'Debt Interest', 'Supply Interest', 'PnL Net']],
      body: tableData,
      theme: 'grid',
      headStyles: {
        fillColor: [59, 130, 246], // Using a blue color for the header
        textColor: [255, 255, 255],
        fontStyle: 'bold'
      },
      bodyStyles: {
        textColor: [75, 85, 99]
      },
      alternateRowStyles: {
        fillColor: [249, 250, 251]
      },
      styles: {
        fontSize: 10,
        cellPadding: 3 
      },
      columnStyles: {
        0: { cellWidth: 25 },
        1: { cellWidth: 20, halign: 'center' }, 
        2: { cellWidth: 35, halign: 'right' }, 
        3: { cellWidth: 35, halign: 'right' },
        4: { cellWidth: 35, halign: 'right' } 
      },
      // no halign available
      tableWidth: 'auto', 
      margin: { left: 30, right: 30 }
    });
    
    doc.addPage();
    
    
    doc.setFontSize(16);
    doc.setTextColor(59, 130, 246);
    doc.text('Transaction Details', 105, 30, { align: 'center' });
    
    // Préparer les données des transactions
    const txTableData = filteredTransactions.map(tx => [
      new Date(tx.timestamp * 1000).toLocaleDateString('fr-CH'),
      tx.type,
      tx.token,
      tx.version,
      `${(parseFloat(tx.amount) / Math.pow(10, tx.token === 'USDC' ? 6 : 18)).toFixed(2)}`,
      tx.txHash || 'N/A'
    ]);
    
    // En-têtes du tableau des transactions
    const txHeaders = ['Date', 'Type', 'Token', 'RMM', 'Montant', 'Hash'];
    
    autoTable(doc, {
      startY: 40,
      head: [txHeaders],
      body: txTableData,
      theme: 'grid',
      headStyles: {
        fillColor: [59, 130, 246],
        textColor: [255, 255, 255],
        fontStyle: 'bold'
      },
      bodyStyles: {
        textColor: [75, 85, 99],
        fontSize: 7
      },
      alternateRowStyles: {
        fillColor: [249, 250, 251]
      },
      styles: {
        fontSize: 7,
        cellPadding: 2
      },

      margin: { left: 10, right: 10 }, 
      columnStyles: {
        0: { cellWidth: 25 }, // Date 
        1: { cellWidth: 20 }, // Type 
        2: { cellWidth: 12 }, // Token 
        3: { cellWidth: 10 }, // Version 
        4: { cellWidth: 20, halign: 'right' }, // Amount 
        5: { cellWidth: 100, halign: 'center' }  // Hash
      }

    });
  
    const filename = `rmm_analytics_${userAddress}_${selectedPeriod.start}_${selectedPeriod.end}.pdf`;
    doc.save(filename);
  };

  // Fonction pour mapper l'affichage des tokens
  const getDisplayTokenName = (tokenKey: string): string => {
    return tokenKey === 'WXDAI_V2' ? 'WXDAI' : tokenKey;
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 mb-8">
      {/*  HEADER: Responsive avec flex-col sur mobile, flex-row sur desktop */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Financial Summary</h2>
        
        {/* FILTRES: Responsive avec flex-col sur mobile, flex-row sur desktop */}
        <div className="flex flex-col lg:flex-row gap-4">
          {/* TOKENS: Responsive avec flex-wrap pour éviter le débordement */}
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Token:</label>
            {[
              { key: 'USDC', label: 'USDC' },
              { key: 'WXDAI', label: 'WXDAI' },
              { key: 'WXDAI_V2', label: 'V2' }
            ].map(({ key, label }) => (
              <label key={key} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selectedTokens.includes(key)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedTokens([...selectedTokens, key]);
                    } else {
                      setSelectedTokens(selectedTokens.filter(t => t !== key));
                    }
                  }}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-600">{label}</span>
              </label>
            ))}
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">From</label>
              <input
                type="date"
                value={selectedPeriod.start}
                onChange={(e) => setSelectedPeriod(prev => ({ ...prev, start: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">To</label>
              <input
                type="date"
                value={selectedPeriod.end}
                onChange={(e) => setSelectedPeriod(prev => ({ ...prev, end: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Tableau récapitulatif */}
      <div className="overflow-x-auto mb-6">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-4 font-semibold text-gray-900">Token</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-900">Version</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-900">
                Intérêts Dette
                <a 
                  href={`https://gnosisscan.io/token/${TOKENS.USDC.debtAddress}?a=${userAddress}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-2 text-blue-600 hover:text-blue-800"
                  title="Voir l'historique sur GnosisScan"
                >
                  
                </a>
              </th>
              <th className="text-left py-3 px-4 font-semibold text-gray-900">
                Intérêts Supply
                <a 
                  href={`https://gnosisscan.io/token/${TOKENS.USDC.supplyAddress}?a=${userAddress}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-2 text-blue-600 hover:text-blue-800"
                  title="Voir l'historique sur GnosisScan"
                >
                  
                </a>
              </th>
              <th className="text-left py-3 px-4 font-semibold text-gray-900">Gain Net</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(financialData).map(([tokenKey, data]) => {
              // Mapper l'affichage du token
              const displayToken = tokenKey === 'WXDAI_V2' ? 'WXDAI' : tokenKey;
              
              return (
                <tr key={tokenKey} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4 text-sm font-medium text-gray-900">{displayToken}</td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      data.version === 'V2' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                    }`}>
                      {data.version}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-sm font-medium text-red-600">
                    {data.debt.toFixed(2)} {tokenKey.includes('USDC') ? 'USDC' : 'WXDAI'}
                  </td>
                  <td className="py-3 px-4 text-sm font-medium text-green-600">
                    {data.supply.toFixed(2)} {tokenKey.includes('USDC') ? 'USDC' : 'WXDAI'}
                  </td>
                  <td className="py-3 px-4 text-sm font-medium">
                    <span className={data.net >= 0 ? 'text-green-600' : 'text-red-600'}>
                      {data.net.toFixed(2)} {tokenKey.includes('USDC') ? 'USDC' : 'WXDAI'}
                    </span>
                  </td>
                </tr>
              );
            })}
            
            {/* Ligne des totaux */}
            <tr className="border-t-2 border-gray-200 bg-gray-50">
              <td className="py-3 px-4 font-semibold text-gray-900">TOTAL</td>
              <td className="py-3 px-4 text-sm text-gray-600">-</td>
              <td className="py-3 px-4 font-semibold text-red-600">
                {totals.debt.toFixed(2)} USD
              </td>
              <td className="py-3 px-4 font-semibold text-green-600">
                {totals.supply.toFixed(2)} USD
              </td>
              <td className="py-3 px-4 font-semibold">
                <span className={totals.net >= 0 ? 'text-green-600' : 'text-red-600'}>
                  {totals.net.toFixed(2)} USD
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Informations de période */}
      <div className="text-center text-sm text-gray-600 mb-6">
      Period analyzed : from {new Date(selectedPeriod.start).toLocaleDateString('fr-CH')} to {new Date(selectedPeriod.end).toLocaleDateString('fr-CH')}
      </div>

      {/* Boutons d'export mis à jour */}
      <div className="flex items-center justify-center gap-4">
        <button
          onClick={exportToCSV}
          className="px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors font-medium flex items-center gap-2"
          title="Export CSV avec récapitulatif financier et transactions"
        >
          📊 Export CSV
        </button>
        
        <button
          onClick={exportToJSON}
          className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium flex items-center gap-2"
          title="Export JSON avec toutes les données structurées"
        >
          🔗 Export JSON
        </button>
        
        <button
          onClick={exportToPDF}
          className="px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors font-medium flex items-center gap-2"
          title="Export PDF avec rapport formaté"
        >
          📄 Export PDF
        </button>
      </div>
    </div>
  );
};

export default FinancialSummary;
