import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { BRAND_CONFIG } from '@navrix/config';
import { AdminProviders } from '../components/AdminProviders';
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
    { media: '(prefers-color-scheme: dark)', color: '#050811' },
    { media: '(prefers-color-scheme: light)', color: '#f1f5f9' },
  ],
};

export const metadata: Metadata = {
  title: `${BRAND_CONFIG.name} Admin & Master Command Center`,
  description: 'Restricted Administrative & Master Admin Monitoring Console',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: `${BRAND_CONFIG.name} Admin`,
  },
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180' }],
  },
};

export default function AdminRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <body className={`${sfFallback.variable} font-sans antialiased`}>
        <AdminProviders>{children}</AdminProviders>
      </body>
    </html>
  );
}
