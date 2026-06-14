'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';

export default function StripeConnectButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConnect = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/stripe/connect', {
        method: 'POST',
        credentials: 'include',
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? 'Failed to start bank connection. Please try again.');
        return;
      }

      if (!data.url) {
        setError('No redirect URL received from Stripe. Please try again.');
        return;
      }

      // Redirect to Stripe onboarding
      window.location.href = data.url;
    } catch {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-start gap-2">
      <Button
        variant="primary"
        size="md"
        loading={loading}
        onClick={handleConnect}
        className="bg-amber-600 hover:bg-amber-700 focus:ring-amber-500 border-transparent whitespace-nowrap"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
        Connect Bank Account
      </Button>
      {error && (
        <p className="text-xs text-red-600">{error}</p>
      )}
    </div>
  );
}
