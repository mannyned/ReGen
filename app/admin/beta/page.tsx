'use client';

import { useState, useEffect } from 'react';

interface BetaUser {
  id: string;
  email: string;
  tier: string;
  betaExpiresAt: string | null;
  daysRemaining: number;
  isExpired: boolean;
}

interface BetaListResponse {
  success: boolean;
  count: number;
  activeCount: number;
  expiredCount: number;
  users: BetaUser[];
}

interface AssignResponse {
  success: boolean;
  assigned: number;
  skipped: number;
  notFound: string[];
  expiresAt: string;
}

export default function AdminBetaPage() {
  const [apiKey, setApiKey] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Beta users list
  const [betaUsers, setBetaUsers] = useState<BetaUser[]>([]);
  const [activeCount, setActiveCount] = useState(0);
  const [expiredCount, setExpiredCount] = useState(0);

  // Form state
  const [emails, setEmails] = useState('');
  const [durationDays, setDurationDays] = useState(30);

  // Check for stored API key on mount
  useEffect(() => {
    const storedKey = sessionStorage.getItem('admin_api_key');
    if (storedKey) {
      setApiKey(storedKey);
      setIsAuthenticated(true);
    }
  }, []);

  // Fetch beta users when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchBetaUsers();
    }
  }, [isAuthenticated]);

  const fetchBetaUsers = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/beta', {
        headers: {
          'x-admin-key': apiKey,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          setIsAuthenticated(false);
          sessionStorage.removeItem('admin_api_key');
          throw new Error('Invalid API key');
        }
        throw new Error('Failed to fetch beta users');
      }

      const data: BetaListResponse = await response.json();
      setBetaUsers(data.users);
      setActiveCount(data.activeCount);
      setExpiredCount(data.expiredCount);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (apiKey.trim()) {
      sessionStorage.setItem('admin_api_key', apiKey);
      setIsAuthenticated(true);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('admin_api_key');
    setApiKey('');
    setIsAuthenticated(false);
    setBetaUsers([]);
  };

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    const emailList = emails
      .split(/[,\n]/)
      .map(e => e.trim())
      .filter(e => e.length > 0);

    if (emailList.length === 0) {
      setError('Please enter at least one email');
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/admin/beta', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': apiKey,
        },
        body: JSON.stringify({
          emails: emailList,
          durationDays,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to assign beta access');
      }

      const data: AssignResponse = await response.json();

      let message = `Assigned ${data.assigned} user(s) beta access.`;
      if (data.skipped > 0) {
        message += ` ${data.skipped} already had beta access.`;
      }
      if (data.notFound.length > 0) {
        message += ` Not found: ${data.notFound.join(', ')}`;
      }

      setSuccess(message);
      setEmails('');
      fetchBetaUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRevoke = async (email: string) => {
    if (!confirm(`Revoke beta access for ${email}?`)) {
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/admin/beta', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': apiKey,
        },
        body: JSON.stringify({
          emails: [email],
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to revoke beta access');
      }

      setSuccess(`Revoked beta access for ${email}`);
      fetchBetaUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRevokeAll = async () => {
    if (!confirm('Revoke beta access for ALL users? This cannot be undone.')) {
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/admin/beta', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': apiKey,
        },
        body: JSON.stringify({
          all: true,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to revoke all beta access');
      }

      const data = await response.json();
      setSuccess(`Revoked beta access for ${data.revoked} user(s)`);
      fetchBetaUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Login screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Beta Admin
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Enter your admin API key to manage beta users.
          </p>

          <form onSubmit={handleLogin}>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Admin API Key"
              className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white mb-4 focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              required
            />

            {error && (
              <p className="text-red-600 dark:text-red-400 text-sm mb-4">{error}</p>
            )}

            <button
              type="submit"
              className="w-full py-3 bg-violet-600 hover:bg-violet-700 text-white font-medium rounded-lg transition-colors"
            >
              Login
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Admin dashboard
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Beta Pro Admin
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Manage beta access for creators
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            Logout
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
            <p className="text-3xl font-bold text-gray-900 dark:text-white">
              {betaUsers.length}
            </p>
            <p className="text-gray-600 dark:text-gray-400 text-sm">Total Beta Users</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
            <p className="text-3xl font-bold text-green-600">{activeCount}</p>
            <p className="text-gray-600 dark:text-gray-400 text-sm">Active</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
            <p className="text-3xl font-bold text-orange-600">{expiredCount}</p>
            <p className="text-gray-600 dark:text-gray-400 text-sm">Expired</p>
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
            <p className="text-red-800 dark:text-red-300">{error}</p>
          </div>
        )}

        {success && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-6">
            <p className="text-green-800 dark:text-green-300">{success}</p>
          </div>
        )}

        {/* Assign Form */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Assign Beta Access
          </h2>

          <form onSubmit={handleAssign}>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Email Addresses
              </label>
              <textarea
                value={emails}
                onChange={(e) => setEmails(e.target.value)}
                placeholder="Enter emails (one per line or comma-separated)"
                rows={3}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Duration (days)
              </label>
              <input
                type="number"
                value={durationDays}
                onChange={(e) => setDurationDays(parseInt(e.target.value) || 30)}
                min={1}
                max={365}
                className="w-32 px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="px-6 py-3 bg-violet-600 hover:bg-violet-700 disabled:bg-violet-400 text-white font-medium rounded-lg transition-colors"
            >
              {isLoading ? 'Assigning...' : 'Assign Beta Access'}
            </button>
          </form>
        </div>

        {/* Beta Users List */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Beta Users
            </h2>
            {betaUsers.length > 0 && (
              <button
                onClick={handleRevokeAll}
                disabled={isLoading}
                className="text-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
              >
                Revoke All
              </button>
            )}
          </div>

          {isLoading && betaUsers.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-center py-8">
              Loading...
            </p>
          ) : betaUsers.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-center py-8">
              No beta users yet. Assign beta access using the form above.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-3 px-2 text-sm font-medium text-gray-600 dark:text-gray-400">
                      Email
                    </th>
                    <th className="text-left py-3 px-2 text-sm font-medium text-gray-600 dark:text-gray-400">
                      Tier
                    </th>
                    <th className="text-left py-3 px-2 text-sm font-medium text-gray-600 dark:text-gray-400">
                      Expires
                    </th>
                    <th className="text-left py-3 px-2 text-sm font-medium text-gray-600 dark:text-gray-400">
                      Status
                    </th>
                    <th className="text-right py-3 px-2 text-sm font-medium text-gray-600 dark:text-gray-400">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {betaUsers.map((user) => (
                    <tr
                      key={user.id}
                      className="border-b border-gray-100 dark:border-gray-700/50"
                    >
                      <td className="py-3 px-2 text-gray-900 dark:text-white">
                        {user.email}
                      </td>
                      <td className="py-3 px-2 text-gray-600 dark:text-gray-400">
                        {user.tier}
                      </td>
                      <td className="py-3 px-2 text-gray-600 dark:text-gray-400">
                        {formatDate(user.betaExpiresAt)}
                      </td>
                      <td className="py-3 px-2">
                        {user.isExpired ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                            Expired
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                            {user.daysRemaining}d left
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-2 text-right">
                        <button
                          onClick={() => handleRevoke(user.email)}
                          disabled={isLoading}
                          className="text-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                        >
                          Revoke
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={fetchBetaUsers}
              disabled={isLoading}
              className="text-sm text-violet-600 hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-300"
            >
              {isLoading ? 'Refreshing...' : 'Refresh List'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
