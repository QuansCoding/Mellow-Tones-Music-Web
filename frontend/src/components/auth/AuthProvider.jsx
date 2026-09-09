import { useCallback, useEffect, useMemo, useState } from 'react';
import { getMe } from '../../api';
import { AuthContext } from './authContext';

const storedToken = () => localStorage.getItem('token');

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  // `ready` distinguishes "not signed in" from "we have not checked yet", so a
  // reload does not flash a signed-out UI at someone who is signed in. With no
  // token there is nothing to check, so we are ready immediately.
  const [ready, setReady] = useState(() => !storedToken());

  const loadMe = useCallback(async () => {
    try {
      const { data } = await getMe();
      setUser(data);
    } catch {
      // Expired or invalid token: drop it rather than retrying forever.
      localStorage.removeItem('token');
      setUser(null);
    } finally {
      setReady(true);
    }
  }, []);

  // Resolve the stored token to a user on mount. Written as a promise chain
  // rather than a call to loadMe() so the linter can see that every setState
  // happens in an async continuation, not synchronously in the effect body.
  useEffect(() => {
    if (!storedToken()) return undefined;

    let cancelled = false;
    getMe()
      .then(({ data }) => {
        if (!cancelled) setUser(data);
      })
      .catch(() => {
        if (cancelled) return;
        localStorage.removeItem('token');
        setUser(null);
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // A 401 from any request means the session is gone. Reacting here clears the
  // user in place — and the library with it — instead of the old behaviour of
  // reloading the whole page out from under whatever the user was doing.
  useEffect(() => {
    const onUnauthorized = () => setUser(null);
    window.addEventListener('mellowtones:unauthorized', onUnauthorized);
    return () =>
      window.removeEventListener('mellowtones:unauthorized', onUnauthorized);
  }, []);

  const signIn = useCallback(
    async (token) => {
      localStorage.setItem('token', token);
      await loadMe();
    },
    [loadMe],
  );

  const signOut = useCallback(() => {
    localStorage.removeItem('token');
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, ready, isLoggedIn: Boolean(user), signIn, signOut }),
    [user, ready, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
