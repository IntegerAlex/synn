"use client";

import { useEffect } from "react";

/**
 * Hook to collect and store device fingerprint data
 * Runs once on component mount
 */
export function useFingerprint() {
  useEffect(() => {
    const fetchFingerprint = async () => {
      try {
        // Lazy-load the fingerprint library (large) so it is not part of the
        // initial /app bundle. Tracking is optional and can happen after mount.
        const { default: userInfo } = await import("fingerprint-oss");

        // Get fingerprint data from fingerprint-oss
        const data = await userInfo();

        // Extract visitor ID from hash (fingerprint-oss returns hash as unique identifier)
        const visitorId = data.hash;

        if (!visitorId) {
          console.warn("No visitor ID found in fingerprint data");
          return;
        }

        // Store visitor ID in localStorage for API requests
        localStorage.setItem("visitorId", visitorId);

        // Send fingerprint data to backend
        try {
          const response = await fetch("/api/fingerprint", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              visitorId,
              fingerprintData: data,
            }),
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            // Don't log errors if table doesn't exist - it's expected during development
            if (!errorData.warning) {
              console.warn(
                "Failed to store fingerprint:",
                errorData.error?.message || "Unknown error",
              );
            }
          }
        } catch (fetchError) {
          // Silently fail - fingerprint tracking is optional
          console.warn("Failed to send fingerprint data:", fetchError);
        }
      } catch (error) {
        // Silently fail - fingerprint tracking is optional
        console.warn("Failed to collect fingerprint:", error);
      }
    };

    fetchFingerprint();
  }, []); // Run only once on mount
}
