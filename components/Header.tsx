import React from 'react';

const Header: React.FC = () => {
  return (
    <header className="bg-indigo-600 text-white p-4 shadow-md">
      <div className="container mx-auto flex justify-between items-center">
        <h1 className="text-2xl font-bold">rmmgain</h1>
        <div className="flex items-center">
          <div className="text-xs mr-4 text-right">
            <p>Ne fonctionne que sur l'USDC et Gnosis</p>
            <p>Si vous voulez plus de fonctionnalités,</p>
            <p>dites-le moi sous une de mes vidéos</p>
          </div>
          <a 
            href="https://www.youtube.com/@YesYuccan?sub_confirmation=1" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-white hover:text-red-300 transition-colors text-xs font-medium underline"
            aria-label="Chaîne YouTube YesYuccan"
            tabIndex={0}
          >
            Cliques ici !
          </a>
        </div>
      </div>
    </header>
  );
};

export default Header; 