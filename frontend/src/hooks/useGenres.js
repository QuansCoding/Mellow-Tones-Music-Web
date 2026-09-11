import { useEffect, useState } from 'react';
import { fetchGenres } from '../api';

// The list is fixed server-side, so it is fetched once per page load and
// shared by every form and page that needs it.
let cached = null;

/** [{ id, label }] in display order; [] until loaded (or if it fails). */
export function useGenres() {
  const [genres, setGenres] = useState(cached ?? []);

  useEffect(() => {
    if (cached) return undefined;
    let cancelled = false;
    fetchGenres()
      .then(({ data }) => {
        cached = data;
        if (!cancelled) setGenres(data);
      })
      .catch(() => {
        // Untagged is always a valid choice, so a missing list only hides
        // the picker's options — it never blocks an upload.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return genres;
}

/** "lo-fi" -> "Lo-fi"; null when untagged or unknown. */
export function genreLabel(genres, id) {
  if (!id) return null;
  return genres.find((g) => g.id === id)?.label ?? null;
}
