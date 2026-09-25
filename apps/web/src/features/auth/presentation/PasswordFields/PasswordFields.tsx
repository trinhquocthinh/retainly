import { useState, type InputHTMLAttributes } from 'react';
import { PASSWORD_RULES } from '@retainly/password-policy';

import { IconCheck, IconEye, IconEyeOff } from '@src/shared/ui/Icons/Icons';

import { passwordStrength, type PasswordStrength } from '../../domain/passwordRules';

import './PasswordFields.css';

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

type PasswordInputProps = InputHTMLAttributes<HTMLInputElement> & {
  /** Đuôi cho nhãn nút mắt: "Hiện mật khẩu", "Hiện mật khẩu nhập lại". */
  revealLabel: string;
};

/** Ô mật khẩu kèm nút ẩn/hiện; mỗi ô tự nhớ trạng thái hiện của riêng nó. */
export function PasswordInput({ revealLabel, ...inputProps }: PasswordInputProps) {
  const [shown, setShown] = useState(false);

  return (
    <div className="password-input">
      <input {...inputProps} type={shown ? 'text' : 'password'} maxLength={1024} />
      <button
        type="button"
        className="password-input__reveal"
        aria-label={`${shown ? 'Ẩn' : 'Hiện'} ${revealLabel}`}
        onClick={() => setShown((value) => !value)}
      >
        {shown ? <IconEyeOff /> : <IconEye />}
      </button>
    </div>
  );
}

type PasswordCriteriaProps = {
  password: string;
  /** Lớp thêm của nơi dùng, vd hiệu ứng hiện ra ở tab Đăng ký. */
  className?: string;
};

/** Thanh độ mạnh 4 vạch + 5 tiêu chuẩn SPEC-011; chưa gõ gì thì chưa đánh giá. */
export function PasswordCriteria({ password, className }: PasswordCriteriaProps) {
  const strength = passwordStrength(password);

  return (
    <div
      className={className ? `password-meter ${className}` : 'password-meter'}
      data-strength={strength ?? undefined}
    >
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
