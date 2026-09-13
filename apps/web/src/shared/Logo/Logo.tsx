type LogoProps = { size?: number };

/**
 * Mark của Retainly — chữ lồng R (design-criteria §11).
 * Vẽ bằng path chứ không phải <text>: favicon dùng đúng hình này, mà trình
 * duyệt vẽ favicon ngoài ngữ cảnh trang nên không thấy font Inter đã nhúng.
 * Toạ độ khớp bảng trong §11 — sửa ở đây mà quên favicon.svg là hai chỗ lệch nhau.
 */
export function Logo({ size = 28 }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      <rect width="32" height="32" rx="8" fill="var(--color-accent)" />
      <path
        d="M11 23 V9.5 H17 A3.75 3.75 0 0 1 17 17 H11 M14.75 17 L20.75 23"
        fill="none"
        stroke="#ffffff"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
