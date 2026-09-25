import type { ChangeEvent } from 'react';

/** Trạng thái một ô của TanStack Form mà hai form xác thực cần để quyết định hiện lỗi. */
export type FieldMeta = { isTouched: boolean; isBlurred: boolean; errors: unknown[] };

/**
 * Khi nào hiện lỗi của một ô — mặc định sau khi rời ô, đừng mắng người đang gõ:
 * - `typing`: ngay khi đã gõ (ô nhập lại mật khẩu — lệch là thấy liền);
 * - `submit`: chỉ khi bấm gửi (ô mật khẩu mới — các chip tiêu chuẩn đã cho biết
 *   còn thiếu gì, thêm dòng lỗi nữa là nói hai lần).
 * Đã bấm gửi (`submitted`) thì ô nào sai cũng hiện.
 */
export function visibleError(
  meta: FieldMeta,
  submitted: boolean,
  when: 'blur' | 'typing' | 'submit' = 'blur',
): string | undefined {
  const show =
    submitted || (when === 'blur' && meta.isBlurred) || (when === 'typing' && meta.isTouched);
  return show ? firstMessage(meta.errors) : undefined;
}

/** Lỗi từ schema zod là issue `{ message }`; chỉ hiện cái đầu tiên cho gọn. */
function firstMessage(errors: unknown[]): string | undefined {
  const [first] = errors;
  if (typeof first === 'string') return first;
  if (first && typeof first === 'object' && 'message' in first) return String(first.message);
  return undefined;
}

/** Phần của một ô TanStack Form cần để nối vào `<input>` chữ. */
type TextField = {
  name: string;
  state: { value: string };
  handleBlur: () => void;
  handleChange: (value: string) => void;
};

/** Nối ô của form vào input: tên, giá trị, rời ô, gõ phím. */
export function fieldBinding(field: TextField) {
  return {
    name: field.name,
    value: field.state.value,
    onBlur: field.handleBlur,
    onChange: (event: ChangeEvent<HTMLInputElement>) => field.handleChange(event.target.value),
  };
}
