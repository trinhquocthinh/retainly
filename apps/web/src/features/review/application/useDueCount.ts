import { useQuery } from '@tanstack/react-query';

import { fetchDueCards } from '@src/features/review/infrastructure/reviewApi';

/**
 * Số thẻ đến hạn cho badge điều hướng (GET /api/cards/due).
 * Dùng chung queryKey với useReviewSession nên không tốn thêm một vòng gọi mạng.
 * Hỏng thì trả 0 — badge biến mất chứ không chặn cả shell.
 */
export function useDueCount(): number {
  const { data } = useQuery({
    queryKey: ['cards', 'due'],
    queryFn: fetchDueCards,
    retry: false,
    staleTime: 60_000,
  });

  return data?.dueCount ?? 0;
}
