import React from 'react';

const Header: React.FC = () => {
  return (
    <header className="bg-indigo-600 text-white p-4 shadow-md">
      <div className="container mx-auto flex justify-between items-center">
        <h1 className="text-2xl font-bold">rmmgain</h1>
        <span className="text-sm">Blockchain Gnosis</span>
      </div>
    </header>
  );
};

export default Header; 