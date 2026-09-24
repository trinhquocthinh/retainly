import { useSearchParams } from 'react-router';

import {
  parseLibraryFilters,
  toSearchParams,
  type CardSort,
  type LibraryFilters,
} from '../domain/cardLibrary';

/**
 * Bộ lọc Thư viện sống trên URL: tải lại trang hay quay lại từ màn khác vẫn giữ
 * nguyên. Dùng `replace` để gõ tìm kiếm không đẻ ra một mục lịch sử mỗi lần.
 */
export function useLibraryFilters() {
  const [params, setParams] = useSearchParams();
  const filters = parseLibraryFilters(params);

  // Đọc từ `current` chứ không từ `filters` của lần render: lời gọi trễ (debounce)
  // không được ghi đè thay đổi xảy ra sau nó.
  function update(next: Partial<LibraryFilters>) {
    setParams((current) => toSearchParams({ ...parseLibraryFilters(current), page: 1, ...next }), {
      replace: true,
    });
  }

  return {
    filters,
    setQuery: (q: string) => update({ q }),
    setSort: (sort: CardSort) => update({ sort }),
    setTopic: (topic: string) => update({ topic }),
    goToPage: (page: number) => update({ page }),
    clearFilters: () => update({ q: '', topic: '' }),
  };
}
