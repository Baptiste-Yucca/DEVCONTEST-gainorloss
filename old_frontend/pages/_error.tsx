import { NextPage } from 'next';
import { ErrorProps } from 'next/error';
import { NextPageContext } from 'next';

interface CustomErrorProps {
  statusCode?: number;
}

const CustomError: NextPage<CustomErrorProps> = ({ statusCode }) => {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-red-600 mb-4">
          {statusCode ? `Erreur ${statusCode}` : 'Une erreur est survenue'}
        </h1>
        <p className="text-lg text-gray-700 mb-6">
          {statusCode
            ? `Une erreur ${statusCode} s'est produite sur le serveur`
            : 'Une erreur s\'est produite sur le client'}
        </p>
        <button
          onClick={() => window.location.href = '/'}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Retour à l'accueil
        </button>
      </div>
    </div>
  );
};

CustomError.getInitialProps = ({ res, err }: NextPageContext): CustomErrorProps => {
  const statusCode = res ? res.statusCode : err ? (err as any).statusCode : 404;
  return { statusCode };
};

export default CustomError; 