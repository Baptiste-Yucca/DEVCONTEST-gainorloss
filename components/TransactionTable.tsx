import React from 'react';
import { Transaction } from '../utils/api';
import { formatAmount, formatTimestamp } from '../utils/helpers';
import { TOKENS, ADDRESS_SC_TO_TOKEN } from '../utils/constants';

type TransactionTableProps = {
  transactions: Transaction[];
  title: string;
};

const TransactionTable: React.FC<TransactionTableProps> = ({ transactions, title }) => {
  if (!transactions || transactions.length === 0) {
    return (
      <div className="mt-6">
        <h2 className="text-xl font-semibold mb-4">{title} (0)</h2>
        <p className="text-gray-500">Aucune transaction trouvée</p>
      </div>
    );
  }

  const getTokenSymbol = (reserveId: string): string => {
    // La réserve contient l'adresse du token au début (longueur EVM = 42 caractères)
    const tokenAddress = reserveId.substring(0, 42).toLowerCase();
    const tokenKey = ADDRESS_SC_TO_TOKEN[tokenAddress];
    return tokenKey ? TOKENS[tokenKey].symbol : 'Inconnu';
  };

  return (
    <div className="mt-6">
      <h2 className="text-xl font-semibold mb-4">{title} ({transactions.length})</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                #
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
            {transactions.map((tx, index) => {
              const tokenSymbol = getTokenSymbol(tx.reserve.id);
              
              return (
                <tr key={tx.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    #{index + 1}
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

export default TransactionTable; 