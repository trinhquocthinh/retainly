import { ChangeEvent, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';

import { Button } from '../../shared/Button/Button';
import { Field } from '../../shared/Field/Field';
import { ApiRequestError, postJson } from '../../shared/api';

import './CreateCardPage.css';

type FieldErrors = { front?: string; back?: string };

const FIELD_BY_CODE: Record<string, keyof FieldErrors> = {
  ERR_EMPTY_FRONT: 'front',
  ERR_EMPTY_BACK: 'back',
};

export const CreateCardPage = () => {
  const navigate = useNavigate();
  const [front, setFront] = useState('');
  const [back, setBack] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [banner, setBanner] = useState<string | null>(null);
  const [dangLuu, setDangLuu] = useState(false);
  const [vuaLuu, setVuaLuu] = useState(false);

  const luuDuoc = front.trim().length > 0 && back.trim().length > 0 && !dangLuu;

  function soanLai(datGiaTri: (value: string) => void) {
    return (event: ChangeEvent<HTMLTextAreaElement>) => {
      datGiaTri(event.target.value);
      setVuaLuu(false);
    };
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!luuDuoc) return;

    setDangLuu(true);
    setErrors({});
    setBanner(null);
    setVuaLuu(false);

    try {
      await postJson('/cards', { front, back });
      setFront('');
      setBack('');
      setBanner(null);
      setVuaLuu(true);
    } catch (error) {
      const field = error instanceof ApiRequestError ? FIELD_BY_CODE[error.code] : undefined;

      if (field) {
        setErrors({ [field]: (error as ApiRequestError).message });
      } else {
        setBanner(
          error instanceof ApiRequestError ? error.message : 'Không lưu được thẻ, thử lại sau',
        );
      }
    } finally {
      setDangLuu(false);
    }
  }

  return (
    <form className="create-card" onSubmit={handleSubmit} noValidate>
      <h1 className="text-h1 create-card__title">Thẻ mới</h1>

      {vuaLuu ? (
        <p className="create-card__status text-small" role="status">
          Đã lưu thẻ. Nhập tiếp thẻ nữa hoặc mở Thư viện thẻ.
        </p>
      ) : null}

      {banner ? (
        <p className="create-card__banner text-small" role="alert">
          {banner}
        </p>
      ) : null}

      <Field label="Mặt hỏi" error={errors.front}>
        {(props) => (
          <textarea
            {...props}
            rows={3}
            placeholder="Câu hỏi bạn muốn nhớ được…"
            maxLength={2000}
            value={front}
            onChange={soanLai(setFront)}
          />
        )}
      </Field>

      <Field label="Mặt trả lời" error={errors.back}>
        {(props) => (
          <textarea
            {...props}
            rows={4}
            placeholder="Câu trả lời ngắn gọn…"
            maxLength={2000}
            value={back}
            onChange={soanLai(setBack)}
          />
        )}
      </Field>

      <div className="create-card__actions">
        <Button onClick={() => navigate(-1)}>Huỷ</Button>
        <Button type="submit" variant="primary" disabled={!luuDuoc}>
          {dangLuu ? 'Đang lưu…' : 'Lưu thẻ'}
        </Button>
      </div>
    </form>
  );
};
