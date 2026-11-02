import React from 'react';

export default function dynamic(loader: () => Promise<any>, options: any = {}) {
  const LazyComponent = React.lazy(loader);
  return function DynamicComponent(props: any) {
    return (
      <React.Suspense fallback={options.loading ? <options.loading /> : null}>
        <LazyComponent {...props} />
      </React.Suspense>
    );
  };
}
