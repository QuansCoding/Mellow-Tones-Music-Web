import { useEffect, useRef } from 'react';

// Unset in local development: the widget renders nothing, matching the API,
// which skips the check when it has no secret key.
const SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY;
const SCRIPT_SRC =
  'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

let scriptPromise = null;

/** Load Cloudflare's script once, however many widgets mount. */
function loadTurnstile() {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  scriptPromise ??= new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = SCRIPT_SRC;
    script.async = true;
    script.onload = () => resolve(window.turnstile);
    script.onerror = () => {
      scriptPromise = null;             // let a later mount try again
      reject(new Error('Turnstile failed to load'));
    };
    document.head.appendChild(script);
  });
  return scriptPromise;
}

/**
 * Cloudflare's human check. Calls onToken(token) once solved, and
 * onToken(null) when that token expires or the widget errors.
 *
 * A token can be used once. After each submit, remount the widget (change its
 * `key`) to get a new one.
 */
export default function Turnstile({ onToken }) {
  const box = useRef(null);
  const onTokenRef = useRef(onToken);

  useEffect(() => {
    onTokenRef.current = onToken;
  });

  useEffect(() => {
    if (!SITE_KEY) return undefined;
    let cancelled = false;
    let widgetId = null;

    loadTurnstile()
      .then((turnstile) => {
        if (cancelled || !box.current) return;
        widgetId = turnstile.render(box.current, {
          sitekey: SITE_KEY,
          theme: 'dark',
          callback: (token) => onTokenRef.current(token),
          'expired-callback': () => onTokenRef.current(null),
          'error-callback': () => onTokenRef.current(null),
        });
      })
      .catch(() => onTokenRef.current(null));

    return () => {
      cancelled = true;
      if (widgetId !== null) window.turnstile?.remove(widgetId);
    };
  }, []);

  if (!SITE_KEY) return null;
  return <div ref={box} className="turnstile" />;
}
