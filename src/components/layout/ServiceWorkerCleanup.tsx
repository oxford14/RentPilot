"use client";

import React from 'react';

// This component handles the service worker cleanup.
export function ServiceWorkerCleanup() {
  React.useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker
        .getRegistrations()
        .then((registrations) => {
          for (const registration of registrations) {
            registration.unregister();
          }
        })
        .catch((err) => {
          console.error('Service Worker unregistration failed: ', err);
        });
    }
  }, []);

  return null;
}
