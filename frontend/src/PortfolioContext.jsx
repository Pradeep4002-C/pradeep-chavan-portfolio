import { createContext, useContext, useEffect, useState } from 'react';
import { fetchPortfolio } from './api/portfolio.js';
import {
  profile as fallbackProfile,
  projects as fallbackProjects,
  skillGroups as fallbackSkillGroups,
} from './data/portfolio.js';

const PortfolioContext = createContext(null);

/**
 * Renders the bundled portfolio immediately, then replaces it with API content
 * if the public endpoint succeeds. The request never blocks first paint, and a
 * failure leaves the bundled content exactly as it was.
 */
export function PortfolioProvider({ children }) {
  const [content, setContent] = useState({
    profile: fallbackProfile,
    projects: fallbackProjects,
    skillGroups: fallbackSkillGroups,
    // Background content exists only in the database; no bundled records are
    // invented when the API is unavailable.
    education: [],
    certifications: [],
    achievements: [],
  });

  useEffect(() => {
    const controller = new AbortController();
    let isCurrent = true;

    fetchPortfolio({ signal: controller.signal })
      .then((apiContent) => {
        if (isCurrent) {
          setContent(apiContent);
        }
      })
      .catch((error) => {
        if (!isCurrent || error?.name === 'AbortError') {
          return;
        }

        // One concise, secret-free diagnostic in development only. The page
        // already shows the bundled content, so there is nothing to retry.
        if (import.meta.env.DEV) {
          console.warn(
            '[portfolio] API content unavailable; using bundled content.',
            error?.message ?? 'Unknown error',
          );
        }
      });

    return () => {
      isCurrent = false;
      controller.abort();
    };
  }, []);

  return <PortfolioContext.Provider value={content}>{children}</PortfolioContext.Provider>;
}

export function usePortfolio() {
  const value = useContext(PortfolioContext);
  if (!value) {
    throw new Error('usePortfolio must be used inside PortfolioProvider.');
  }
  return value;
}
