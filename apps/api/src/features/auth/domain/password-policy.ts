/**
 * SPEC-011 — luật mật khẩu mạnh, nguồn duy nhất cho cả API lẫn web. Web import
 * thẳng file này qua alias `@retainly/password-policy` (xem `apps/web/vite.config.ts`),
 * nên file phải thuần TypeScript: không import gì, không dùng API riêng của Node.
 *
 * Unicode để chữ tiếng Việt có dấu vẫn được tính; độ dài đếm theo code point
 * (emoji hay ký tự ngoài BMP tính là 1, không phải 2).
 */
export const PASSWORD_RULES = [
  { id: 'length', label: 'Ít nhất 8 ký tự', test: (password: string) => [...password].length >= 8 },
  { id: 'upper', label: 'Chữ hoa', test: (password: string) => /\p{Lu}/u.test(password) },
  { id: 'lower', label: 'Chữ thường', test: (password: string) => /\p{Ll}/u.test(password) },
  { id: 'digit', label: 'Số', test: (password: string) => /\p{N}/u.test(password) },
  {
    id: 'symbol',
    label: 'Ký hiệu (@$!%*#?&)',
    test: (password: string) => /[^\p{L}\p{N}\s]/u.test(password),
  },
] as const;

export function isStrongPassword(password: string): boolean {
  return PASSWORD_RULES.every((rule) => rule.test(password));
}
