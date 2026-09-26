import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router';

import { parseRange, type Stats, type StatsRange } from '../domain/stats';

type StatsPorts = {
  fetchStats: (range: StatsRange) => Promise<Stats>;
};

/**
 * Khoảng thời gian sống trên URL như bộ lọc Thư viện: tải lại trang vẫn giữ.
 * Đổi khoảng thì giữ số liệu cũ trên màn tới khi số mới về, tránh nháy khung tải.
 */
export function useStats(deps: StatsPorts) {
  const [params, setParams] = useSearchParams();
  const range = parseRange(params.get('range'));

  const query = useQuery({
    queryKey: ['stats', range],
    queryFn: () => deps.fetchStats(range),
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });

  function setRange(next: StatsRange) {
    setParams(next === '30d' ? {} : { range: next }, { replace: true });
  }

  return {
    range,
    setRange,
    stats: query.data,
    loading: query.isPending,
    failed: query.isError,
    switching: query.isPlaceholderData,
    reload: () => void query.refetch(),
  };
}
