import React from 'react';

export default function dynamic(loader, options = {}) {
  const LazyComponent = React.lazy(loader);
  return function DynamicWrapper(props) {
    return (
      <React.Suspense fallback={<div className="opacity-0">Loading...</div>}>
        <LazyComponent {...props} />
      </React.Suspense>
    );
  };
}
