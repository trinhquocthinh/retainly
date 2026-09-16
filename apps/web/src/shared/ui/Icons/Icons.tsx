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
