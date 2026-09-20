import './Logo.css';

type LogoProps = { size?: number };

/** Biểu trưng Retainly dùng chung trong ứng dụng và favicon. */
export function Logo({ size = 28 }: LogoProps) {
  return (
    <img
      className="brand-logo"
      src="/logo.png"
      width={size}
      height={size}
      alt=""
      aria-hidden="true"
      draggable={false}
    />
  );
}
