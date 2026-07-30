import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Runs an async API call and tracks loading / data / error, with a reload().
 *
 * Most pages here are "fetch a list, act on a row, refetch" - this keeps that
 * out of every component. Domain data shared across pages (products, orders)
 * lives in Redux instead; this is for the per-page views.
 *
 * `deps` behaves like useEffect's: the fetch re-runs when any value changes.
 * Pass the primitives you filter on, not a fresh object literal. They are
 * joined into a single key rather than spread into a dependency array, because
 * a dynamic-length array is not something React (or its linter) can check.
 */
export function useApiData(fetcher, deps = []) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Guards two races: a resolved fetch writing to an unmounted component, and
  // a slow earlier request overwriting the result of a newer one.
  const isMountedRef = useRef(true);
  const requestIdRef = useRef(0);
  const fetcherRef = useRef(fetcher);

  // Updated in an effect rather than during render. The fetcher is a new
  // closure every render and only the most recent one should ever be called.
  useEffect(() => {
    fetcherRef.current = fetcher;
  }, [fetcher]);

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const load = useCallback(async () => {
    const requestId = ++requestIdRef.current;

    setIsLoading(true);
    setError(null);

    try {
      const result = await fetcherRef.current();

      if (isMountedRef.current && requestId === requestIdRef.current) {
        setData(result);
      }
    } catch (caughtError) {
      if (isMountedRef.current && requestId === requestIdRef.current) {
        setError(caughtError);
        setData(null);
      }
    } finally {
      if (isMountedRef.current && requestId === requestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  const depsKey = JSON.stringify(deps);

  useEffect(() => {
    let isCurrent = true;

    /*
     * Kicked off in a microtask rather than called straight from the effect
     * body. load() flips isLoading synchronously, and a synchronous setState
     * inside an effect triggers a cascading render (react-hooks/
     * set-state-in-effect). A microtask defers it by one tick - imperceptible,
     * and the loading state still shows while the request is in flight.
     */
    Promise.resolve().then(() => {
      if (isCurrent) {
        load();
      }
    });

    return () => {
      isCurrent = false;
    };
    // depsKey stands in for the caller's deps; `load` itself is stable
  }, [load, depsKey]);

  return { data, error, isLoading, reload: load, setData };
}

/**
 * Wraps a mutation (approve, cancel, restock...) so a page gets a pending flag
 * and a surfaced error without repeating try/catch everywhere.
 */
export function useApiAction() {
  const [pendingId, setPendingId] = useState(null);
  const [error, setError] = useState(null);

  const run = useCallback(async (id, action) => {
    setPendingId(id);
    setError(null);

    try {
      await action();
      return true;
    } catch (caughtError) {
      setError(caughtError);
      return false;
    } finally {
      setPendingId(null);
    }
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return {
    run,
    pendingId,
    error,
    clearError,
    isPending: (id) => pendingId === id,
  };
}
