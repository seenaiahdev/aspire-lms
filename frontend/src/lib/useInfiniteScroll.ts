import { useEffect, useRef } from 'react';

/**
 * Shared infinite-scroll primitive used by every paginated list (recordings, assessments,
 * quizzes, projects, practice lab, and the milestones stage window).
 *
 * Attach the returned ref to a small sentinel element at the END of the list. When that
 * sentinel scrolls into view, `loadMore()` fires — but only while `hasMore` is true and a
 * load isn't already in flight (`loading`), so it can't spam requests.
 *
 * Usage:
 *   const sentinelRef = useInfiniteScroll({ hasMore, loading, onLoadMore: loadNextPage });
 *   ...
 *   {hasMore && <div ref={sentinelRef} />}
 */
export const PAGE_SIZE = 10;

interface Options {
  hasMore: boolean;
  loading: boolean;
  onLoadMore: () => void;
  /** Start fetching this many px before the sentinel is actually visible. */
  rootMargin?: string;
}

export function useInfiniteScroll<T extends HTMLElement = HTMLDivElement>({
  hasMore,
  loading,
  onLoadMore,
  rootMargin = '200px',
}: Options) {
  const sentinelRef = useRef<T | null>(null);
  // Keep the latest callback/flags without re-creating the observer each render.
  const cbRef = useRef(onLoadMore);
  cbRef.current = onLoadMore;
  const stateRef = useRef({ hasMore, loading });
  stateRef.current = { hasMore, loading };

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first?.isIntersecting && stateRef.current.hasMore && !stateRef.current.loading) {
          cbRef.current();
        }
      },
      { root: null, rootMargin, threshold: 0 }
    );

    observer.observe(node);
    return () => observer.disconnect();
    // Re-observe when the sentinel mounts/unmounts (hasMore toggles its presence).
  }, [rootMargin, hasMore]);

  return sentinelRef;
}
