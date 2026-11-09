import * as React from 'react';
import { useNavigate, useLocation, useParams as useRouterParams } from 'react-router-dom';

export function useRouter() {
  const navigate = useNavigate();
  return React.useMemo(
    () => ({
      push: (url) => navigate(url),
      replace: (url) => navigate(url, { replace: true }),
      back: () => navigate(-1),
      forward: () => navigate(1),
      prefetch: () => {},
    }),
    [navigate],
  );
}

export function usePathname() {
  const location = useLocation();
  return location.pathname;
}

export function useParams() {
  return useRouterParams();
}

export function useSearchParams() {
  const location = useLocation();
  return new URLSearchParams(location.search);
}
