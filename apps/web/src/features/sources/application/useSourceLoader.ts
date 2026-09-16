import { useState, type ChangeEvent, type FormEvent } from 'react';
import { useMutation } from '@tanstack/react-query';

import { ApiError, NetworkError, TimeoutError } from '@src/shared/api/client';

import type { ExtractedSource } from '../domain/extractedSource';

/** Cổng bóc tách bài viết. Hiện thực thật do page container tiêm vào. */
type ExtractSourcePort = (url: string) => Promise<ExtractedSource>;

const MESSAGE_BY_CODE: Record<string, string> = {
  ERR_INVALID_URL: 'Đường dẫn không hợp lệ, kiểm tra lại URL',
  ERR_FETCH_FAILED: 'Không tải được nội dung từ URL này',
  ERR_FETCH_TIMEOUT: 'Trang nguồn phản hồi quá lâu, thử lại sau',
};

/** Mọi lỗi nạp nguồn đều nằm ngay dưới ô URL — không có ô nào khác để gắn. */
function messageFor(error: unknown): string | null {
  if (!error) return null;
  if (error instanceof ApiError) return MESSAGE_BY_CODE[error.code] ?? error.message;
  if (error instanceof NetworkError) return 'Không kết nối được máy chủ, kiểm tra mạng rồi thử lại';
  if (error instanceof TimeoutError) return 'Máy chủ phản hồi quá lâu, thử lại sau';
  return 'Không nạp được bài viết, thử lại sau';
}

export function useSourceLoader(deps: { extractSource: ExtractSourcePort }) {
  const [url, setUrl] = useState('');
  const [source, setSource] = useState<ExtractedSource | null>(null);

  const mutation = useMutation({
    mutationFn: deps.extractSource,
    onSuccess: (extracted) => setSource(extracted),
  });

  return {
    url,
    source,
    loading: mutation.isPending,
    canLoad: url.trim().length > 0 && !mutation.isPending,
    error: messageFor(mutation.error),

    onUrlChange: (event: ChangeEvent<HTMLInputElement>) => setUrl(event.target.value),

    onLoad: (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const trimmed = url.trim();
      if (trimmed.length === 0 || mutation.isPending) return;

      // Bỏ nguồn cũ ngay khi bắt đầu nạp: để lại thì người dùng đang đọc bài A
      // mà thẻ lưu ra lại mang sourceId của bài B.
      setSource(null);
      mutation.mutate(trimmed);
    },
  };
}
