import { createContext, useContext, useEffect, useState } from 'react';
import { EMPTY_PORTFOLIO, fetchPortfolio } from './api/portfolio.js';

const PortfolioContext = createContext(null);

export const PORTFOLIO_STATUS = Object.freeze({
  loading: 'loading',
  ready: 'ready',
  unavailable: 'unavailable',
});

/**
 * Renders the approved profile copy immediately, but keeps database-managed
 * projects and skills empty until GET /api/portfolio confirms their current
 * state. A failed request leaves them empty rather than reviving bundled seed
 * data that may now be unpublished or deleted.
 */
export function PortfolioProvider({ children }) {
  const [content, setContent] = useState(EMPTY_PORTFOLIO);
  const [status, setStatus] = useState(PORTFOLIO_STATUS.loading);

  useEffect(() => {
    const controller = new AbortController();
    let isCurrent = true;

    fetchPortfolio({ signal: controller.signal })
      .then((apiContent) => {
        if (isCurrent) {
          setContent(apiContent);
          setStatus(PORTFOLIO_STATUS.ready);
        }
      })
      .catch((error) => {
        if (!isCurrent || error?.name === 'AbortError') {
          return;
        }

        setStatus(PORTFOLIO_STATUS.unavailable);

        // One concise, secret-free diagnostic in development only. There is no
        // automatic retry loop; the public page shows a stable unavailable state.
        if (import.meta.env.DEV) {
          console.warn(
            '[portfolio] API content unavailable; database-managed sections are empty.',
            error?.message ?? 'Unknown error',
          );
        }
      });

    return () => {
      isCurrent = false;
      controller.abort();
    };
  }, []);

  return (
    <PortfolioContext.Provider value={{ ...content, status }}>{children}</PortfolioContext.Provider>
  );
}

export function usePortfolio() {
  const value = useContext(PortfolioContext);
  if (!value) {
    throw new Error('usePortfolio must be used inside PortfolioProvider.');
  }
  return value;
}
