'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';

/**
 * Universal Scroll-To-Top on Route Navigation
 * Ensures that whenever a user navigates to a new page (both public site & authenticated portal),
 * the window and all internal scroll containers immediately reset to (0, 0).
 */
export function ScrollToTopOnNav() {
  const pathname = usePathname();

  React.useEffect(() => {
    // 1. Reset standard window and document scrolling
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;

      // 2. Reset any portal or custom scroll containers
      const scrollContainers = document.querySelectorAll(
        'main, [class*="contentScrollArea"], [class*="mainContent"], [class*="pageRoot"], #portal-scroll-container',
      );
      scrollContainers.forEach((el) => {
        if (el && el.scrollTop > 0) {
          el.scrollTop = 0;
        }
      });
    }
  }, [pathname]);

  return null;
}

export default ScrollToTopOnNav;
