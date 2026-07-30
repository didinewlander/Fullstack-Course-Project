import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

/**
 * Reads ?highlight=<id> from the URL, so a record reached from global search
 * or a notification can be scrolled to and briefly flagged.
 *
 * The flag clears itself after a few seconds - it marks an arrival, not a
 * persistent selection.
 */
export function useHighlight(clearAfterMs = 4000) {
  const { search } = useLocation();

  const requestedId = new URLSearchParams(search).get("highlight") ?? null;

  /*
   * Tracks which id has already been dismissed, rather than mirroring the URL
   * into state. Copying it with an effect would mean a setState on every
   * navigation (a cascading render), and it would also fight the timer below:
   * the effect would restore the id the timer had just cleared.
   */
  const [dismissedId, setDismissedId] = useState(null);

  const highlightId = requestedId === dismissedId ? null : requestedId;

  useEffect(() => {
    if (!highlightId) return undefined;

    // wait for the list to render before looking for the element
    const scrollTimer = setTimeout(() => {
      document
        .querySelector(`[data-highlight-id="${highlightId}"]`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 150);

    const clearTimer = setTimeout(
      () => setDismissedId(highlightId),
      clearAfterMs,
    );

    return () => {
      clearTimeout(scrollTimer);
      clearTimeout(clearTimer);
    };
  }, [highlightId, clearAfterMs]);

  return {
    highlightId,
    isHighlighted: (id) => Boolean(id) && id === highlightId,

    // spread onto the row/card so the scroll lookup can find it
    highlightProps: (id) => ({ "data-highlight-id": id }),
  };
}
