import { useState } from 'react';

import { DESKTOP_QUERY } from '@src/shared/constants/breakpoints';
import { useMediaQuery } from '@src/shared/hooks/useMediaQuery';

export type LibraryLayout = 'grid' | 'table';

const STORAGE_KEY = 'retainly:library-layout';

/** Ẩn danh hay trình duyệt chặn lưu trữ thì `localStorage` ném lỗi — coi như chưa chọn. */
function readPreference(): LibraryLayout {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === 'table' ? 'table' : 'grid';
  } catch {
    return 'grid';
  }
}

function savePreference(layout: LibraryLayout) {
  try {
    window.localStorage.setItem(STORAGE_KEY, layout);
  } catch {
    // Không lưu được thì chỉ mất lựa chọn ở lần mở sau; trang vẫn đổi kiểu xem.
  }
}

/**
 * Kiểu xem Thư viện. Bảng chỉ có trên desktop; mobile và tablet luôn là Lưới
 * nhưng vẫn giữ lựa chọn đã lưu để quay lại desktop thì đúng kiểu cũ.
 * Lưu theo thiết bị trong `localStorage` — là sở thích, không phải bộ lọc nên không lên URL.
 */
export function useLibraryLayout() {
  const desktop = useMediaQuery(DESKTOP_QUERY);
  const [preferred, setPreferred] = useState(readPreference);

  return {
    layout: desktop ? preferred : ('grid' as LibraryLayout),
    canChoose: desktop,
    choose: (layout: LibraryLayout) => {
      setPreferred(layout);
      savePreference(layout);
    },
  };
}
