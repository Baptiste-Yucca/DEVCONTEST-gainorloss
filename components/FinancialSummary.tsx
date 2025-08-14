import React, { useState, useMemo } from 'react';

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
  
  // Transactions pour le tableau
  transactions: any[];
  
  // Adresse utilisateur
  userAddress: string;
}

const FinancialSummary: React.FC<FinancialSummaryProps> = ({
  usdcData,
  wxdaiData,
  v2Data,
  transactions,
  userAddress
}) => {
  // État pour les filtres
  const [selectedTokens, setSelectedTokens] = useState<string[]>(['USDC', 'WXDAI', 'WXDAI_V2']);
  const [selectedPeriod, setSelectedPeriod] = useState<{ start: string; end: string }>({
    start: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0], // 1er janvier
    end: new Date().toISOString().split('T')[0] // Aujourd'hui
  });

  // Calculs financiers unifiés
  const financialData = useMemo(() => {
    const data: any = {};
    
    // USDC V3
    if (usdcData && selectedTokens.includes('USDC')) {
      data.USDC = {
        debt: parseFloat(usdcData.borrow.totalInterest) / Math.pow(10, 6), // USDC = 6 decimals
        supply: parseFloat(usdcData.supply.totalInterest) / Math.pow(10, 6),
        net: parseFloat(usdcData.summary.netInterest) / Math.pow(10, 6),
        version: 'V3',
        contract: '0x69c731aE5f5356a779f44C355aBB685d84e5E9e6'
      };
    }
    
    // WXDAI V3
    if (wxdaiData && selectedTokens.includes('WXDAI')) {
      data.WXDAI = {
        debt: parseFloat(wxdaiData.borrow.totalInterest) / Math.pow(10, 18), // WXDAI = 18 decimals
        supply: parseFloat(wxdaiData.supply.totalInterest) / Math.pow(10, 18),
        net: parseFloat(wxdaiData.summary.netInterest) / Math.pow(10, 18),
        version: 'V3',
        contract: '0x9908801dF7902675C3FEDD6Fea0294D18D5d5d34'
      };
    }
    
    // WXDAI V2
    if (v2Data && selectedTokens.includes('WXDAI_V2')) {
      data.WXDAI_V2 = {
        debt: parseFloat(v2Data.borrow.totalInterest) / Math.pow(10, 18),
        supply: parseFloat(v2Data.supply.totalInterest) / Math.pow(10, 18),
        net: parseFloat(v2Data.summary.netInterest) / Math.pow(10, 18),
        version: 'V2',
        contract: '0x0ade75f269a054673883319baa50e5e0360a775f'
      };
    }
    
    return data;
  }, [usdcData, wxdaiData, v2Data, selectedTokens]);

  // Calculs totaux
  const totals = useMemo(() => {
    const totalDebt = Object.values(financialData).reduce((sum: number, token: any) => sum + token.debt, 0);
    const totalSupply = Object.values(financialData).reduce((sum: number, token: any) => sum + token.supply, 0);
    const totalNet = Object.values(financialData).reduce((sum: number, token: any) => sum + token.net, 0);
    
    return { debt: totalDebt, supply: totalSupply, net: totalNet };
  }, [financialData]);

  // Fonction d'interpolation pour une date spécifique
  const interpolateForDate = (dailyDetails: any[], targetDate: string, tokenType: string) => {
    if (!dailyDetails.length) return null;
    
    const targetTimestamp = new Date(targetDate).getTime() / 1000;
    
    // Trouver les points avant et après
    const beforePoint = dailyDetails.find(p => p.timestamp <= targetTimestamp);
    const afterPoint = dailyDetails.find(p => p.timestamp > targetTimestamp);
    
    if (!beforePoint || !afterPoint) {
      // Retourner le point le plus proche
      return dailyDetails.reduce((closest, current) => 
        Math.abs(current.timestamp - targetTimestamp) < Math.abs(closest.timestamp - targetTimestamp) 
          ? current : closest
      );
    }
    
    // Interpolation linéaire
    const timeDiff = afterPoint.timestamp - beforePoint.timestamp;
    const ratio = (targetTimestamp - beforePoint.timestamp) / timeDiff;
    
    const interpolatedBalance = parseFloat(beforePoint[tokenType]) + 
      (parseFloat(afterPoint[tokenType]) - parseFloat(beforePoint[tokenType])) * ratio;
    
    return {
      ...beforePoint,
      [tokenType]: interpolatedBalance.toString(),
      source: "interpolated"
    };
  };

  // Calcul des intérêts pour une période
  const calculateInterestForPeriod = (dailyDetails: any[], startDate: string, endDate: string, tokenType: string) => {
    const startPoint = interpolateForDate(dailyDetails, startDate, tokenType);
    const endPoint = interpolateForDate(dailyDetails, endDate, tokenType);
    
    if (!startPoint || !endPoint) return 0;
    
    // Calcul de l'intérêt basé sur la différence de balance
    return parseFloat(endPoint[tokenType]) - parseFloat(startPoint[tokenType]);
  };

  // Fonction d'export CSV
  const exportToCSV = () => {
    const headers = ['Token', 'Version', 'Intérêts Dette', 'Intérêts Supply', 'Gain Net'];
    const csvData = [
      headers.join(','),
      ...Object.entries(financialData).map(([token, data]) => [
        token,
        data.version,
        data.debt.toFixed(2),
        data.supply.toFixed(2),
        data.net.toFixed(2)
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `financial_summary_${userAddress}_${selectedPeriod.start}_${selectedPeriod.end}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Fonction d'export PDF (placeholder pour l'instant)
  const exportToPDF = () => {
    console.log('Export PDF pour la période:', selectedPeriod);
    // TODO: Implémenter l'export PDF avec jsPDF
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 mb-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Récapitulatif Financier</h2>
        
        {/* Filtres */}
        <div className="flex items-center gap-4">
          {/* Sélection des tokens */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Tokens :</label>
            {['USDC', 'WXDAI', 'WXDAI_V2'].map(token => (
              <label key={token} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selectedTokens.includes(token)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedTokens([...selectedTokens, token]);
                    } else {
                      setSelectedTokens(selectedTokens.filter(t => t !== token));
                    }
                  }}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-600">{token}</span>
              </label>
            ))}
          </div>
          
          {/* Période */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Du :</label>
            <input
              type="date"
              value={selectedPeriod.start}
              onChange={(e) => setSelectedPeriod(prev => ({ ...prev, start: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <label className="text-sm font-medium text-gray-700">Au :</label>
            <input
              type="date"
              value={selectedPeriod.end}
              onChange={(e) => setSelectedPeriod(prev => ({ ...prev, end: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
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
                  href={`https://gnosisscan.io/token/0x69c731aE5f5356a779f44C355aBB685d84e5E9e6?a=${userAddress}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-2 text-blue-600 hover:text-blue-800"
                  title="Voir l'historique sur GnosisScan"
                >
                  ��
                </a>
              </th>
              <th className="text-left py-3 px-4 font-semibold text-gray-900">
                Intérêts Supply
                <a 
                  href={`https://gnosisscan.io/token/0xed56f76e9cbc6a64b821e9c016eafbd3db5436d1?a=${userAddress}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-2 text-blue-600 hover:text-blue-800"
                  title="Voir l'historique sur GnosisScan"
                >
                  ��
                </a>
              </th>
              <th className="text-left py-3 px-4 font-semibold text-gray-900">Gain Net</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(financialData).map(([token, data]) => (
              <tr key={token} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-3 px-4 text-sm font-medium text-gray-900">{token}</td>
                <td className="py-3 px-4">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    data.version === 'V2' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                  }`}>
                    {data.version}
                  </span>
                </td>
                <td className="py-3 px-4 text-sm font-medium text-red-600">
                  {data.debt.toFixed(2)} {token.includes('USDC') ? 'USDC' : 'WXDAI'}
                </td>
                <td className="py-3 px-4 text-sm font-medium text-green-600">
                  {data.supply.toFixed(2)} {token.includes('USDC') ? 'USDC' : 'WXDAI'}
                </td>
                <td className="py-3 px-4 text-sm font-medium">
                  <span className={data.net >= 0 ? 'text-green-600' : 'text-red-600'}>
                    {data.net.toFixed(2)} {token.includes('USDC') ? 'USDC' : 'WXDAI'}
                  </span>
                </td>
              </tr>
            ))}
            
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
                </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Informations de période */}
      <div className="text-center text-sm text-gray-600 mb-6">
        Période analysée : du {new Date(selectedPeriod.start).toLocaleDateString('fr-FR')} au {new Date(selectedPeriod.end).toLocaleDateString('fr-FR')}
      </div>

      {/* Boutons d'export */}
      <div className="flex items-center justify-center gap-4">
        <button
          onClick={exportToCSV}
          className="px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors font-medium flex items-center gap-2"
        >
          �� Export CSV
        </button>
        <button
          onClick={exportToPDF}
          className="px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors font-medium flex items-center gap-2"
        >
          �� Export PDF
        </button>
      </div>
    </div>
  );
};

export default FinancialSummary;
