import React from 'react';
import { Transaction } from '@/utils/api';
import { formatAmount, formatTimestamp } from '@/utils/helpers';
import { TOKENS, ADDRESS_SC_TO_TOKEN } from '@/utils/constants';

type TransactionWithType = Transaction & {
  transactionType: 'supply' | 'withdraw' | 'borrow' | 'repay';
};

type AllTransactionsTableProps = {
  supplies: Transaction[];
  withdraws: Transaction[];
  borrows: Transaction[];
  repays: Transaction[];
};

const AllTransactionsTable: React.FC<AllTransactionsTableProps> = ({ 
  supplies, 
  withdraws, 
  borrows, 
  repays 
}) => {
  const getTokenSymbol = (reserveId: string): string => {
    // La réserve contient l'adresse du token au début (longueur EVM = 42 caractères)
    const tokenAddress = reserveId.substring(0, 42).toLowerCase();
    const tokenKey = ADDRESS_SC_TO_TOKEN[tokenAddress];
    return tokenKey ? TOKENS[tokenKey].symbol : 'Inconnu';
  };

  // Combinaison de toutes les transactions avec leur type
  const allTransactions: TransactionWithType[] = [
    ...supplies.map(tx => ({ ...tx, transactionType: 'supply' as const })),
    ...withdraws.map(tx => ({ ...tx, transactionType: 'withdraw' as const })),
    ...borrows.map(tx => ({ ...tx, transactionType: 'borrow' as const })),
    ...repays.map(tx => ({ ...tx, transactionType: 'repay' as const }))
  ];

  // Tri par date (plus récent en premier)
  const sortedTransactions = allTransactions.sort((a, b) => b.timestamp - a.timestamp);

  if (sortedTransactions.length === 0) {
    return (
      <div className="mt-6">
        <h2 className="text-xl font-semibold mb-4">Toutes les transactions (0)</h2>
        <p className="text-gray-500">Aucune transaction trouvée</p>
      </div>
    );
  }

  // Fonction pour obtenir la classe CSS du type de transaction
  const getTransactionTypeStyle = (type: string): string => {
    switch (type) {
      case 'supply':
        return 'bg-blue-100 text-blue-800';
      case 'withdraw':
        return 'bg-green-100 text-green-800';
      case 'borrow':
        return 'bg-purple-100 text-purple-800';
      case 'repay':
        return 'bg-amber-100 text-amber-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Fonction pour obtenir le libellé du type de transaction
  const getTransactionTypeLabel = (type: string): string => {
    switch (type) {
      case 'supply':
        return 'Dépôt';
      case 'withdraw':
        return 'Retrait';
      case 'borrow':
        return 'Emprunt';
      case 'repay':
        return 'Remboursement';
      default:
        return type;
    }
  };

  return (
    <div className="mt-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Toutes les transactions ({sortedTransactions.length})</h2>
        
        <div className="flex space-x-2 text-sm">
          <div className="flex items-center">
            <span className="inline-block w-3 h-3 rounded-full bg-blue-600 mr-1"></span>
            <span>Dépôts: {supplies.length}</span>
          </div>
          <div className="flex items-center">
            <span className="inline-block w-3 h-3 rounded-full bg-green-600 mr-1"></span>
            <span>Retraits: {withdraws.length}</span>
          </div>
          <div className="flex items-center">
            <span className="inline-block w-3 h-3 rounded-full bg-purple-600 mr-1"></span>
            <span>Emprunts: {borrows.length}</span>
          </div>
          <div className="flex items-center">
            <span className="inline-block w-3 h-3 rounded-full bg-amber-600 mr-1"></span>
            <span>Remboursements: {repays.length}</span>
          </div>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                #
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Type
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Token
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Montant
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Hash de transaction
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedTransactions.map((tx, index) => {
              const tokenSymbol = getTokenSymbol(tx.reserve.id);
              
              return (
                <tr key={tx.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    #{index + 1}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTransactionTypeStyle(tx.transactionType)}`}>
                      {getTransactionTypeLabel(tx.transactionType)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {tokenSymbol}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatAmount(tx.amount, tx.reserve.id.substring(0, 42))}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatTimestamp(tx.timestamp)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <a 
                      href={`https://gnosisscan.io/tx/${tx.txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-600 hover:text-indigo-900 truncate block max-w-[150px]"
                      aria-label={`Voir la transaction ${tx.txHash} sur Gnosisscan`}
                      tabIndex={0}
                    >
                      {tx.txHash.substring(0, 10)}...
                    </a>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AllTransactionsTable; 