import { useState, type ChangeEvent, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { useMutation } from '@tanstack/react-query';

import { Button } from '@src/shared/Button/Button';
import { Field } from '@src/shared/Field/Field';
import { ApiError, NetworkError, api } from '@src/shared/api';

import './CreateCardPage.css';

type CardField = 'front' | 'back';

const FIELD_BY_CODE: Record<string, CardField> = {
  ERR_EMPTY_FRONT: 'front',
  ERR_EMPTY_BACK: 'back',
};

/** Lỗi nghiệp vụ gắn được vào một ô nhập cụ thể thì gắn xuống đó. */
function fieldOf(error: unknown): CardField | undefined {
  return error instanceof ApiError ? FIELD_BY_CODE[error.code] : undefined;
}

/** Phần còn lại hiện thành banner chung phía trên form. */
function bannerOf(error: unknown): string | null {
  if (!error || fieldOf(error)) return null;
  if (error instanceof NetworkError) return 'Không lưu được thẻ, kiểm tra mạng rồi thử lại';
  return error instanceof Error ? error.message : 'Không lưu được thẻ, thử lại sau';
}

export function CreateCardPage() {
  const navigate = useNavigate();
  const [front, setFront] = useState('');
  const [back, setBack] = useState('');
  const [justSaved, setJustSaved] = useState(false);

  const createCard = useMutation({
    mutationFn: (input: { front: string; back: string }) => api.post('/cards', input),
    onSuccess: () => {
      setFront('');
      setBack('');
      setJustSaved(true);
    },
  });

  const canSave = front.trim().length > 0 && back.trim().length > 0 && !createCard.isPending;
  const failedField = fieldOf(createCard.error);
  const banner = bannerOf(createCard.error);

  function handleChange(setValue: (value: string) => void) {
    return (event: ChangeEvent<HTMLTextAreaElement>) => {
      setValue(event.target.value);
      setJustSaved(false);
    };
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSave) return;

    setJustSaved(false);
    createCard.mutate({ front, back });
  }

  return (
    <form className="create-card" onSubmit={handleSubmit} noValidate>
      <h1 className="text-h1 create-card__title">Thẻ mới</h1>

      {justSaved ? (
        <p className="create-card__status text-small" role="status">
          Đã lưu thẻ. Nhập tiếp thẻ nữa hoặc mở Thư viện thẻ.
        </p>
      ) : null}

      {banner ? (
        <p className="create-card__banner text-small" role="alert">
          {banner}
        </p>
      ) : null}

      <Field
        label="Mặt hỏi"
        error={failedField === 'front' ? (createCard.error as ApiError).message : undefined}
      >
        {(props) => (
          <textarea
            {...props}
            rows={3}
            placeholder="Câu hỏi bạn muốn nhớ được…"
            maxLength={2000}
            value={front}
            onChange={handleChange(setFront)}
          />
        )}
      </Field>

      <Field
        label="Mặt trả lời"
        error={failedField === 'back' ? (createCard.error as ApiError).message : undefined}
      >
        {(props) => (
          <textarea
            {...props}
            rows={4}
            placeholder="Câu trả lời ngắn gọn…"
            maxLength={2000}
            value={back}
            onChange={handleChange(setBack)}
          />
        )}
      </Field>

      <div className="create-card__actions">
        <Button onClick={() => navigate(-1)}>Huỷ</Button>
        <Button type="submit" variant="primary" disabled={!canSave}>
          {createCard.isPending ? 'Đang lưu…' : 'Lưu thẻ'}
        </Button>
      </div>
    </form>
  );
}
