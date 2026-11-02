import React from 'react';

export default function Image({ src, alt, width, height, priority, className, ...props }) {
  return (
    <img
      src={src}
      alt={alt || ''}
      width={width}
      height={height}
      className={className}
      loading={priority ? 'eager' : 'lazy'}
      {...props}
    />
  );
}

export { Image };
