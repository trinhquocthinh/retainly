import { useQuery } from '@tanstack/react-query';

import type { LibraryStats } from '../domain/libraryStats';

/**
 * Key nằm dưới ['cards', 'library'] nên sửa/xoá thẻ làm mới danh sách thì số
 * liệu cũng được làm mới theo, không phải invalidate riêng.
 */
export function useLibraryStats(fetchLibraryStats: () => Promise<LibraryStats>) {
  const { data, isPending, isError } = useQuery({
    queryKey: ['cards', 'library', 'stats'],
    queryFn: fetchLibraryStats,
    retry: false,
  });

  return { stats: data, loading: isPending, failed: isError };
}
