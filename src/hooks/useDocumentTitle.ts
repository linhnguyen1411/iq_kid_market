import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { titleForPath } from '../routes/paths';

/** Cập nhật document.title theo route (SEO cơ bản). */
export function useDocumentTitle(override?: string) {
  const { pathname } = useLocation();
  useEffect(() => {
    document.title = override || titleForPath(pathname);
  }, [pathname, override]);
}
