type IconProps = { size?: number };

const base = (size: number) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
  focusable: false,
});

export function IconToday({ size = 18 }: IconProps) {
  return (
    <svg {...base(size)}>
      <rect x="3" y="4" width="18" height="17" rx="3" />
      <path d="M3 9h18M8 2v4M16 2v4" />
      <path d="M8.5 14.5l2.5 2.5 4.5-4.5" />
    </svg>
  );
}

export function IconLibrary({ size = 18 }: IconProps) {
  return (
    <svg {...base(size)}>
      <rect x="3" y="7" width="14" height="14" rx="3" />
      <path d="M7 3h10a4 4 0 0 1 4 4v10" />
    </svg>
  );
}

export function IconNewCard({ size = 18 }: IconProps) {
  return (
    <svg {...base(size)}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function IconMenu({ size = 22 }: IconProps) {
  return (
    <svg {...base(size)}>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

export function IconClose({ size = 20 }: IconProps) {
  return (
    <svg {...base(size)}>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

export function IconUser({ size = 20 }: IconProps) {
  return (
    <svg {...base(size)}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4.5 20a7.5 7.5 0 0 1 15 0" />
    </svg>
  );
}

export function IconCheck({ size = 16 }: IconProps) {
  return (
    <svg {...base(size)}>
      <path d="M5 13l4 4L19 7" />
    </svg>
  );
}

export function IconFlip({ size = 16 }: IconProps) {
  return (
    <svg {...base(size)}>
      <path d="M4 4v5h5M20 20v-5h-5" />
      <path d="M19.4 9A8 8 0 0 0 5.6 6.6L4 9m0 6 1.6 2.4A8 8 0 0 0 19.4 15" />
    </svg>
  );
}

export function IconArrowLeft({ size = 16 }: IconProps) {
  return (
    <svg {...base(size)}>
      <path d="M10 19l-7-7 7-7M3 12h18" />
    </svg>
  );
}

export function IconArrowRight({ size = 16 }: IconProps) {
  return (
    <svg {...base(size)}>
      <path d="M14 5l7 7-7 7M21 12H3" />
    </svg>
  );
}

export function IconEdit({ size = 18 }: IconProps) {
  return (
    <svg {...base(size)}>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z" />
    </svg>
  );
}

export function IconDelete({ size = 18 }: IconProps) {
  return (
    <svg {...base(size)}>
      <path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 11v5M14 11v5" />
    </svg>
  );
}

/** Khiên — nút và màn chờ đăng nhập Authentik SSO. */
export function IconShield({ size = 18 }: IconProps) {
  return (
    <svg {...base(size)}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

export function IconEye({ size = 18 }: IconProps) {
  return (
    <svg {...base(size)}>
      <path d="M2.5 12C3.8 7.9 7.5 5 12 5s8.2 2.9 9.5 7c-1.3 4.1-5 7-9.5 7s-8.2-2.9-9.5-7z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export function IconEyeOff({ size = 18 }: IconProps) {
  return (
    <svg {...base(size)}>
      <path d="M10.6 5.1A10 10 0 0 1 12 5c4.5 0 8.2 2.9 9.5 7a10 10 0 0 1-2.2 3.6M6.6 6.6A10 10 0 0 0 2.5 12c1.3 4.1 5 7 9.5 7a10 10 0 0 0 5.4-1.6" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2M3 3l18 18" />
    </svg>
  );
}

/** Đường gấp khúc đi lên — điều hướng và tiêu đề màn Thống kê. */
export function IconChart({ size = 18 }: IconProps) {
  return (
    <svg {...base(size)}>
      <path d="M3 17l5-6 4 3.5L21 6" />
      <path d="M21 6h-5M21 6v5" />
    </svg>
  );
}

export function IconAlert({ size = 20 }: IconProps) {
  return (
    <svg {...base(size)}>
      <path d="M10.3 4 3.3 16c-.8 1.3.2 3 1.7 3h14c1.5 0 2.5-1.7 1.7-3l-7-12c-.8-1.3-2.7-1.3-3.4 0z" />
      <path d="M12 9v4M12 17h.01" />
    </svg>
  );
}

export function IconLightbulb({ size = 18 }: IconProps) {
  return (
    <svg {...base(size)}>
      <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" />
      <path d="M9 18h6M10 22h4" />
    </svg>
  );
}

export function IconChevronDown({ size = 16 }: IconProps) {
  return (
    <svg {...base(size)}>
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

export function IconRestart({ size = 16 }: IconProps) {
  return (
    <svg {...base(size)}>
      <path d="M4 12a8 8 0 1 0 2.4-5.7L4 8.6" />
      <path d="M4 4v4.6h4.6" />
    </svg>
  );
}

export function IconUndo({ size = 14 }: IconProps) {
  return (
    <svg {...base(size)}>
      <path d="M9 14 4 9l5-5" />
      <path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />
    </svg>
  );
}

export function IconClock({ size = 14 }: IconProps) {
  return (
    <svg {...base(size)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

export function IconSearch({ size = 18 }: IconProps) {
  return (
    <svg {...base(size)}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

export function IconGrid({ size = 18 }: IconProps) {
  return (
    <svg {...base(size)}>
      <rect x="4" y="4" width="6.5" height="6.5" rx="1" />
      <rect x="13.5" y="4" width="6.5" height="6.5" rx="1" />
      <rect x="4" y="13.5" width="6.5" height="6.5" rx="1" />
      <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1" />
    </svg>
  );
}

export function IconTable({ size = 18 }: IconProps) {
  return (
    <svg {...base(size)}>
      <rect x="3.5" y="4.5" width="17" height="15" rx="1.5" />
      <path d="M3.5 9.5h17M3.5 14.5h17M9 9.5v10" />
    </svg>
  );
}

/** Mũi tên đi lên khỏi khay — nút "Xuất báo cáo" ở màn Thống kê. */
export function IconExport({ size = 18 }: IconProps) {
  return (
    <svg {...base(size)}>
      <path d="M12 15V4M8 8l4-4 4 4" />
      <path d="M5 13v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5" />
    </svg>
  );
}
