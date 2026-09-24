import { useSyncExternalStore } from 'react';

/** Breakpoint desktop của shell: từ đây sidebar đứng yên (AppShell.css). */
export const DESKTOP_QUERY = '(min-width: 1024px)';

/**
 * Theo dõi một media query và render lại khi nó đổi (xoay máy, kéo cửa sổ).
 * Môi trường không có `matchMedia` (jsdom) coi như không khớp.
 */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const list = window.matchMedia?.(query);
      list?.addEventListener('change', onChange);
      return () => list?.removeEventListener('change', onChange);
    },
    () => window.matchMedia?.(query).matches ?? false,
  );
}
