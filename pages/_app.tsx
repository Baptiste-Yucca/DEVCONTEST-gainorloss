import '../styles/globals.css';
import type { AppProps } from 'next/app';
import { useEffect } from 'react';

export default function App({ Component, pageProps }: AppProps) {
  useEffect(() => {
    // Supprimer le style de focus par défaut
    const style = document.createElement('style');
    style.innerHTML = `
      *:focus {
        outline: none !important;
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <Component {...pageProps} />
    </div>
  );
} 