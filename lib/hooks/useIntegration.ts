'use client';

import { useState, useCallback } from 'react';
import type { PlatformId, ConnectionStatus } from '@/lib/types/integrations';

interface UseIntegrationOptions {
  onSuccess?: (platform: PlatformId) => void;
  onError?: (platform: PlatformId, error: string) => void;
}

interface UseIntegrationReturn {
  connect: (platform: PlatformId) => Promise<void>;
  disconnect: (platform: PlatformId) => Promise<void>;
  isConnecting: PlatformId | null;
  isDisconnecting: PlatformId | null;
  error: string | null;
}

// Map platform IDs to OAuth provider IDs
const platformToProvider: Record<PlatformId, string> = {
  meta: 'meta',
  tiktok: 'tiktok',
  youtube: 'google', // YouTube uses Google OAuth
  twitter: 'x',
  linkedin: 'linkedin',
  snapchat: 'snapchat',
  pinterest: 'pinterest', // Coming soon
  discord: 'discord', // Coming soon
};

export function useIntegration(options: UseIntegrationOptions = {}): UseIntegrationReturn {
  const [isConnecting, setIsConnecting] = useState<PlatformId | null>(null);
  const [isDisconnecting, setIsDisconnecting] = useState<PlatformId | null>(null);
  const [error, setError] = useState<string | null>(null);

  const connect = useCallback(async (platform: PlatformId) => {
    setIsConnecting(platform);
    setError(null);

    try {
      const provider = platformToProvider[platform];

      // Open OAuth popup - redirect directly to start endpoint
      const width = 600;
      const height = 700;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;

      const popup = window.open(
        `/api/auth/${provider}/start`,
        `${platform}-oauth`,
        `width=${width},height=${height},left=${left},top=${top},popup=1`
      );

      // Poll for popup close and check URL for success/error
      const checkClosed = setInterval(() => {
        try {
          // Check if popup navigated back to our domain with success/error
          if (popup?.location?.href?.includes('/settings/integrations')) {
            const url = new URL(popup.location.href);
            const connected = url.searchParams.get('connected');
            const errorCode = url.searchParams.get('error');

            clearInterval(checkClosed);
            popup.close();
            setIsConnecting(null);

            if (connected) {
              options.onSuccess?.(platform);
            } else if (errorCode) {
              const errorMsg = `Connection failed: ${errorCode}`;
              setError(errorMsg);
              options.onError?.(platform, errorMsg);
            }
          }
        } catch {
          // Cross-origin error - popup is on provider's domain, keep polling
        }

        if (popup?.closed) {
          clearInterval(checkClosed);
          setIsConnecting(null);
        }
      }, 500);

    } catch (err) {
      setIsConnecting(null);
      const message = err instanceof Error ? err.message : 'Connection failed';
      setError(message);
      options.onError?.(platform, message);
    }
  }, [options]);

  const disconnect = useCallback(async (platform: PlatformId) => {
    setIsDisconnecting(platform);
    setError(null);

    try {
      const provider = platformToProvider[platform];

      const response = await fetch(`/api/auth/${provider}/disconnect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to disconnect');
      }

      setIsDisconnecting(null);
      options.onSuccess?.(platform);
    } catch (err) {
      setIsDisconnecting(null);
      const message = err instanceof Error ? err.message : 'Disconnect failed';
      setError(message);
      options.onError?.(platform, message);
    }
  }, [options]);

  return {
    connect,
    disconnect,
    isConnecting,
    isDisconnecting,
    error,
  };
}

// Hook to fetch connection statuses
export function useConnectionStatuses() {
  const [statuses, setStatuses] = useState<Record<PlatformId, ConnectionStatus>>({
    meta: { connected: false },
    tiktok: { connected: false },
    youtube: { connected: false },
    twitter: { connected: false },
    linkedin: { connected: false },
    snapchat: { connected: false },
    pinterest: { connected: false },
    discord: { connected: false },
  });
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch('/api/integrations/status');
      if (response.ok) {
        const data = await response.json();
        setStatuses(data.statuses);
      }
    } catch {
      // Keep existing statuses on error
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { statuses, isLoading, refresh, setStatuses };
}

export default useIntegration;
