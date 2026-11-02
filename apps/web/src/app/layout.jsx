import { Inter } from 'next/font/google';
import { BRAND_CONFIG } from '@navrix/config';
import { Providers } from '../components/Providers';
import './globals.css';
const sfFallback = Inter({
  subsets: ['latin'],
  variable: '--font-sf-fallback',
  display: 'swap',
});
export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#070b14' },
    { media: '(prefers-color-scheme: light)', color: '#f4f6fb' },
  ],
};
export const metadata = {
  title: `${BRAND_CONFIG.name} — ${BRAND_CONFIG.tagline}`,
  description: BRAND_CONFIG.subTagline,
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: BRAND_CONFIG.name,
  },
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180' }],
  },
};
export default function RootLayout({ children }) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Auto-recover from stale chunks or bundler runtime mismatch (e.g. dev server restarts)
              if (typeof window !== 'undefined') {
                window.addEventListener('error', function(e) {
                  var msg = (e && e.message) ? e.message : '';
                  if (
                    msg.includes('Loading chunk') ||
                    msg.includes('ChunkLoadError') ||
                    msg.includes('React Client Manifest') ||
                    msg.includes('Failed to fetch dynamically imported module')
                  ) {
                    var lastReload = sessionStorage.getItem('nv_last_chunk_reload');
                    var now = Date.now();
                    if (!lastReload || (now - parseInt(lastReload, 10)) > 10000) {
                      sessionStorage.setItem('nv_last_chunk_reload', String(now));
                      window.location.reload();
                    }
                  }
                });
                window.addEventListener('unhandledrejection', function(e) {
                  var msg = (e && e.reason && e.reason.message) ? e.reason.message : '';
                  if (
                    msg.includes('Loading chunk') ||
                    msg.includes('ChunkLoadError') ||
                    msg.includes('React Client Manifest') ||
                    msg.includes('Failed to fetch dynamically imported module')
                  ) {
                    var lastReload = sessionStorage.getItem('nv_last_chunk_reload');
                    var now = Date.now();
                    if (!lastReload || (now - parseInt(lastReload, 10)) > 10000) {
                      sessionStorage.setItem('nv_last_chunk_reload', String(now));
                      window.location.reload();
                    }
                  }
                });
              }
            `,
          }}
        />
      </head>
      <body className={`${sfFallback.variable} font-sans antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
