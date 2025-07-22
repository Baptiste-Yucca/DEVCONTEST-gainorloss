import React from 'react';

const Loading: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center p-8 h-64">
      <div className="relative">
        <div className="w-16 h-16 border-4 border-indigo-200 border-solid rounded-full"></div>
        <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent border-solid rounded-full animate-spin absolute top-0 left-0"></div>
      </div>
      <span className="mt-4 text-indigo-600 text-lg font-medium">Chargement en cours...</span>
      <p className="text-gray-500 text-sm mt-2">Veuillez patienter pendant le calcul des intérêts</p>
    </div>
  );
};

export default Loading; 