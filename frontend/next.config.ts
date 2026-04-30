import path from 'node:path';
import type { NextConfig } from 'next';

const frontendNodeModules = path.resolve(__dirname, 'node_modules');
const moduleFromFrontend = (modulePath: string) => path.join(frontendNodeModules, modulePath);

const nextConfig: NextConfig = {
  // Backend-owned route handlers live outside frontend/ and are re-exported by
  // app/api routes. This lets Next compile those route handlers while still
  // keeping the source tree separated by bounded contexts.
  experimental: {
    externalDir: true,
  },
  outputFileTracingRoot: path.resolve(__dirname, '..'),
  webpack: (config) => {
    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...(config.resolve.alias || {}),

      // Exact aliases are intentional. A broad alias like `react` or `next` can
      // also catch Next's own dev/runtime internals and create duplicate React
      // singletons, which leads to invalid hook calls in Next devtools.
      'react$': moduleFromFrontend('react'),
      'react/jsx-runtime$': moduleFromFrontend('react/jsx-runtime.js'),
      'react/jsx-dev-runtime$': moduleFromFrontend('react/jsx-dev-runtime.js'),
      'react-dom$': moduleFromFrontend('react-dom'),
      'react-dom/client$': moduleFromFrontend('react-dom/client.js'),
      'react-dom/server$': moduleFromFrontend('react-dom/server.node.js'),

      '@supabase/ssr': moduleFromFrontend('@supabase/ssr'),
      '@supabase/supabase-js': moduleFromFrontend('@supabase/supabase-js'),
      '@next/env': moduleFromFrontend('@next/env'),
      zod: moduleFromFrontend('zod'),
      clsx: moduleFromFrontend('clsx'),
      'lucide-react': moduleFromFrontend('lucide-react'),

      // External backend files import these Next entrypoints. Alias only the
      // public entrypoints that the backend uses, not the entire `next` package.
      'next/cache$': moduleFromFrontend('next/cache'),
      'next/headers$': moduleFromFrontend('next/headers'),
      'next/server$': moduleFromFrontend('next/server'),
      'next/navigation$': moduleFromFrontend('next/navigation'),
      'next/link$': moduleFromFrontend('next/link'),
    };

    return config;
  },
};

export default nextConfig;

