'use client';
import * as React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useUiStore } from '../store/ui-store';
import { ToastProvider } from './ToastProvider';
import { ScrollToTopOnNav } from './ScrollToTopOnNav';

export function Providers({ children }) {
  const [queryClient] = React.useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 15_000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  React.useEffect(() => {
    useUiStore.getState().hydrate();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <ScrollToTopOnNav />
        {children}
      </ToastProvider>
    </QueryClientProvider>
  );
}
