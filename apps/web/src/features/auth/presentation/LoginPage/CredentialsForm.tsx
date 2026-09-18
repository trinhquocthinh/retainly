import { useEffect, useState, type FormEvent, type InputHTMLAttributes } from 'react';
import { useForm, useStore } from '@tanstack/react-form';

import { Button } from '@src/shared/ui/Button/Button';
import { Field } from '@src/shared/ui/Field/Field';
import { IconCheck, IconEye, IconEyeOff } from '@src/shared/ui/Icons/Icons';

import type { AuthMode } from '../../domain/authAlert';
import { credentialsSchema, type AuthFormValues } from '../../domain/credentialsSchema';
import {
  PASSWORD_RULES,
  passwordStrength,
  type PasswordStrength,
} from '../../domain/passwordRules';
import type { Credentials } from '../../domain/session';

const STRENGTH_LABEL: Record<PasswordStrength, string> = {
  weak: 'Yếu',
  medium: 'Trung bình',
  good: 'Khá mạnh',
  strong: 'Rất mạnh',
};

/** Số vạch (trên 4) được tô cho từng mức. */
const STRENGTH_LEVEL: Record<PasswordStrength, number> = {
  weak: 1,
  medium: 2,
  good: 3,
  strong: 4,
};

const EMPTY_VALUES: AuthFormValues = { email: '', password: '', confirmPassword: '' };

type FieldMeta = { isTouched: boolean; isBlurred: boolean; errors: unknown[] };

type CredentialsFormProps = {
  mode: AuthMode;
  submitting: boolean;
  onSubmit: (credentials: Credentials) => void;
};

export function CredentialsForm({ mode, submitting, onSubmit }: CredentialsFormProps) {
  const registering = mode === 'register';

  const form = useForm({
    defaultValues: EMPTY_VALUES,
    // Kiểm tra mỗi lần gõ để lỗi tự biến mất khi sửa đúng; khi nào *hiện* lỗi
    // thì do `visibleError` quyết định. `confirmPassword` không bao giờ gửi đi.
    validators: { onChange: credentialsSchema(mode) },
    onSubmit: ({ value }) => onSubmit({ email: value.email.trim(), password: value.password }),
  });

  const submitted = useStore(form.store, (state) => state.submissionAttempts > 0);

  // Đổi tab thì luật mật khẩu đổi theo: giữ chữ đã gõ, xoá lỗi của luật cũ.
  useEffect(() => {
    form.reset(form.state.values);
  }, [form, mode]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!submitting) void form.handleSubmit();
  };

  /**
   * Khi nào hiện lỗi của một ô — mặc định sau khi rời ô, đừng mắng người đang gõ:
   * - `typing`: ngay khi đã gõ (ô nhập lại mật khẩu — lệch là thấy liền);
   * - `submit`: chỉ khi bấm gửi (mật khẩu lúc đăng ký — các chip tiêu chuẩn đã
   *   cho biết còn thiếu gì, thêm dòng lỗi nữa là nói hai lần).
   */
  const visibleError = (meta: FieldMeta, when: 'blur' | 'typing' | 'submit' = 'blur') => {
    const show =
      submitted || (when === 'blur' && meta.isBlurred) || (when === 'typing' && meta.isTouched);
    return show ? firstMessage(meta.errors) : undefined;
  };

  return (
    <form className="login-form" onSubmit={handleSubmit} noValidate>
      <form.Field name="email">
        {(field) => (
          <Field label="Email" error={visibleError(field.state.meta)}>
            {(props) => (
              <input
                {...props}
                type="email"
                name={field.name}
                autoComplete="email"
                placeholder="ban@vidu.com"
                maxLength={254}
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(event) => field.handleChange(event.target.value)}
              />
            )}
          </Field>
        )}
      </form.Field>

      <form.Field name="password">
        {(field) => (
          <>
            <Field
              label="Mật khẩu"
              error={visibleError(field.state.meta, registering ? 'submit' : 'blur')}
            >
              {(props) => (
                <PasswordInput
                  {...props}
                  revealLabel="mật khẩu"
                  name={field.name}
                  autoComplete={registering ? 'new-password' : 'current-password'}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(event) => field.handleChange(event.target.value)}
                />
              )}
            </Field>

            {registering ? <PasswordCriteria password={field.state.value} /> : null}
          </>
        )}
      </form.Field>

      {registering ? (
        <form.Field name="confirmPassword">
          {(field) => (
            <div className="login-form__register-only">
              <Field label="Nhập lại mật khẩu" error={visibleError(field.state.meta, 'typing')}>
                {(props) => (
                  <PasswordInput
                    {...props}
                    revealLabel="mật khẩu nhập lại"
                    name={field.name}
                    autoComplete="new-password"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(event) => field.handleChange(event.target.value)}
                  />
                )}
              </Field>
            </div>
          )}
        </form.Field>
      ) : null}

      <Button type="submit" variant="primary" disabled={submitting} aria-busy={submitting}>
        {submitting ? <span className="login-spinner" aria-hidden="true" /> : null}
        {registering ? 'Tạo tài khoản mới' : 'Đăng nhập'}
      </Button>
    </form>
  );
}

/** Lỗi từ schema zod là issue `{ message }`; chỉ hiện cái đầu tiên cho gọn. */
function firstMessage(errors: unknown[]): string | undefined {
  const [first] = errors;
  if (typeof first === 'string') return first;
  if (first && typeof first === 'object' && 'message' in first) return String(first.message);
  return undefined;
}

type PasswordInputProps = InputHTMLAttributes<HTMLInputElement> & {
  /** Đuôi cho nhãn nút mắt: "Hiện mật khẩu", "Hiện mật khẩu nhập lại". */
  revealLabel: string;
};

/** Ô mật khẩu kèm nút ẩn/hiện; mỗi ô tự nhớ trạng thái hiện của riêng nó. */
function PasswordInput({ revealLabel, ...inputProps }: PasswordInputProps) {
  const [shown, setShown] = useState(false);

  return (
    <div className="login-form__password">
      <input {...inputProps} type={shown ? 'text' : 'password'} maxLength={1024} />
      <button
        type="button"
        className="login-form__reveal"
        aria-label={`${shown ? 'Ẩn' : 'Hiện'} ${revealLabel}`}
        onClick={() => setShown((value) => !value)}
      >
        {shown ? <IconEyeOff /> : <IconEye />}
      </button>
    </div>
  );
}

/** Thanh độ mạnh 4 vạch + 5 tiêu chuẩn; chưa gõ gì thì chưa đánh giá. */
function PasswordCriteria({ password }: { password: string }) {
  const strength = passwordStrength(password);

  return (
    <div className="password-meter login-form__register-only" data-strength={strength ?? undefined}>
      <p className="password-meter__caption text-caption">
        <span>Độ an toàn mật khẩu</span>
        <span className="password-meter__label">
          {strength ? STRENGTH_LABEL[strength] : 'Chưa nhập'}
        </span>
      </p>
      <div className="password-meter__bars" aria-hidden="true">
        {[1, 2, 3, 4].map((level) => (
          <span
            key={level}
            className="password-meter__bar"
            data-filled={strength !== null && level <= STRENGTH_LEVEL[strength]}
          />
        ))}
      </div>

      <p className="password-meter__heading text-caption-caps">Tiêu chuẩn mật khẩu an toàn:</p>
      <ul className="password-meter__rules" aria-label="Tiêu chuẩn mật khẩu an toàn">
        {PASSWORD_RULES.map((rule) => {
          const passed = rule.test(password);
          return (
            <li key={rule.id} className="password-rule text-caption" data-passed={passed}>
              <span className="password-rule__mark" aria-hidden="true">
                {passed ? <IconCheck size={10} /> : '•'}
              </span>
              {rule.label}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
