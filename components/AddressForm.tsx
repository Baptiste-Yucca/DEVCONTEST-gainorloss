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
    <div className="w-full max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="address" className="block text-sm font-medium text-gray-700">
            Adresse de portefeuille (format EVM)
          </label>
          <input
            type="text"
            id="address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="0x..."
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 focus:border-indigo-500 focus:ring-indigo-500"
            aria-label="Adresse de portefeuille"
            tabIndex={0}
          />
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        </div>
        <button
          type="submit"
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          aria-label="Rechercher"
          tabIndex={0}
        >
          Rechercher
        </button>
      </form>
    </div>
  );
};

export default AddressForm; 