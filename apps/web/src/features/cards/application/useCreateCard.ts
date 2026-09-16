import { useState, type ChangeEvent, type FormEvent } from 'react';
import { useMutation } from '@tanstack/react-query';

import { ApiError, NetworkError } from '@src/shared/api/client';

import {
  fieldForErrorCode,
  isDraftComplete,
  type CardDraft,
  type CardField,
} from '../domain/cardDraft';

/** Cổng lưu thẻ. Hiện thực thật do page container tiêm vào. */
type CreateCardPort = (card: CardDraft & { sourceId?: string }) => Promise<unknown>;

const EMPTY_DRAFT: CardDraft = { front: '', back: '' };

/** Lỗi gắn được vào một ô nhập thì gắn xuống đó, phần còn lại thành banner. */
function bannerFor(error: unknown): string | null {
  if (!error) return null;
  if (error instanceof ApiError && fieldForErrorCode(error.code)) return null;
  if (error instanceof NetworkError) return 'Không lưu được thẻ, kiểm tra mạng rồi thử lại';
  return error instanceof Error ? error.message : 'Không lưu được thẻ, thử lại sau';
}

export function useCreateCard(deps: { createCard: CreateCardPort; sourceId?: string }) {
  const [draft, setDraft] = useState<CardDraft>(EMPTY_DRAFT);
  const [justSaved, setJustSaved] = useState(false);

  const mutation = useMutation({
    mutationFn: deps.createCard,
    // Chỉ xoá hai mặt thẻ. Nguồn do page giữ nên vẫn còn đó: một bài viết đọc
    // một lần, rút được nhiều thẻ mà không phải nạp lại.
    onSuccess: () => {
      setDraft(EMPTY_DRAFT);
      setJustSaved(true);
    },
  });

  const failedField =
    mutation.error instanceof ApiError ? fieldForErrorCode(mutation.error.code) : undefined;

  function setField(field: CardField, value: string) {
    setDraft((current) => ({ ...current, [field]: value }));
    setJustSaved(false);
  }

  return {
    draft,
    canSave: isDraftComplete(draft) && !mutation.isPending,
    saving: mutation.isPending,
    justSaved,
    banner: bannerFor(mutation.error),

    errorOf: (field: CardField) =>
      failedField === field ? (mutation.error as ApiError).message : undefined,
    setField,
    onChange: (field: CardField) => (event: ChangeEvent<HTMLTextAreaElement>) =>
      setField(field, event.target.value),

    onSubmit: (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!isDraftComplete(draft) || mutation.isPending) return;

      setJustSaved(false);
      mutation.mutate(deps.sourceId ? { ...draft, sourceId: deps.sourceId } : draft);
    },
  };
}
