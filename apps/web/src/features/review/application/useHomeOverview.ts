import { useQuery } from '@tanstack/react-query';

import type { HomeOverview } from '../domain/home';

/**
 * Trang chủ và khối tiến độ ở sidebar cùng đọc một key nên chỉ tốn một lần gọi.
 * Màn ôn nằm ngoài shell, nên giữa phiên không có gì nạp lại số này; rời phiên
 * thì ReviewPage đánh dấu stale.
 */
export function useHomeOverview(fetchHomeOverview: () => Promise<HomeOverview>) {
  return useQuery({ queryKey: ['home', 'overview'], queryFn: fetchHomeOverview });
}
