import { useNavigate, useLocation, useParams as useRouterParams } from 'react-router-dom';

export function useRouter() {
  const navigate = useNavigate();
  return {
    push: (url: string) => navigate(url),
    replace: (url: string) => navigate(url, { replace: true }),
    back: () => navigate(-1),
    forward: () => navigate(1),
    prefetch: () => {},
  };
}

export function usePathname() {
  const location = useLocation();
  return location.pathname;
}

export function useParams<T = any>() {
  return useRouterParams() as T;
}

export function useSearchParams() {
  const location = useLocation();
  return new URLSearchParams(location.search);
}
