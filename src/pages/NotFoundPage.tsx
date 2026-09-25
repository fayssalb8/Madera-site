import { type FC } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';

export const NotFoundPage: FC = () => {
  return (
    <>
      <Helmet>
        <meta name="robots" content="noindex, nofollow" />
        <title>404 — Page non trouvée | Madera Kitchen</title>
      </Helmet>
      <div className="min-h-screen flex items-center justify-center bg-bg px-4">
        <div className="text-center">
          <p className="text-6xl font-bold text-primary-500 mb-4">404</p>
          <h1 className="text-2xl font-bold text-text-primary mb-2">Page non trouvée</h1>
          <p className="text-text-secondary mb-6">La page que vous cherchez n'existe pas.</p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary-500 text-white font-semibold hover:bg-primary-600 transition-colors cursor-pointer"
          >
            Retour à l'accueil
          </Link>
        </div>
      </div>
    </>
  );
};
