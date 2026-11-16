import { useEffect } from 'react';

/**
 * Owns `document.title` for a mounted view. Admin routes are rendered by a
 * client-side router, so without this the title would keep whatever the
 * previous page (or the static HTML shell) set.
 */
export default function useDocumentTitle(title) {
  useEffect(() => {
    if (typeof document === 'undefined' || typeof title !== 'string' || title.length === 0) {
      return;
    }
    document.title = title;
  }, [title]);
}
