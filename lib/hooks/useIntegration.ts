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

export function useIntegration(options: UseIntegrationOptions = {}): UseIntegrationReturn {
  const [isConnecting, setIsConnecting] = useState<PlatformId | null>(null);
  const [isDisconnecting, setIsDisconnecting] = useState<PlatformId | null>(null);
  const [error, setError] = useState<string | null>(null);

  const connect = useCallback(async (platform: PlatformId) => {
    setIsConnecting(platform);
    setError(null);

    try {
      // Initiate OAuth flow
      const response = await fetch(`/api/integrations/${platform}/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to initiate connection');
      }

      const { authUrl } = await response.json();

      // Open OAuth popup or redirect
      const width = 600;
      const height = 700;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;

      const popup = window.open(
        authUrl,
        `${platform}-oauth`,
        `width=${width},height=${height},left=${left},top=${top},popup=1`
      );

      // Listen for OAuth callback
      const handleMessage = (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return;

        if (event.data?.type === 'oauth-success' && event.data?.platform === platform) {
          window.removeEventListener('message', handleMessage);
          setIsConnecting(null);
          options.onSuccess?.(platform);
        }

        if (event.data?.type === 'oauth-error' && event.data?.platform === platform) {
          window.removeEventListener('message', handleMessage);
          setIsConnecting(null);
          setError(event.data.error || 'Connection failed');
          options.onError?.(platform, event.data.error);
        }
      };

      window.addEventListener('message', handleMessage);

      // Poll for popup close (user cancelled)
      const checkClosed = setInterval(() => {
        if (popup?.closed) {
          clearInterval(checkClosed);
          window.removeEventListener('message', handleMessage);
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
      const response = await fetch(`/api/integrations/${platform}/disconnect`, {
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
