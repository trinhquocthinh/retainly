import type { ChangeEvent, FormEvent } from 'react';

import { Button } from '@src/shared/ui/Button/Button';
import { Field } from '@src/shared/ui/Field/Field';

import './UrlBar.css';

type UrlBarProps = {
  url: string;
  canLoad: boolean;
  loading: boolean;
  error: string | null;
  onUrlChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onLoad: (event: FormEvent<HTMLFormElement>) => void;
};

export function UrlBar({ url, canLoad, loading, error, onUrlChange, onLoad }: UrlBarProps) {
  return (
    <form className="url-bar" onSubmit={onLoad} noValidate>
      <Field
        label="Liên kết bài viết"
        description="Dán liên kết bài viết công khai để chọn nội dung bạn muốn lưu."
        error={error ?? undefined}
      >
        {(props) => (
          <div className="url-bar__row">
            {/* type="text" chứ không phải "url": để lỗi định dạng do máy chủ trả
                về (ERR_INVALID_URL) hiện cùng một chỗ với mọi lỗi nạp khác. */}
            <input
              {...props}
              type="text"
              inputMode="url"
              placeholder="https://example.com/bai-viet"
              value={url}
              onChange={onUrlChange}
            />
            <Button type="submit" variant="primary" disabled={!canLoad}>
              {loading ? 'Đang mở…' : 'Mở bài viết'}
            </Button>
          </div>
        )}
      </Field>
    </form>
  );
}
