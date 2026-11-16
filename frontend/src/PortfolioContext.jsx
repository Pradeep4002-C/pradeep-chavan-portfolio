import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { EMPTY_PORTFOLIO, fetchPortfolio } from './api/portfolio.js';

/* Exported so isolated render tests can supply a confirmed portfolio value
   without starting the public API request. */
export const PortfolioContext = createContext(null);

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
  const requestRef = useRef(null);

  /* A manual retry starts a fresh request lifecycle: abort whatever is still
     in flight, show the loading state again, and ignore any late settlement
     from the previous controller. The callback stays stable so the effect
     below runs once per mount rather than on every provider render. */
  const retry = useCallback(() => {
    requestRef.current?.abort();

    const controller = new AbortController();
    requestRef.current = controller;
    setStatus(PORTFOLIO_STATUS.loading);

    fetchPortfolio({ signal: controller.signal })
      .then((apiContent) => {
        if (requestRef.current !== controller) {
          return;
        }

        setContent(apiContent);
        setStatus(PORTFOLIO_STATUS.ready);
      })
      .catch((error) => {
        if (requestRef.current !== controller || error?.name === 'AbortError') {
          return;
        }

        setStatus(PORTFOLIO_STATUS.unavailable);

        // One concise, secret-free diagnostic in development only. The visitor
        // can retry from the unavailable panel instead of waiting for a reload.
        if (import.meta.env.DEV) {
          console.warn(
            '[portfolio] API content unavailable; database-managed sections are empty.',
            error?.message ?? 'Unknown error',
          );
        }
      });
  }, []);

  useEffect(() => {
    retry();

    return () => {
      requestRef.current?.abort();
      requestRef.current = null;
    };
  }, [retry]);

  /* A page restored from the back/forward cache keeps its old React state and
     never remounts, so it would show portfolio data captured before an admin
     edit. `max-age=0, must-revalidate` only helps requests the browser actually
     makes; a restored page makes none. Revalidate once when it is persisted. */
  useEffect(() => {
    function handlePageShow(event) {
      if (event.persisted) {
        retry();
      }
    }

    window.addEventListener('pageshow', handlePageShow);
    return () => window.removeEventListener('pageshow', handlePageShow);
  }, [retry]);

  return (
    <PortfolioContext.Provider value={{ ...content, status, retry }}>
      {children}
    </PortfolioContext.Provider>
  );
}

export function usePortfolio() {
  const value = useContext(PortfolioContext);
  if (!value) {
    throw new Error('usePortfolio must be used inside PortfolioProvider.');
  }
  return value;
}
