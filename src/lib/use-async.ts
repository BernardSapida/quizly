import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";

/**
 * Minimal replacement for react-query, which this app no longer needs — every read
 * is a local SQLite call, so there is no cache, no staleness, and no network state
 * to model. Refetches whenever the screen regains focus, which is what makes edits
 * show up after navigating back.
 *
 * `fn` must be memoised by the caller (useCallback) — it is the dependency.
 */
export function useAsync<T>(fn: () => Promise<T>): {
  data: T | null;
  loading: boolean;
  refetch: () => void;
} {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const result = await fn();
    setData(result);
    setLoading(false);
  }, [fn]);

  // Fires on mount and on every refocus, so a separate mount effect is redundant.
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  return { data, loading, refetch: load };
}
