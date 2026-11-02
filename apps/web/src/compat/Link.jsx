import React from 'react';
import { Link as RouterLink } from 'react-router-dom';

export default function Link({ href, children, prefetch, ...props }) {
  return (
    <RouterLink to={href} {...props}>
      {children}
    </RouterLink>
  );
}

export { Link };
