import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { BRAND_CONFIG } from '@navrix/config';
import { Providers } from '../components/Providers';
import './globals.css';

const sfFallback = Inter({
  subsets: ['latin'],
  variable: '--font-sf-fallback',
  display: 'swap',
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#070b14' },
    { media: '(prefers-color-scheme: light)', color: '#f4f6fb' },
  ],
};

export const metadata: Metadata = {
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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <body className={`${sfFallback.variable} font-sans antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
