import { useEffect, useState, type ReactNode } from 'react';

import { IconCheck } from '@src/shared/ui/Icons/Icons';

import './Toast.css';

const AUTO_DISMISS_MS = 3200;

type ToastProps = {
  open: boolean;
  children: ReactNode;
};

/**
 * Thông báo nổi cho thao tác đã xong (Flat 2.0 level 2).
 * Tự ẩn sau 3.2s nhưng vẫn giữ role="status" để trình đọc màn hình đọc kịp.
 */
export function Toast({ open, children }: ToastProps) {
  const [visible, setVisible] = useState(open);

  useEffect(() => {
    setVisible(open);
    if (!open) return;

    const timer = setTimeout(() => setVisible(false), AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [open]);

  if (!visible) return null;

  return (
    <div className="toast" role="status">
      <span className="toast__icon">
        <IconCheck />
      </span>
      <span className="toast__body text-small">{children}</span>
    </div>
  );
}
