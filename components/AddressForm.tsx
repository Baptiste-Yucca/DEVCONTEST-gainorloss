import React from 'react';
import { AddressFormProps } from '../types/wallet';

const AddressForm: React.FC<AddressFormProps> = ({
  wallets,
  onAddressChange,
  onAddWallet,
  onRemoveWallet,
  onSubmit,
  isLoading
}) => {
  const isValidEVMAddress = (address: string): boolean => {
    if (!address) return false;
    // Vérification basique d'une adresse EVM (0x + 40 caractères hexadécimaux)
    const evmAddressRegex = /^0x[a-fA-F0-9]{40}$/;
    return evmAddressRegex.test(address);
  };

  const getAddressValidationMessage = (address: string): string => {
    if (!address) return '';
    if (!isValidEVMAddress(address)) {
      return 'Adresse EVM invalide (format: 0x... + 40 caractères hexadécimaux)';
    }
    return '';
  };

  const canSubmit = wallets.some(addr => isValidEVMAddress(addr));

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-8">
      <h2 className="text-2xl font-semibold text-gray-900 mb-6">
        Adresses de portefeuille
      </h2>
      
      <div className="space-y-4">
        {wallets.map((address, index) => (
          <div key={index} className="flex items-center space-x-3">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Adresse {index + 1}
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => onAddressChange(index, e.target.value)}
                placeholder="0x..."
                className={`w-full px-3 py-2 border rounded-md focus:outline-none ${
                  address && !isValidEVMAddress(address)
                    ? 'border-red-300 focus:border-red-500'
                    : 'border-gray-300 focus:border-blue-500'
                }`}
                disabled={isLoading}
              />
              {address && (
                <p className={`text-sm mt-1 ${
                  isValidEVMAddress(address) ? 'text-green-600' : 'text-red-600'
                }`}>
                  {getAddressValidationMessage(address)}
                </p>
              )}
            </div>
            
            {wallets.length > 1 && (
              <button
                onClick={() => onRemoveWallet(index)}
                disabled={isLoading}
                className="mt-6 px-3 py-2 text-red-600 hover:text-red-800 disabled:opacity-50"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            )}
          </div>
        ))}
        
        {wallets.length < 3 && (
          <button
            onClick={onAddWallet}
            disabled={isLoading}
            className="flex items-center space-x-2 text-blue-600 hover:text-blue-800 disabled:opacity-50"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            <span>Ajouter une adresse</span>
          </button>
        )}
      </div>
      
      <div className="mt-6">
        <button
          onClick={onSubmit}
          disabled={!canSubmit || isLoading}
          className={`w-full py-3 px-4 rounded-md font-medium transition-colors ${
            canSubmit && !isLoading
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          {isLoading ? (
            <div className="flex items-center justify-center space-x-2">
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Chargement...</span>
            </div>
          ) : (
            'Analyser les portefeuilles'
          )}
        </button>
      </div>
    </div>
  );
};

export default AddressForm; 