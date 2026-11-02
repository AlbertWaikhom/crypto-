import Link from 'next/link';
import { ArrowLeft, Compass } from 'lucide-react';
import { BRAND_CONFIG } from '@navrix/config';
import { Button } from '@navrix/ui';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-950 text-slate-100 text-center font-sans">
      <div className="w-14 h-14 rounded-2xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-amber-400 mb-4 mx-auto">
        <Compass className="h-7 w-7" />
      </div>
      <h1 className="text-3xl font-extrabold tracking-tight">404 — Page Not Found</h1>
      <p className="text-sm text-slate-400 max-w-md mx-auto mt-2 mb-6 leading-relaxed">
        The requested resource does not exist or has been moved within the {BRAND_CONFIG.name} ecosystem.
      </p>
      <Link href="/">
        <Button variant="gold" size="md">
          <ArrowLeft className="h-4 w-4 mr-1.5" />
          Return to Ecosystem Home
        </Button>
      </Link>
    </div>
  );
}

