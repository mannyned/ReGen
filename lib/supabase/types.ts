/**
 * Supabase Database Types
 *
 * This file contains TypeScript types for the Supabase database schema.
 * These types provide autocompletion and type safety when working with
 * Supabase queries.
 *
 * To generate types automatically from your database:
 * ```bash
 * npx supabase gen types typescript --project-id YOUR_PROJECT_ID > lib/supabase/types.ts
 * ```
 *
 * For now, we define types manually to match our schema.
 */

/**
 * User tier/subscription levels
 */
export type UserTier = 'free' | 'creator' | 'pro';

/**
 * Profile record from the profiles table
 */
export interface Profile {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  tier: UserTier;
  created_at: string;
  updated_at: string;
}

/**
 * Database schema types for Supabase client
 *
 * This structure enables type-safe queries:
 * ```ts
 * const { data } = await supabase
 *   .from('profiles')
 *   .select('*')
 *   .single();
 * // data is typed as Profile
 * ```
 */
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, 'created_at' | 'updated_at'> & {
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<Profile, 'id' | 'created_at'>> & {
          updated_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      user_tier: UserTier;
    };
  };
}

/**
 * Helper type to extract row type from a table
 */
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];

/**
 * Helper type for insert operations
 */
export type TablesInsert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert'];

/**
 * Helper type for update operations
 */
export type TablesUpdate<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update'];
