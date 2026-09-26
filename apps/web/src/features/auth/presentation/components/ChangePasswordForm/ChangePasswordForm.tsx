import type { FormEvent } from 'react';
import { useForm, useStore } from '@tanstack/react-form';

import { Button } from '@src/shared/ui/Button/Button';
import { Field } from '@src/shared/ui/Field/Field';
import { Toast } from '@src/shared/ui/Toast/Toast';

import { useChangePassword } from '../../../application/useChangePassword';
import {
  changePasswordSchema,
  isWrongCurrentPassword,
  WRONG_CURRENT_PASSWORD_MESSAGE,
  type ChangePasswordValues,
} from '../../../domain/changePasswordSchema';
import { changePassword as changePasswordRequest } from '../../../infrastructure/authApi';
import { fieldBinding, visibleError } from '../../../../../shared/utils/formFields';
import { PasswordCriteria, PasswordInput } from '../PasswordFields/PasswordFields';

import './ChangePasswordForm.css';

const EMPTY_VALUES: ChangePasswordValues = {
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
};

/** BR-027 — đổi mật khẩu tài khoản nội bộ; xong thì các thiết bị khác bị đăng xuất. */
export function ChangePasswordForm() {
  const change = useChangePassword({ changePassword: changePasswordRequest });
  const wrongCurrent = isWrongCurrentPassword(change.error);

  const form = useForm({
    defaultValues: EMPTY_VALUES,
    validators: { onChange: changePasswordSchema },
    onSubmit: ({ value, formApi }) =>
      change.mutate(
        { currentPassword: value.currentPassword, newPassword: value.newPassword },
        // Xong thì xoá sạch form: mật khẩu không nên nằm lại trên màn hình.
        { onSuccess: () => formApi.reset() },
      ),
  });

  // `reset()` đưa số lần gửi về 0, nên form trống sau khi đổi xong không hiện lỗi.
  const submitted = useStore(form.store, (state) => state.submissionAttempts > 0);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!change.isPending) void form.handleSubmit();
  };

  return (
    <form className="account-form" onSubmit={handleSubmit} noValidate>
      {change.isError && !wrongCurrent ? (
        <p className="feedback-danger text-small" role="alert">
          {change.error.message}
        </p>
      ) : null}

      <form.Field name="currentPassword">
        {(field) => (
          <Field
            label="Mật khẩu hiện tại"
            error={
              visibleError(field.state.meta, submitted) ??
              (wrongCurrent ? WRONG_CURRENT_PASSWORD_MESSAGE : undefined)
            }
          >
            {(props) => (
              <PasswordInput
                {...props}
                revealLabel="mật khẩu hiện tại"
                {...fieldBinding(field)}
                autoComplete="current-password"
                onChange={(event) => {
                  // Gõ lại mật khẩu hiện tại thì lời báo sai của lần trước hết đúng.
                  if (wrongCurrent) change.reset();
                  field.handleChange(event.target.value);
                }}
              />
            )}
          </Field>
        )}
      </form.Field>

      <form.Field name="newPassword">
        {(field) => (
          <>
            <Field label="Mật khẩu mới" error={visibleError(field.state.meta, submitted, 'submit')}>
              {(props) => (
                <PasswordInput
                  {...props}
                  revealLabel="mật khẩu mới"
                  {...fieldBinding(field)}
                  autoComplete="new-password"
                />
              )}
            </Field>
            <PasswordCriteria password={field.state.value} />
          </>
        )}
      </form.Field>

      <form.Field name="confirmPassword">
        {(field) => (
          <Field
            label="Nhập lại mật khẩu mới"
            error={visibleError(field.state.meta, submitted, 'typing')}
          >
            {(props) => (
              <PasswordInput
                {...props}
                revealLabel="mật khẩu mới nhập lại"
                {...fieldBinding(field)}
                autoComplete="new-password"
              />
            )}
          </Field>
        )}
      </form.Field>

      <div className="account-form__actions">
        <Button
          type="submit"
          variant="primary"
          disabled={change.isPending}
          aria-busy={change.isPending}
        >
          {change.isPending ? 'Đang đổi mật khẩu…' : 'Đổi mật khẩu'}
        </Button>
      </div>

      <Toast open={change.isSuccess}>Đã đổi mật khẩu. Các thiết bị khác đã được đăng xuất.</Toast>
    </form>
  );
}
