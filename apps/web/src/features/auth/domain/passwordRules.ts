import { PASSWORD_RULES } from '@retainly/password-policy';

export type PasswordStrength = 'weak' | 'medium' | 'good' | 'strong';

/**
 * Chỉ báo cho thanh độ mạnh theo số điều kiện SPEC-011 đạt: ≤ 2 yếu, 3 trung bình,
 * 4 khá mạnh, đủ 5 mới rất mạnh. Chưa gõ gì thì `null` — chưa có gì để đánh giá.
 * Bản thân luật nằm ở `@retainly/password-policy`, dùng chung với API.
 */
export function passwordStrength(password: string): PasswordStrength | null {
  if (password.length === 0) return null;

  const passed = PASSWORD_RULES.filter((rule) => rule.test(password)).length;
  if (passed <= 2) return 'weak';
  if (passed === 3) return 'medium';
  return passed === 4 ? 'good' : 'strong';
}
