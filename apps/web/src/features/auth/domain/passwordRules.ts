/**
 * SPEC-011 — bản sao phía web của `isStrongPassword` bên API
 * (`apps/api/src/features/auth/domain/local-credentials.ts`). Sửa luật thì sửa cả hai.
 * Unicode để chữ tiếng Việt có dấu vẫn được tính; đếm độ dài theo code point.
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

export type PasswordStrength = 'weak' | 'medium' | 'good' | 'strong';

export function isStrongPassword(password: string): boolean {
  return PASSWORD_RULES.every((rule) => rule.test(password));
}

/**
 * Chỉ báo cho thanh độ mạnh theo số điều kiện đạt: ≤ 2 yếu, 3 trung bình,
 * 4 khá mạnh, đủ 5 mới rất mạnh. Chưa gõ gì thì `null` — chưa có gì để đánh giá.
 */
export function passwordStrength(password: string): PasswordStrength | null {
  if (password.length === 0) return null;

  const passed = PASSWORD_RULES.filter((rule) => rule.test(password)).length;
  if (passed <= 2) return 'weak';
  if (passed === 3) return 'medium';
  return passed === 4 ? 'good' : 'strong';
}
