'use client';

import { useEffect, useState } from 'react';
import userInfo from 'fingerprint-oss';

let fingerprintCache: { visitorId: string; data: any } | null = null;

/**
 * Hook to get and store user fingerprint
 */
export function useFingerprint() {
  const [fingerprint, setFingerprint] = useState<{ visitorId: string; data: any } | null>(fingerprintCache);
  const [isLoading, setIsLoading] = useState(!fingerprintCache);

  useEffect(() => {
    if (fingerprintCache) {
      return;
    }

    const fetchFingerprint = async () => {
      try {
        setIsLoading(true);
        const data = await userInfo({
          transparency: true,
          message: 'We collect device information to improve your experience and ensure security.',
        });

        // fingerprint-oss returns: { hash, systemInfo, geolocation, confidenceAssessment }
        // Use hash as the visitorId (it's the unique fingerprint identifier)
        const visitorId = data.hash || `fp_${Date.now()}`;

        fingerprintCache = {
          visitorId,
          data,
        };

        setFingerprint(fingerprintCache);

        // Store visitor ID in localStorage for API client
        try {
          localStorage.setItem('visitorId', fingerprintCache.visitorId);
        } catch (error) {
          console.error('Failed to store visitor ID:', error);
        }

        // Send to backend
        try {
          await fetch('/api/fingerprint', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              visitorId: fingerprintCache.visitorId,
              fingerprintData: data,
            }),
          });
        } catch (error) {
          console.error('Failed to store fingerprint:', error);
          // Don't fail the hook if backend storage fails
        }
      } catch (error) {
        console.error('Failed to get fingerprint:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFingerprint();
  }, []);

  return { fingerprint, isLoading };
}

