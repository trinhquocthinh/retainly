import { useEffect, type FormEvent } from 'react';
import { useForm, useStore } from '@tanstack/react-form';

import { Button } from '@src/shared/ui/Button/Button';
import { Field } from '@src/shared/ui/Field/Field';

import type { AuthMode } from '../../domain/authAlert';
import {
  credentialsSchema,
  DISPLAY_NAME_MAX_LENGTH,
  type AuthFormValues,
} from '../../domain/credentialsSchema';
import type { Credentials } from '../../domain/session';
import { fieldBinding, visibleError } from '../formFields';
import { PasswordCriteria, PasswordInput } from '../PasswordFields/PasswordFields';

const EMPTY_VALUES: AuthFormValues = {
  displayName: '',
  email: '',
  password: '',
  confirmPassword: '',
  remember: false,
};

type CredentialsFormProps = {
  mode: AuthMode;
  submitting: boolean;
  onSubmit: (credentials: Credentials) => void;
  onForgotPassword: () => void;
};

export function CredentialsForm({
  mode,
  submitting,
  onSubmit,
  onForgotPassword,
}: CredentialsFormProps) {
  const registering = mode === 'register';

  const form = useForm({
    defaultValues: EMPTY_VALUES,
    // Kiểm tra mỗi lần gõ để lỗi tự biến mất khi sửa đúng; khi nào *hiện* lỗi
    // thì do `visibleError` quyết định. `confirmPassword` không bao giờ gửi đi.
    validators: { onChange: credentialsSchema(mode) },
    onSubmit: ({ value }) =>
      onSubmit({
        email: value.email.trim(),
        password: value.password,
        // Đăng ký luôn mở phiên trình duyệt, không gửi cờ vô nghĩa lên API.
        ...(registering ? { displayName: value.displayName.trim() } : { remember: value.remember }),
      }),
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

  return (
    <form className="login-form" onSubmit={handleSubmit} noValidate>
      {registering ? (
        <form.Field name="displayName">
          {(field) => (
            <div className="login-form__register-only">
              <Field label="Họ và tên" error={visibleError(field.state.meta, submitted)}>
                {(props) => (
                  <input
                    {...props}
                    {...fieldBinding(field)}
                    type="text"
                    autoComplete="name"
                    placeholder="Nguyễn Văn A"
                    maxLength={DISPLAY_NAME_MAX_LENGTH}
                  />
                )}
              </Field>
            </div>
          )}
        </form.Field>
      ) : null}

      <form.Field name="email">
        {(field) => (
          <Field label="Email" error={visibleError(field.state.meta, submitted)}>
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
              error={visibleError(field.state.meta, submitted, registering ? 'submit' : 'blur')}
              aside={
                registering ? undefined : (
                  <button
                    type="button"
                    className="login-form__forgot text-small"
                    onClick={onForgotPassword}
                  >
                    Quên mật khẩu?
                  </button>
                )
              }
            >
              {(props) => (
                <PasswordInput
                  {...props}
                  revealLabel="mật khẩu"
                  {...fieldBinding(field)}
                  autoComplete={registering ? 'new-password' : 'current-password'}
                />
              )}
            </Field>

            {registering ? (
              <PasswordCriteria
                password={field.state.value}
                className="login-form__register-only"
              />
            ) : null}
          </>
        )}
      </form.Field>

      {registering ? (
        <form.Field name="confirmPassword">
          {(field) => (
            <div className="login-form__register-only">
              <Field
                label="Nhập lại mật khẩu"
                error={visibleError(field.state.meta, submitted, 'typing')}
              >
                {(props) => (
                  <PasswordInput
                    {...props}
                    revealLabel="mật khẩu nhập lại"
                    {...fieldBinding(field)}
                    autoComplete="new-password"
                  />
                )}
              </Field>
            </div>
          )}
        </form.Field>
      ) : (
        <form.Field name="remember">
          {(field) => (
            <label className="login-form__remember text-small">
              <input
                type="checkbox"
                name={field.name}
                checked={field.state.value}
                onChange={(event) => field.handleChange(event.target.checked)}
              />
              Duy trì đăng nhập 30 ngày
            </label>
          )}
        </form.Field>
      )}

      <Button type="submit" variant="primary" disabled={submitting} aria-busy={submitting}>
        {submitting ? <span className="login-spinner" aria-hidden="true" /> : null}
        {registering ? 'Tạo tài khoản mới' : 'Đăng nhập'}
      </Button>
    </form>
  );
}
