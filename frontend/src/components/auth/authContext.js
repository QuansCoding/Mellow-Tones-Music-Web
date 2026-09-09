import { createContext, useContext } from 'react';

/**
 * Who is signed in.
 *
 * The library is keyed off this: it re-fetches when the user changes and
 * clears when they sign out. That is the actual fix for one account seeing
 * another's data, because localStorage was keyed by browser, not identity.
 */
export const AuthContext = createContext(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
