/**
 * Environment Variable Validation
 *
 * Run this at application startup to ensure all required
 * environment variables are configured correctly.
 *
 * Usage:
 *   import '@/lib/security/env-check';
 *
 * Or run validation manually:
 *   import { validateSecurityEnv } from '@/lib/security/env-check';
 *   validateSecurityEnv();
 */

import 'server-only';

// ============================================
// ENVIRONMENT VARIABLE DEFINITIONS
// ============================================

interface EnvVar {
  name: string;
  required: boolean;
  serverOnly: boolean;
  description: string;
  example?: string;
}

const ENV_VARS: EnvVar[] = [
  // Supabase (public - can be in client bundle)
  {
    name: 'NEXT_PUBLIC_SUPABASE_URL',
    required: true,
    serverOnly: false,
    description: 'Supabase project URL',
    example: 'https://xxxxx.supabase.co',
  },
  {
    name: 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    required: true,
    serverOnly: false,
    description: 'Supabase anonymous/public key',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  },

  // Supabase (server-only - NEVER expose to client)
  {
    name: 'SUPABASE_SERVICE_ROLE_KEY',
    required: false, // Only needed for admin operations
    serverOnly: true,
    description: 'Supabase service role key (bypasses RLS)',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  },

  // Database (server-only)
  {
    name: 'DATABASE_URL',
    required: true,
    serverOnly: true,
    description: 'PostgreSQL connection string',
    example: 'postgresql://user:pass@host:5432/db',
  },

  // OAuth (server-only)
  {
    name: 'OAUTH_ENCRYPTION_KEY',
    required: true,
    serverOnly: true,
    description: 'AES-256 key for OAuth token encryption',
    example: 'Generate with: openssl rand -hex 32',
  },

  // App URL
  {
    name: 'NEXT_PUBLIC_APP_URL',
    required: false,
    serverOnly: false,
    description: 'Base URL for the application',
    example: 'https://regenr.app',
  },
];

// ============================================
// VALIDATION FUNCTIONS
// ============================================

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate all security-related environment variables
 */
export function validateSecurityEnv(): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  for (const envVar of ENV_VARS) {
    const value = process.env[envVar.name];

    // Check required variables
    if (envVar.required && !value) {
      errors.push(
        `Missing required environment variable: ${envVar.name}\n` +
        `  Description: ${envVar.description}\n` +
        (envVar.example ? `  Example: ${envVar.example}` : '')
      );
    }

    // Check server-only variables aren't prefixed with NEXT_PUBLIC_
    if (envVar.serverOnly && envVar.name.startsWith('NEXT_PUBLIC_')) {
      errors.push(
        `SECURITY VIOLATION: ${envVar.name} is marked as server-only ` +
        `but has NEXT_PUBLIC_ prefix. This will expose it to the client!`
      );
    }

    // Warn about missing optional variables
    if (!envVar.required && !value) {
      warnings.push(
        `Optional environment variable not set: ${envVar.name} ` +
        `(${envVar.description})`
      );
    }
  }

  // Additional security checks
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    // Ensure service role key is not accidentally in a NEXT_PUBLIC_ variable
    for (const key of Object.keys(process.env)) {
      if (key.startsWith('NEXT_PUBLIC_') &&
          process.env[key] === process.env.SUPABASE_SERVICE_ROLE_KEY) {
        errors.push(
          `CRITICAL SECURITY VIOLATION: Service role key is exposed in ${key}! ` +
          `This key MUST NEVER be exposed to the client.`
        );
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Run validation and throw if invalid
 */
export function requireValidEnv(): void {
  const result = validateSecurityEnv();

  if (!result.valid) {
    console.error('\n========== ENVIRONMENT VALIDATION FAILED ==========\n');
    result.errors.forEach((e) => console.error(`ERROR: ${e}\n`));
    console.error('====================================================\n');
    throw new Error('Environment validation failed. See errors above.');
  }

  if (result.warnings.length > 0 && process.env.NODE_ENV === 'development') {
    console.warn('\n========== ENVIRONMENT WARNINGS ==========\n');
    result.warnings.forEach((w) => console.warn(`WARNING: ${w}\n`));
    console.warn('==========================================\n');
  }
}

/**
 * Check if a specific server-only env var is safely configured
 */
export function isServerOnlyEnvSafe(envName: string): boolean {
  // Server-only vars should NOT start with NEXT_PUBLIC_
  if (envName.startsWith('NEXT_PUBLIC_')) {
    return false;
  }

  // Check it's not accidentally exposed in any NEXT_PUBLIC_ var
  const value = process.env[envName];
  if (!value) return true;

  for (const key of Object.keys(process.env)) {
    if (key.startsWith('NEXT_PUBLIC_') && process.env[key] === value) {
      return false;
    }
  }

  return true;
}

// ============================================
// AUTO-RUN IN DEVELOPMENT
// ============================================

// Validate on import in development
if (process.env.NODE_ENV === 'development') {
  const result = validateSecurityEnv();
  if (!result.valid) {
    console.error('\n========== SECURITY: ENV VALIDATION FAILED ==========');
    result.errors.forEach((e) => console.error(`  ${e}`));
    console.error('======================================================\n');
  }
}
