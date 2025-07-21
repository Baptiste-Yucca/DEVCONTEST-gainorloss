import React, { useState } from 'react';
import { isValidEthereumAddress } from '../utils/helpers';

type AddressFormProps = {
  onSubmit: (address: string) => void;
};

const AddressForm: React.FC<AddressFormProps> = ({ onSubmit }) => {
  const [address, setAddress] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!address.trim()) {
      setError('Veuillez entrer une adresse');
      return;
    }
    
    if (!isValidEthereumAddress(address)) {
      setError('Format d\'adresse EVM invalide');
      return;
    }
    
    setError('');
    onSubmit(address);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit(e);
    }
  };

  return (
    <div className="w-full p-6 bg-white rounded-xl shadow-lg border border-indigo-100 bg-gradient-to-br from-white to-indigo-50">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="address" className="block text-base font-medium text-indigo-700 mb-2">
            Donne ton adresse coco 🤑 
          </label>
          <div className="relative">
            <input
              type="text"
              id="address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="0x..."
              className="block w-full rounded-lg border-gray-300 shadow-sm p-3 focus:border-indigo-500 focus:ring-indigo-500 transition-colors duration-200 font-mono"
              aria-label="Adresse de portefeuille"
              tabIndex={0}
            />
          </div>
          {error && (
            <p className="mt-2 text-sm text-red-600 bg-red-50 p-2 rounded border border-red-200">
              ⚠️ {error}
            </p>
          )}
        </div>
        <button
          type="submit"
          className="w-full flex justify-center py-3 px-6 border border-transparent rounded-lg shadow-md text-base font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-200 transform hover:scale-[1.02]"
          aria-label="Rechercher"
          tabIndex={0}
        >
          Découvrir ma dette
        </button>
      </form>
    </div>
  );
};

export default AddressForm; 