import { useEffect, type RefObject } from 'react';

/** Bôi đen trên mobile vướng menu hệ thống, nên chỉ bật từ breakpoint desktop. */
function isDesktop(): boolean {
  return window.matchMedia?.('(min-width: 1024px)').matches ?? true;
}

/**
 * Bôi đen một đoạn trong panel nguồn thì đổ thẳng vào mặt trả lời.
 * Không memo hoá `onSelect`: hiệu ứng gắn lại mỗi lần render là chủ ý, vì
 * callback cần đọc được nội dung ô trả lời ở hiện tại chứ không phải bản cũ.
 */
export function useSelectionToAnswer(
  containerRef: RefObject<HTMLElement | null>,
  onSelect: (text: string) => void,
): void {
  useEffect(() => {
    if (!isDesktop()) return;

    function onMouseUp() {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed) return;

      const container = containerRef.current;
      if (!container || !selection.anchorNode || !container.contains(selection.anchorNode)) return;

      const text = selection.toString().trim();
      if (text.length > 0) onSelect(text);
    }

    document.addEventListener('mouseup', onMouseUp);
    return () => document.removeEventListener('mouseup', onMouseUp);
  });
}
