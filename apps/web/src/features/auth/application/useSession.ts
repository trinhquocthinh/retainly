import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';

import { ApiError } from '@src/shared/api/client';

import type { Session } from '../domain/session';

const SESSION_QUERY_KEY = ['session'] as const;

/** Cổng đọc phiên. Hiện thực thật do page container tiêm vào. */
type FetchSessionPort = () => Promise<Session>;

/** Phiên hiện tại. `data === null` nghĩa là chưa đăng nhập. */
export function useSession(deps: { fetchSession: FetchSessionPort }) {
  return useQuery({
    queryKey: SESSION_QUERY_KEY,
    // Chưa đăng nhập là trạng thái bình thường (`null`), không phải lỗi của query.
    queryFn: async (): Promise<Session | null> => {
      try {
        return await deps.fetchSession();
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) return null;
        throw error;
      }
    },
    staleTime: Infinity,
  });
}

/**
 * Hết phiên (đăng xuất hoặc API trả 401): dữ liệu của người vừa rời không được
 * sống sót trong cache; phiên ghi `null` để RequireAuth chuyển về /login.
 */
export function clearSession(queryClient: QueryClient): void {
  queryClient.removeQueries({ predicate: (query) => query.queryKey[0] !== SESSION_QUERY_KEY[0] });
  queryClient.setQueryData(SESSION_QUERY_KEY, null);
}

/**
 * Vừa đăng nhập: bỏ toàn bộ cache, kể cả phiên, để RequireAuth đọc lại phiên
 * từ máy chủ — API đăng nhập không trả tên hiển thị, `GET /api/session` thì có.
 */
export function forgetCachedSession(queryClient: QueryClient): void {
  queryClient.removeQueries();
}

/** Đăng xuất: dù máy chủ lỗi vẫn bỏ phiên phía client, người dùng đã muốn rời đi. */
export function useSignOut(deps: { signOut: () => Promise<void> }) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deps.signOut,
    onSettled: () => clearSession(queryClient),
  });
}
